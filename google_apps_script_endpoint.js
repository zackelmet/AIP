/**
 * Apps Script Report Job Endpoint (WebApp)
 *
 * Required Script Properties:
 * - TEMPLATE_ID
 * - FOLDER_ID
 * - GEMINI_API_KEY
 * - JOB_SIGNING_SECRET
 * - FINALIZE_URL (webapp endpoint that stores files in GCS + signs URLs)
 * - FINALIZE_BEARER_TOKEN (shared secret with webapp finalize endpoint)
 *
 * Optional Script Property:
 * - ALLOWED_REQUESTER_EMAILS (comma-separated) for extra allowlist checks.
 */

const MIMETYPE_DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_(
        { status: "error", message: "Missing request body" },
        400,
      );
    }

    const rawData = e.postData.contents;
    const envelope = JSON.parse(rawData);

    validateEnvelope_(envelope);

    const config = getConfig_();
    verifyRequester_(envelope.meta, config);
    verifySignature_(envelope.job, envelope.meta, config);

    PropertiesService.getScriptProperties().setProperty(
      "LAST_SUBMISSION",
      rawData,
    );

    const reportResult = buildReportArtifacts_(envelope.job, config);
    const finalizeResult = uploadArtifactsToWebapp_(
      envelope.job,
      reportResult,
      config,
    );

    return jsonResponse_({
      status: "success",
      reportId: finalizeResult.reportId || envelope.job.jobId,
      fileName: finalizeResult.fileName || reportResult.fileName,
      driveDocUrl: reportResult.driveDocUrl,
      pdfSignedUrl: finalizeResult.pdfSignedUrl,
      pdfSignedUrlExpiresAt: finalizeResult.pdfSignedUrlExpiresAt,
      docxSignedUrl: finalizeResult.docxSignedUrl,
      docxSignedUrlExpiresAt: finalizeResult.docxSignedUrlExpiresAt,
    });
  } catch (err) {
    return jsonResponse_(
      {
        status: "error",
        message: err && err.message ? err.message : String(err),
      },
      500,
    );
  }
}

function validateEnvelope_(envelope) {
  if (!envelope || typeof envelope !== "object") {
    throw new Error("Invalid payload envelope");
  }
  if (!envelope.job || typeof envelope.job !== "object") {
    throw new Error("Missing job object");
  }
  if (!envelope.meta || typeof envelope.meta !== "object") {
    throw new Error("Missing meta object");
  }
  if (
    !Array.isArray(envelope.job.findings) ||
    envelope.job.findings.length === 0
  ) {
    throw new Error("findings must be a non-empty array");
  }
}

function getConfig_() {
  const props = PropertiesService.getScriptProperties();
  const config = {
    templateId: props.getProperty("TEMPLATE_ID"),
    folderId: props.getProperty("FOLDER_ID"),
    geminiApiKey: props.getProperty("GEMINI_API_KEY"),
    signingSecret: props.getProperty("JOB_SIGNING_SECRET"),
    finalizeUrl: props.getProperty("FINALIZE_URL"),
    finalizeBearerToken: props.getProperty("FINALIZE_BEARER_TOKEN"),
    allowedRequesterEmails: (
      props.getProperty("ALLOWED_REQUESTER_EMAILS") || ""
    )
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  };

  const missing = [];
  if (!config.templateId) missing.push("TEMPLATE_ID");
  if (!config.folderId) missing.push("FOLDER_ID");
  if (!config.geminiApiKey) missing.push("GEMINI_API_KEY");
  if (!config.signingSecret) missing.push("JOB_SIGNING_SECRET");
  if (!config.finalizeUrl) missing.push("FINALIZE_URL");
  if (!config.finalizeBearerToken) missing.push("FINALIZE_BEARER_TOKEN");
  if (missing.length > 0) {
    throw new Error("Missing script properties: " + missing.join(", "));
  }

  return config;
}

function verifyRequester_(meta, config) {
  const requesterEmail = (meta.requestedByEmail || "").toLowerCase().trim();
  if (config.allowedRequesterEmails.length === 0) {
    return;
  }

  if (!requesterEmail) {
    throw new Error(
      "requestedByEmail is required when ALLOWED_REQUESTER_EMAILS is configured",
    );
  }
  if (config.allowedRequesterEmails.indexOf(requesterEmail) === -1) {
    throw new Error("Requester not in ALLOWED_REQUESTER_EMAILS allowlist");
  }
}

function verifySignature_(job, meta, config) {
  const timestamp = Number(meta.timestamp);
  if (!timestamp || Number.isNaN(timestamp)) {
    throw new Error("meta.timestamp is invalid");
  }

  const now = Date.now();
  const maxSkewMs = 5 * 60 * 1000;
  if (Math.abs(now - timestamp) > maxSkewMs) {
    throw new Error("Request timestamp outside allowed window");
  }

  const signature = String(meta.signature || "")
    .trim()
    .toLowerCase();
  if (!signature) {
    throw new Error("meta.signature is required");
  }

  const signingInput = String(timestamp) + "." + JSON.stringify(job);
  const computedBytes = Utilities.computeHmacSha256Signature(
    signingInput,
    config.signingSecret,
  );
  const computedHex = bytesToHex_(computedBytes).toLowerCase();

  if (computedHex !== signature) {
    throw new Error("Invalid job signature");
  }
}

function buildReportArtifacts_(job, config) {
  const folder = DriveApp.getFolderById(config.folderId);
  const reportName = `${job.clientName || "Example Client"} - ${job.projectTitle || "Pentest Report"} - ${new Date().toISOString()}`;
  const copy = DriveApp.getFileById(config.templateId).makeCopy(
    reportName,
    folder,
  );
  const doc = DocumentApp.openById(copy.getId());
  const body = doc.getBody();

  const generatedSummary =
    job.executiveSummary ||
    callGeminiAI_(
      (job.findings || [])
        .map(function (f) {
          return `${f.title} (Impact: ${f.impact})`;
        })
        .join("; "),
      config.geminiApiKey,
    );

  applyPlaceholderValues_(body, {
    report_type: job.reportType || "external",
    client_name: job.clientName || "Example - Client Name",
    project_title: job.projectTitle || "Example - Project Title",
    target: job.target || "Example - Target",
    completed_date: job.completedDate || "Example - Completed Date",
    tester: job.tester || "Example - Tester",
    version: job.version || "1.0",
    notes: job.notes || "Example - Notes",
    executive_summary: generatedSummary || "Example - Executive Summary",
    purpose: job.purpose || "Example - Purpose",
    detailed_analysis: job.detailedAnalysis || "Example - Detailed Analysis",
    scope_targets:
      (job.scopeTargets || []).join("\n") || "Example - Scope Target",
  });

  injectFindingsAtMarker_(body, job.findings || []);

  doc.saveAndClose();

  const driveFile = DriveApp.getFileById(copy.getId());
  const pdfBlob = driveFile.getAs(MimeType.PDF);
  const docxBlob = driveFile.getAs(MIMETYPE_DOCX);

  const fileNameBase = sanitizeFilePart_(reportName);
  return {
    driveDocUrl: doc.getUrl(),
    fileName: `${fileNameBase}.pdf`,
    pdfBlob: pdfBlob.setName(`${fileNameBase}.pdf`),
    docxBlob: docxBlob.setName(`${fileNameBase}.docx`),
  };
}

function applyPlaceholderValues_(body, values) {
  Object.keys(values).forEach(function (key) {
    const safe = String(values[key] || "");
    body.replaceText(`\\{\\{${key}\\}\\}`, safe);
  });
}

function injectFindingsAtMarker_(body, findings) {
  const startMarker = "{{FINDINGS_START}}";
  const endMarker = "{{FINDINGS_END}}";

  const indices = findMarkerParagraphIndices_(body, startMarker, endMarker);

  if (!indices) {
    appendFindings_(body, findings);
    return;
  }

  const startIndex = indices.start;
  let endIndex = indices.end;

  for (let i = endIndex - 1; i > startIndex; i--) {
    body.removeChild(body.getChild(i));
  }
  endIndex = startIndex + 1;

  let insertAt = endIndex;
  findings.forEach(function (finding, idx) {
    insertAt = insertFinding_(body, insertAt, finding, idx + 1);
  });

  clearMarkerText_(body, startIndex);
  clearMarkerText_(body, insertAt);
}

function findMarkerParagraphIndices_(body, startMarker, endMarker) {
  let start = -1;
  let end = -1;

  for (let i = 0; i < body.getNumChildren(); i++) {
    const child = body.getChild(i);
    if (child.getType() !== DocumentApp.ElementType.PARAGRAPH) continue;
    const text = child.asParagraph().getText();
    if (start === -1 && text.indexOf(startMarker) !== -1) start = i;
    if (text.indexOf(endMarker) !== -1) end = i;
  }

  if (start === -1 || end === -1 || end <= start) return null;
  return { start: start, end: end };
}

function clearMarkerText_(body, index) {
  const child = body.getChild(index);
  if (child.getType() === DocumentApp.ElementType.PARAGRAPH) {
    child.asParagraph().setText("");
  }
}

function appendFindings_(body, findings) {
  findings.forEach(function (finding, idx) {
    appendFindingBlock_(body, finding, idx + 1);
  });
}

function insertFinding_(body, index, finding, number) {
  body.insertHorizontalRule(index++);

  const header = body.insertParagraph(
    index++,
    `Finding #${number}: ${finding.title || "Untitled Finding"}`,
  );
  header.setHeading(DocumentApp.ParagraphHeading.HEADING2);

  const severity = finding.cvssValue || "Unknown";
  const score = finding.cvss != null ? String(finding.cvss) : "N/A";
  const scorePara = body.insertParagraph(
    index++,
    `Severity: ${severity} (${score})`,
  );
  scorePara.setBold(true);
  scorePara.setForegroundColor(getCVSSColor_(score));

  index = insertSection_(body, index, "Description", finding.description);
  index = insertSection_(body, index, "Impact", finding.impact);
  index = insertSection_(body, index, "Proof of Concept", finding.poc);
  index = insertSection_(body, index, "Remediation", finding.remediation);

  return index;
}

function appendFindingBlock_(body, finding, number) {
  body.appendHorizontalRule();
  const header = body.appendParagraph(
    `Finding #${number}: ${finding.title || "Untitled Finding"}`,
  );
  header.setHeading(DocumentApp.ParagraphHeading.HEADING2);

  const severity = finding.cvssValue || "Unknown";
  const score = finding.cvss != null ? String(finding.cvss) : "N/A";
  const scorePara = body.appendParagraph(`Severity: ${severity} (${score})`);
  scorePara.setBold(true);
  scorePara.setForegroundColor(getCVSSColor_(score));

  addSection_(body, "Description", finding.description);
  addSection_(body, "Impact", finding.impact);
  addSection_(body, "Proof of Concept", finding.poc);
  addSection_(body, "Remediation", finding.remediation);
}

function addSection_(body, title, content) {
  body.appendParagraph(title).setBold(true).setUnderline(true);
  body.appendParagraph(content || "N/A").setSpacingAfter(10);
}

function insertSection_(body, index, title, content) {
  body.insertParagraph(index++, title).setBold(true).setUnderline(true);
  body.insertParagraph(index++, content || "N/A").setSpacingAfter(10);
  return index;
}

function getCVSSColor_(score) {
  const val = parseFloat(score);
  if (val >= 9.0) return "#cc0000";
  if (val >= 7.0) return "#e69138";
  if (val >= 4.0) return "#f1c232";
  return "#6aa84f";
}

function callGeminiAI_(context, geminiApiKey) {
  if (!context) return "Summary generation unavailable.";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
  const prompt =
    "Write a professional, one-paragraph executive summary for a pentest report. " +
    'Do NOT include "This report contains..." or "In conclusion...". ' +
    "Focus strictly on overall risk based on these findings: " +
    context;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  try {
    const resp = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(resp.getContentText());
    return (
      (json &&
        json.candidates &&
        json.candidates[0] &&
        json.candidates[0].content &&
        json.candidates[0].content.parts &&
        json.candidates[0].content.parts[0] &&
        json.candidates[0].content.parts[0].text) ||
      "Summary generation unavailable."
    );
  } catch (e) {
    return "Summary generation unavailable.";
  }
}

function uploadArtifactsToWebapp_(job, reportResult, config) {
  const payload = {
    jobId: job.jobId || Utilities.getUuid(),
    requestedByUid: job.requestedByUid || "",
    requestedByEmail: job.requestedByEmail || "",
    clientName: job.clientName || "Example - Client Name",
    projectTitle: job.projectTitle || "Example - Project Title",
    driveDocUrl: reportResult.driveDocUrl,
    pdfFileName: reportResult.pdfBlob.getName(),
    docxFileName: reportResult.docxBlob.getName(),
    pdfBase64: Utilities.base64Encode(reportResult.pdfBlob.getBytes()),
    docxBase64: Utilities.base64Encode(reportResult.docxBlob.getBytes()),
  };

  const response = UrlFetchApp.fetch(config.finalizeUrl, {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + config.finalizeBearerToken,
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  const statusCode = response.getResponseCode();
  const text = response.getContentText();
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error("Finalize endpoint returned non-JSON response");
  }

  if (
    statusCode < 200 ||
    statusCode >= 300 ||
    !data ||
    data.status !== "success"
  ) {
    throw new Error("Finalize endpoint failed: " + text);
  }

  return data;
}

function bytesToHex_(bytes) {
  return bytes
    .map(function (b) {
      const v = (b < 0 ? b + 256 : b).toString(16);
      return v.length === 1 ? "0" + v : v;
    })
    .join("");
}

function sanitizeFilePart_(value) {
  return String(value || "report")
    .replace(/[^a-zA-Z0-9-_ ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 120);
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function rerunLastSubmission() {
  const lastSubmission =
    PropertiesService.getScriptProperties().getProperty("LAST_SUBMISSION");
  if (!lastSubmission) return Logger.log("No data found.");
  const envelope = JSON.parse(lastSubmission);
  const config = getConfig_();
  const reportResult = buildReportArtifacts_(envelope.job, config);
  const finalizeResult = uploadArtifactsToWebapp_(
    envelope.job,
    reportResult,
    config,
  );
  Logger.log("Report Regenerated: " + JSON.stringify(finalizeResult));
}

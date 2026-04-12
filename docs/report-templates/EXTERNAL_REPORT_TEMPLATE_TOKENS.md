# External Report DOCX Template Tokens

Template file: `docs/report-templates/external-report-template.docx`

## Front Matter Tokens
- `{{REPORT_TITLE}}`
- `{{TARGET}}`
- `{{COMPLETION_DATE}}`
- `{{REPORT_VERSION}}`
- `{{REPORT_DATE}}`
- `{{TESTER_NAME}}`
- `{{REPORT_NOTES}}`
- `{{EXECUTIVE_SUMMARY_PARAGRAPH_1}}`
- `{{EXECUTIVE_SUMMARY_PARAGRAPH_2}}`
- `{{PURPOSE_STATEMENT}}`
- `{{ASSESSMENT_INTEGRITY_STATEMENT}}`
- `{{SCOPE_TARGET}}`

## Findings Loop Tokens
The template includes one repeatable finding block wrapped by:
- `{{#findings}}` (combined on the heading line as `{{#findings}}{{index}}-`)
- `{{/findings}}`

Inside the finding block:
- `{{index}}`
- `{{title}}`
- `{{description}}`
- `{{severity}}`
- `{{cvss_vector}}`
- `{{impact}}`
- `{{poc}}`
- `{{remediation}}`

## Notes
- Keep all Appendix pages manually editable in DOCX; they are static and intentionally not tokenized.
- The findings loop is designed so front pages and appendix remain hand-editable while the middle findings are dynamic.
- If your render pipeline requires a different syntax (e.g., `[[token]]`), update token strings in the template and keep this contract file in sync.

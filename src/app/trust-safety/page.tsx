import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShieldHalved,
  faFileContract,
  faUserShield,
  faGavel,
  faBan,
  faCircleInfo,
  faLock,
  faReceipt,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";

export const metadata = {
  title: "Trust + Safety Center — Affordable Pentesting",
  description:
    "Our commitment to ethical penetration testing, data security, and responsible disclosure.",
  metadataBase: new URL("https://ai.affordablepentesting.com"),
  openGraph: {
    title: "Trust + Safety Center — Affordable Pentesting",
    description:
      "Our commitment to ethical penetration testing, data security, and responsible disclosure.",
    url: "https://ai.affordablepentesting.com/trust-safety",
    siteName: "Affordable Pentesting",
  },
};

const sections = [
  {
    icon: faFileContract,
    title: "Terms of Service",
    anchor: "terms",
    content: [
      "By purchasing and using Affordable Pentesting services you agree to these terms in full. If you do not agree, do not use the platform.",
      "Affordable Pentesting provides automated and AI-assisted penetration testing services. All testing is performed exclusively on targets for which you have provided explicit written authorisation. You must be at least 18 years of age and legally capable of entering into a binding contract to use this platform.",
      "We reserve the right to modify these terms at any time. Continued use of the platform after changes are posted constitutes acceptance. We will make reasonable efforts to notify users of material changes via the email address on file.",
      "These terms are governed by the laws of the United States. Any disputes arising from or relating to these terms shall be resolved through binding arbitration in the applicable jurisdiction.",
      "We reserve the right to suspend or terminate accounts that violate these terms without notice or refund.",
    ],
  },
  {
    icon: faReceipt,
    title: "Refund & Credits Policy",
    anchor: "refunds",
    content: [
      "All purchases of pentest credits are final and non-refundable. We do not issue refunds under any circumstances once payment has been processed, including but not limited to: unused credits, partially completed scans, dissatisfaction with results, or account termination due to policy violations.",
      "Credits are non-transferable and may only be used by the account holder who purchased them. Credits have no cash value and cannot be exchanged, sold, or gifted to another user.",
      "In the rare event that a technical failure on our end prevents a scan from completing or delivering a report, we will issue a replacement credit to your account at our sole discretion. This is not a guarantee and is evaluated on a case-by-case basis by our support team.",
      "If you believe you have experienced a platform-side failure, contact support within 7 days of the affected scan with full details. We will investigate and respond within 3 business days.",
      "By completing a purchase you explicitly acknowledge and accept this no-refund policy.",
    ],
  },
  {
    icon: faLock,
    title: "Report Storage & Data Security",
    anchor: "data-security",
    content: [
      "All pentest reports and scan data are stored in Google Cloud Storage (GCS) with server-side encryption at rest using AES-256. Reports are never stored on local infrastructure or unencrypted media.",
      "Report files are stored in private GCS buckets. Access is enforced through Google Cloud IAM policies — only your authenticated account and our backend service accounts have permission to read or write your report files. No report is ever publicly accessible via a shareable URL without an expiring signed link generated at your request.",
      "Signed download links for reports are time-limited (typically 15 minutes) and single-use in intent. They are generated server-side only after verifying your authenticated session via Firebase ID token. This ensures that even if a link were intercepted, it would expire before it could be meaningfully reused.",
      "Pentest metadata (target, scan status, timestamps, finding summaries) is stored in Google Cloud Firestore. Firestore security rules restrict read and write access strictly to the account that owns the record. Our admin team can access records for support and compliance purposes only.",
      "We do not share your scan targets, findings, or reports with any third parties, advertisers, or data brokers. Your security data is yours.",
      "We retain your pentest data for as long as your account is active. Upon account deletion, your Firestore records and GCS report files are permanently deleted within 30 days. Stripe payment records are retained separately per their own data retention policies and applicable financial regulations.",
    ],
  },
  {
    icon: faUserShield,
    title: "Privacy Policy",
    anchor: "privacy",
    content: [
      "We collect only the data necessary to provide our services: your email address, payment information (processed by Stripe — we never see or store card details), and the scan targets you submit.",
      "We use Firebase Authentication for identity management. Your password is never stored by us — Firebase handles credential hashing and storage according to Google's security standards.",
      "We use session cookies (httpOnly, Secure, SameSite=Strict) to maintain your authenticated session. These cookies contain a short-lived Firebase ID token and are never accessible to client-side JavaScript, mitigating XSS-based session theft.",
      "We do not use third-party advertising trackers, analytics pixels, or sell your personal information to any party. We use basic server-side logging for error monitoring and abuse prevention only.",
      "You may request deletion of your account and all associated data at any time by submitting a support ticket via our Support page. We will process your request within 30 days.",
    ],
  },
  {
    icon: faGavel,
    title: "Authorised Use Policy",
    anchor: "authorised-use",
    content: [
      "You must have explicit, written authorisation from the system owner before submitting any target for testing. Verbal permission is not sufficient and will not be accepted as a legal defence.",
      "By submitting a target you are legally attesting that you own the system or hold current, documented permission from the owner to conduct penetration testing on it. This attestation is binding.",
      "Submitting targets you do not own or have not obtained authorisation for is a criminal offence in most jurisdictions — including but not limited to the Computer Fraud and Abuse Act (CFAA) in the United States, the Computer Misuse Act in the United Kingdom, and equivalent statutes worldwide. Penalties can include significant fines and imprisonment.",
      "Affordable Pentesting operates entirely in good faith on your attestation. We conduct no independent verification of target ownership. Any misuse of this platform — including testing targets without authorisation — is solely your legal and financial responsibility. We will cooperate fully with law enforcement investigations involving misuse of our platform.",
      "We reserve the right to report suspected unauthorised use to relevant authorities and to provide all available records including IP addresses, account details, and scan logs.",
    ],
  },
  {
    icon: faBan,
    title: "Prohibited Targets",
    anchor: "prohibited",
    content: [
      "The following target types are strictly prohibited regardless of claimed ownership or authorisation: critical national infrastructure (power grids, water treatment systems, financial clearing networks, telecommunications backbone), government and military systems at any level, healthcare systems containing protected patient data (ePHI), and any system you have been explicitly or legally prohibited from testing.",
      "Shared hosting environments where testing activity could degrade service or expose data belonging to other tenants are also prohibited. If you are unsure whether your target qualifies, contact support before submitting.",
      "Any target that, upon investigation, appears to belong to an organisation other than the submitting account holder will result in immediate job cancellation, account suspension, and potential law enforcement referral.",
      "We reserve the right to cancel any in-progress or queued job and suspend any account at any time if a submitted target is determined or suspected to be prohibited. No refund or credit replacement will be issued in such cases.",
    ],
  },
  {
    icon: faTriangleExclamation,
    title: "Liability & Disclaimer",
    anchor: "liability",
    content: [
      "Affordable Pentesting provides tooling and reporting services on an \"as-is\" basis. We make no warranty, express or implied, that our automated or AI-assisted pentests will identify every vulnerability present in a target system. No penetration test — automated or manual — guarantees complete security.",
      "We are not responsible for any damage, data loss, service disruption, regulatory penalty, or legal consequence arising from the use or misuse of our platform, including but not limited to: actions taken based on scan results, failure to remediate identified vulnerabilities, and testing performed without proper authorisation.",
      "Our AI-assisted scanning tools may generate false positives or miss vulnerabilities. Results should be reviewed by a qualified security professional before being used as the sole basis for compliance attestations, architectural decisions, or public disclosures.",
      "By using this platform you agree that Affordable Pentesting's total aggregate liability to you for any claim arising out of or related to these services shall not exceed the amount you paid for the specific pentest credit(s) directly involved in the claim.",
      "We are not liable for any indirect, incidental, special, consequential, or punitive damages, including loss of revenue, loss of data, or reputational harm, even if we have been advised of the possibility of such damages.",
      "You agree to indemnify and hold harmless Affordable Pentesting, its operators, affiliates, and personnel from any claim, demand, or damage — including reasonable legal fees — arising out of your use of the platform, your violation of these terms, or your infringement of any third-party rights.",
    ],
  },
  {
    icon: faCircleInfo,
    title: "Responsible Disclosure",
    anchor: "disclosure",
    content: [
      "If you discover a security vulnerability in the Affordable Pentesting platform itself, please disclose it responsibly by submitting a support ticket via our Support page — select the \"Other\" topic and include as much detail as possible including steps to reproduce, affected endpoints, and potential impact.",
      "We commit to acknowledging your report within 48 hours, triaging and investigating within 5 business days, and working to remediate confirmed issues within 30 days of confirmation.",
      "We will not pursue legal action against researchers who discover and disclose vulnerabilities in good faith, provided they do not access, exfiltrate, or modify data beyond what is necessary to demonstrate the vulnerability, and that they contact us privately before any public disclosure.",
      "We do not currently operate a formal bug bounty programme, but we will publicly credit researchers (with their consent) who assist us in improving platform security.",
    ],
  },
];

export default function TrustSafetyPage() {
  return (
    <main className="min-h-screen bg-[#0a141f] text-white">
      {/* Hero */}
      <div className="border-b border-[#34D399]/30 bg-gradient-to-b from-[#0a141f] to-[#071210]">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#34D399]/20 border border-[#34D399]/40 mb-6">
            <FontAwesomeIcon icon={faShieldHalved} className="text-3xl text-[#34D399]" />
          </div>
          <h1
            className="text-4xl lg:text-5xl font-light text-white mb-4"
            style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
          >
            Trust + Safety Center
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Our policies governing the ethical, legal, and responsible use of Affordable Pentesting services.
          </p>
          <p className="mt-3 text-sm text-gray-500">Last updated: March 2026</p>
        </div>
      </div>

      {/* Quick nav */}
      <div className="border-b border-white/10 bg-[#0a141f]/80 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-3 flex gap-4 overflow-x-auto text-sm">
          {sections.map((s) => (
            <a
              key={s.anchor}
              href={`#${s.anchor}`}
              className="whitespace-nowrap text-gray-400 hover:text-[#34D399] transition-colors"
            >
              {s.title}
            </a>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-16 space-y-12">
        {sections.map((section) => (
          <section key={section.anchor} id={section.anchor} className="scroll-mt-16">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-lg bg-[#34D399]/15 border border-[#34D399]/30">
                <FontAwesomeIcon icon={section.icon} className="text-[#34D399] text-lg" />
              </div>
              <h2 className="text-2xl font-normal text-white">{section.title}</h2>
            </div>
            <div className="bg-white/5 border border-[#34D399]/10 rounded-xl p-6 space-y-4">
              {section.content.map((para, i) => (
                <p key={i} className="text-gray-300 leading-relaxed text-sm">
                  {para}
                </p>
              ))}
            </div>
          </section>
        ))}

        {/* Contact CTA */}
        <div className="bg-[#34D399]/10 border border-[#34D399]/30 rounded-xl p-8 text-center">
          <h3 className="text-xl font-normal text-white mb-2">Questions about our policies?</h3>
          <p className="text-gray-400 mb-5 text-sm">
            Our team is happy to answer any questions about how we handle your data or operate our services.
          </p>
          <Link
            href="/support"
            className="inline-block px-6 py-3 bg-[#34D399] hover:bg-[#10b981] text-[#041018] font-normal rounded-lg transition-colors"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </main>
  );
}




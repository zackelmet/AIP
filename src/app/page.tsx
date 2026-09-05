import Link from "next/link";
import Image from "next/image";
import PricingWidget from "./PricingWidget";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a141f] text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-svh flex flex-col justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-[#34D399]/10 via-transparent to-transparent" />
        <div className="max-w-7xl w-full mx-auto px-6 py-20 lg:py-32 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="text-5xl lg:text-7xl font-light tracking-tight">
              <span className="block text-white">Penetration Testing</span>
              <span className="block text-[#34D399] mt-2">Made Simple</span>
            </h1>
            <p className="text-xl lg:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              AI-powered penetration testing. Flexible, transparent pricing
              &mdash; no subscriptions, no surprises.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/app/new-pentest"
                className="inline-block px-10 py-5 bg-[#34D399] hover:bg-[#10b981] text-[#041018] font-normal rounded-lg transition-colors text-xl"
              >
                Launch an AI Pentest Now
              </Link>
              <Link
                href="/LaunchAPentest"
                className="inline-block px-10 py-5 bg-white/5 hover:bg-white/10 text-white font-normal rounded-lg border border-white/20 transition-colors text-xl"
              >
                Get a Manual Pentest
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Environments Section */}
      <section className="py-20 bg-[#060e16]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-[#34D399] text-xs font-normal uppercase tracking-widest mb-3">
              What We Test
            </p>
            <h2 className="text-4xl lg:text-5xl font-light mb-4">
              Pentest <span className="text-[#34D399]">Environments</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              AI-powered and manual testing across every attack surface.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: "External",
                img: "/environments/external.webp",
                desc: "Simulate real-world attacks on your public-facing systems, IPs, and infrastructure.",
                href: "https://www.affordablepentesting.com/environments/external-pentesting",
              },
              {
                name: "Web Application",
                img: "/environments/web-app.webp",
                desc: "Find XSS, SQL injection, authentication gaps, and logic flaws in your web apps.",
                href: "https://www.affordablepentesting.com/environments/web-app-pentesting",
              },
              {
                name: "M365 Tenants",
                img: "/environments/m365.svg",
                desc: "Assess Entra ID, conditional access, OAuth consent, and exposure across your Microsoft 365 tenant.",
                href: "https://www.affordablepentesting.com/environments/m365-pentesting",
              },
              {
                name: "Cloud",
                img: "/environments/cloud.webp",
                desc: "Identify IAM misconfigs, exposed buckets, and vulnerabilities across AWS, Azure & GCP.",
                href: "https://www.affordablepentesting.com/environments/cloud-pentesting",
              },
              {
                name: "WiFi",
                img: "/environments/wifi.webp",
                desc: "Detect weak encryption, rogue access points, and unauthorized wireless access.",
                href: "https://www.affordablepentesting.com/environments/wifi-pentesting",
              },
              {
                name: "API",
                img: "/environments/api.webp",
                desc: "Uncover broken auth, BOLA, data exposure, and injection flaws across your APIs.",
                href: "https://www.affordablepentesting.com/environments/api-pentesting",
              },
            ].map((env) => (
              <a
                key={env.name}
                href={env.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white/5 border border-white/10 hover:border-[#34D399]/50 rounded-xl p-6 flex flex-col items-center text-center transition-all hover:bg-white/[0.07] hover:shadow-lg hover:shadow-[#34D399]/5"
              >
                <div className="w-20 h-20 mb-5 flex items-center justify-center">
                  <Image
                    src={env.img}
                    alt={env.name}
                    width={80}
                    height={80}
                    className="object-contain w-full h-full drop-shadow-[0_0_8px_rgba(52,211,153,0.25)] group-hover:drop-shadow-[0_0_14px_rgba(52,211,153,0.45)] transition-all"
                  />
                </div>
                <h3 className="text-white font-normal text-lg mb-2">
                  {env.name}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {env.desc}
                </p>
                <span className="mt-4 text-[#34D399] text-xs font-normal uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn more →
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance Ready Reports Section */}
      <section className="py-14 bg-gradient-to-r from-[#34D399]/20 to-[#34D399]/5">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 space-y-6">
              <p className="text-[#34D399] text-xs font-normal uppercase tracking-widest">
                Audit-Ready Output
              </p>
              <h2 className="text-4xl lg:text-5xl font-light text-white">
                Compliance Ready Reports
              </h2>
              <p className="text-gray-300 text-lg leading-relaxed">
                Every pentest generates a structured report designed to satisfy
                auditors — not just developers. Findings are mapped to common
                control frameworks so your evidence package is ready the moment
                the pentest completes.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  "Supports SOC 2 Type I & II audits as penetration testing evidence",
                  "Maps findings to HIPAA, PCI DSS, ISO 27001, and NIST controls",
                  "Upload the PDF to your auditor portal or trust centre in one step",
                  "Includes risk ratings, remediation guidance, and retest notes",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 p-4 rounded-xl border border-[#34D399]/25 bg-[#34D399]/5 hover:border-[#34D399]/50 hover:bg-[#34D399]/10 transition-colors"
                  >
                    <span className="text-[#34D399] text-lg font-bold mt-0.5 flex-shrink-0">
                      ✓
                    </span>
                    <span className="text-gray-200 text-base leading-snug">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-shrink-0 grid grid-cols-2 lg:grid-cols-1 gap-3 text-sm">
              {[
                { label: "SOC 2", delay: "0ms" },
                { label: "HIPAA", delay: "120ms" },
                { label: "PCI DSS", delay: "240ms" },
                { label: "ISO 27001", delay: "360ms" },
                { label: "NIST", delay: "480ms" },
              ].map(({ label, delay }) => (
                <div
                  key={label}
                  className="relative overflow-hidden px-5 py-2.5 rounded-lg border border-[#34D399]/30 text-[#34D399] text-center font-normal tracking-wide"
                  style={{ animationDelay: delay }}
                >
                  {/* shimmer sweep */}
                  <span
                    className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_2.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-[#34D399]/15 to-transparent"
                    style={{ animationDelay: delay }}
                  />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

{/* Sample Report Section */}
      <section id="sample-report" className="py-20 bg-[#060e16] scroll-mt-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-[#34D399] text-xs font-normal uppercase tracking-widest mb-3">
              See What You Get
            </p>
            <h2 className="text-4xl lg:text-5xl font-light mb-4">
              Sample <span className="text-[#34D399]">Pentest Report</span>
            </h2>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Every engagement delivers a structured, audit-ready report like
              the one below — packed with findings, risk ratings, and
              remediation guidance.
            </p>
          </div>

          {/* PDF Viewer */}
          <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-black/40 mb-8">
            <iframe
              src="/templates/AIP Sample Report - WebApp Pentest.docx.pdf"
              className="w-full"
              style={{ height: "780px" }}
              title="AIP Sample Pentest Report"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/templates/AIP Sample Report - WebApp Pentest.docx.pdf"
              download="AIP Sample Pentest Report.pdf"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#34D399] hover:bg-[#10b981] text-[#041018] font-normal rounded-lg transition-colors text-base"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
                />
              </svg>
              Download Sample Report
            </a>
            <a
              href="/templates/AIP Sample Report - WebApp Pentest.docx.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-normal rounded-lg border border-white/20 transition-colors text-base"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              Open in New Tab
            </a>
          </div>
        </div>
      </section>

      <PricingWidget currentUser={null} />

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-[#34D399]/20 to-[#34D399]/5">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl lg:text-5xl font-light mb-6">
            Ready to Secure Your Systems?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Get started with AI-powered penetration testing. Purchase credits
            and run your first test in minutes.
          </p>
          <Link
            href="/app/new-pentest"
            className="inline-block px-10 py-5 bg-[#34D399] hover:bg-[#10b981] text-[#041018] font-normal rounded-lg transition-colors text-xl"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* Affordable Pentesting.com Section */}
      <section className="py-24 bg-[#060e16] border-t border-[#34D399]/20">
        <div className="max-w-6xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-14">
            <p className="text-[#34D399] text-sm font-normal uppercase tracking-widest mb-3">
              Powered by
            </p>
            <a
              href="https://www.affordablepentesting.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 hover:opacity-80 transition mb-6"
            >
              <Image
                src="/affordablepentestinglogo.svg"
                alt="Affordable Pentesting"
                width={36}
                height={36}
                className="h-9 w-9"
              />
              <span
                className="text-white font-light text-3xl tracking-wide"
                style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
              >
                Affordable Pentesting
              </span>
            </a>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Human-led penetration testing for SOC 2, HIPAA, PCI DSS, ISO
              27001, and NIST — at prices built for startups, SMBs, and growing
              companies.
            </p>
          </div>

          {/* Service pillars */}
          <div className="grid sm:grid-cols-3 gap-5 mb-14">
            {[
              {
                label: "Manual Pentesting",
                desc: "OSCP-certified hackers simulate real-world attacks — external, internal, web app, and cloud. Audit-ready reports for SOC 2, HIPAA, PCI DSS, and more.",
              },
              {
                label: "AI-Powered Pentesting",
                desc: "Fast, automated assessments that go beyond a vulnerability scan. Results delivered within a day, no scheduling required.",
              },
              {
                label: "Compliance & Risk Coverage",
                desc: "Every engagement maps findings to SOC 2, HIPAA, PCI DSS, ISO 27001, NIST, and GDPR controls — ready for your auditor.",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-white/5 border border-white/10 hover:border-[#34D399]/40 rounded-xl p-6 transition-colors"
              >
                <h3 className="text-white font-normal text-base mb-2">
                  {item.label}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Why AP */}
          <div className="grid sm:grid-cols-4 gap-5 mb-14">
            {[
              {
                title: "Certified Ethical Hackers",
                desc: "OSCP, CEH, and CISSP certified experts — not automated scanners.",
              },
              {
                title: "Enterprise Quality, SMB Pricing",
                desc: "The most affordable pentests on the market, with zero sacrifice on quality.",
              },
              {
                title: "Fast Turnaround",
                desc: "Pentests start within days. No long lead times, no hidden fees.",
              },
              {
                title: "Clear, Actionable Reports",
                desc: "Jargon-free findings with step-by-step remediation guidance.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4">
                <span className="text-[#34D399] font-normal text-2xl leading-none mt-0.5">
                  ✓
                </span>
                <div>
                  <h3 className="text-white font-normal mb-1">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://www.affordablepentesting.com/get-a-quote"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-[#34D399] hover:bg-[#10b981] text-[#041018] font-normal rounded-lg transition-colors"
            >
              Get a Pentest Quote
            </a>
            <a
              href="https://www.affordablepentesting.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-normal rounded-lg border border-white/20 transition-colors"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

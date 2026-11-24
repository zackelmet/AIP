/** @type {import('next').NextConfig} */
import createMDX from "@next/mdx";

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self' https://checkout.stripe.com https://formspree.io",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://analytics.ahrefs.com https://js.stripe.com https://www.google-analytics.com https://www.googleadservices.com https://googleads.g.doubleclick.net`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: http://localhost:*" : ""} https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firebasestorage.googleapis.com https://storage.googleapis.com https://www.google-analytics.com https://region1.google-analytics.com https://analytics.google.com https://analytics.ahrefs.com https://api.stripe.com https://formspree.io https://hook.us2.make.com https://www.google.com https://*.doubleclick.net https://googleads.g.doubleclick.net`,
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
  "media-src 'self' https: blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
  "report-uri /api/security/csp-report",
].join("; ");

const nextConfig = {
  images: {
    // Avoid Next's image-optimizer endpoint (multiple 2026 RCE/SSRF advisories).
    unoptimized: true,
    formats: ["image/webp", "image/avif"],
    remotePatterns: [{ hostname: "images.ctfassets.net" }],
  },
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  skipTrailingSlashRedirect: true,
  experimental: {
    // Allow up to 20 MB request bodies (needed for PDF/DOCX report uploads)
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: csp,
          },
        ],
      },
    ];
  },
};

export default withMDX(nextConfig);

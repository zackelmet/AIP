/** @type {import('next').NextConfig} */
import createMDX from "@next/mdx";

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

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
            key: "Content-Security-Policy-Report-Only",
            value:
              "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'self';",
          },
        ],
      },
    ];
  },
};

export default withMDX(nextConfig);

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
};

export default withMDX(nextConfig);

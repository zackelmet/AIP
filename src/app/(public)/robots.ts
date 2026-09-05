import type { MetadataRoute } from "next";

const domain = "https://ai.affordablepentesting.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app/", "/admin/", "/api/", "/rate-us"],
    },
    sitemap: `${domain}/sitemap.xml`,
  };
}

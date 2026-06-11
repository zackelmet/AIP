import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import BlogLayout from "@/components/blog/BlogLayout";

const SITE = "https://ai.affordablepentesting.com";
const DEFAULT_IMAGE = "/blog/og-default.png";

function readPost(slug: string) {
  const fullPath = path.join(process.cwd(), "src/posts", `${slug}.mdx`);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  return matter(fileContents);
}

export async function generateStaticParams() {
  const postsDirectory = path.join(process.cwd(), "src/posts");
  const fileNames = fs.readdirSync(postsDirectory);
  return fileNames.map((fileName) => ({
    slug: fileName.replace(/\.mdx$/, ""),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const { data } = readPost(params.slug);
  const title = data.title || "Affordable Pentesting Blog";
  const description = data.description || "";
  const url = `${SITE}/blog/${params.slug}`;
  const image = data.image || DEFAULT_IMAGE;

  return {
    metadataBase: new URL(SITE),
    title: `${title} | Affordable Pentesting`,
    description,
    keywords: data.keywords || undefined,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      siteName: "Affordable Pentesting",
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      publishedTime: data.date || undefined,
      modifiedTime: data.updated || data.date || undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default function BlogPost({ params }: { params: { slug: string } }) {
  const { content, data } = readPost(params.slug);
  const title = data.title || "";
  const description = data.description || "";
  const url = `${SITE}/blog/${params.slug}`;
  const image = data.image || DEFAULT_IMAGE;
  const frontMatter = {
    title,
    date: data.date || "",
    description,
    image,
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: title,
        description,
        image: `${SITE}${image}`,
        datePublished: data.date || undefined,
        dateModified: data.updated || data.date || undefined,
        author: { "@type": "Organization", name: "Affordable Pentesting" },
        publisher: {
          "@type": "Organization",
          name: "Affordable Pentesting",
          logo: {
            "@type": "ImageObject",
            url: `${SITE}/affordable-pentesting-logo.png`,
          },
        },
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE },
          {
            "@type": "ListItem",
            position: 2,
            name: "Blog",
            item: `${SITE}/blog`,
          },
          { "@type": "ListItem", position: 3, name: title, item: url },
        ],
      },
    ],
  };

  return (
    <main className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogLayout frontMatter={frontMatter}>
        <MDXRemote
          source={content}
          options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
        />
      </BlogLayout>
    </main>
  );
}

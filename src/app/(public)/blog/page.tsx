import Link from "next/link";
import Image from "next/image";
import { getAllPosts } from "@/lib/blog/mdx";

export const metadata = {
  title: "Blog - Affordable Pentesting",
  description:
    "Security insights, pentesting tips, and vulnerability research — practical guides on compliance, scoping, and reports.",
  metadataBase: new URL("https://ai.affordablepentesting.com"),
  openGraph: {
    title: "Blog - Affordable Pentesting",
    description:
      "Security insights, pentesting tips, and vulnerability research from Affordable Pentesting — practical guides on compliance, scoping, and reports.",
    url: "https://ai.affordablepentesting.com/blog",
    siteName: "Affordable Pentesting",
    images: [
      {
        url: "/og-logo.png",
        width: 871,
        height: 526,
        alt: "Affordable Pentesting",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog - Affordable Pentesting",
    description:
      "Security insights, pentesting tips, and vulnerability research from Affordable Pentesting — practical guides on compliance, scoping, and reports.",
    images: ["/og-logo.png"],
  },
  alternates: { canonical: "https://ai.affordablepentesting.com/blog" },
};

export default function BlogPage() {
  const posts = getAllPosts(["slug", "title", "date", "description", "image"]);

  return (
    <main className="min-h-screen bg-theme text-theme">
      <div className="max-w-5xl mx-auto px-5 py-20">
        {/* Header */}
        <div className="mb-14 text-center">
          <h1
            className="text-5xl font-bold mb-4 text-theme"
            style={{ fontFamily: "var(--font-ibm-plex-sans)" }}
          >
            Blog
          </h1>
          <p className="text-theme-muted text-lg max-w-xl mx-auto">
            Security insights, pentesting tips, and vulnerability research.
          </p>
        </div>

        {/* No posts yet */}
        {posts.length === 0 && (
          <div className="text-center py-24 text-theme-muted">
            <p className="text-xl mb-2">No posts yet.</p>
            <p className="text-sm">Check back soon.</p>
          </div>
        )}

        {/* Post grid */}
        {posts.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex flex-col bg-theme-panel hover:bg-black/[0.03] hover:dark:bg-white/[0.08] border border-theme hover:border-[#4590e2]/40 rounded-xl overflow-hidden transition-all"
              >
                {post.image && (
                  <div className="relative aspect-[1200/630] w-full">
                    <Image
                      src={post.image}
                      alt={post.title || ""}
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-5 flex flex-col flex-1">
                  <p className="text-xs text-theme-muted mb-2">{post.date}</p>
                  <h2 className="text-theme font-bold text-lg mb-2 group-hover:text-[#4590e2] transition-colors leading-snug">
                    {post.title}
                  </h2>
                  <p className="text-theme-muted text-sm line-clamp-3 flex-1">
                    {post.description}
                  </p>
                  <span className="mt-4 text-sm font-semibold text-[#4590e2] group-hover:underline">
                    Read more →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

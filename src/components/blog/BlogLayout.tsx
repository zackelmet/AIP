import React from "react";
import Image from "next/image";
import Link from "next/link";

interface BlogLayoutProps {
  children: React.ReactNode;
  frontMatter: {
    title: string;
    date: string;
    description: string;
    image: string;
  };
  relatedPosts?: { slug: string; title: string; description: string }[];
}

const BlogLayout: React.FC<BlogLayoutProps> = ({ children, frontMatter, relatedPosts }) => {
  return (
    <div className="flex flex-col items-center w-full overflow-x-hidden bg-theme">
      <div className="w-full max-w-4xl mx-auto px-6 py-12">
        <div className="relative w-full aspect-[1200/630] mb-10 rounded-xl overflow-hidden border border-theme">
          <Image
            src={frontMatter.image}
            alt={frontMatter.title}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        </div>
        <article className="prose prose-lg mx-auto mb-12 max-w-none
          prose-headings:text-theme prose-headings:font-semibold
          prose-p:text-theme prose-p:leading-relaxed
          prose-a:text-[#34D399] prose-a:no-underline hover:prose-a:underline
          prose-strong:text-theme
          prose-li:text-theme
          prose-code:text-[#34D399] prose-code:bg-theme-panel prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
          prose-pre:bg-theme-panel prose-pre:border prose-pre:border-theme
          prose-blockquote:border-[#34D399] prose-blockquote:text-theme-muted
          prose-hr:border-theme
          prose-th:text-theme prose-th:border-theme prose-th:bg-theme-panel
          prose-td:text-theme prose-td:border-theme
          [&_table]:w-full [&_table]:border-collapse
          [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-semibold
          [&_td]:px-4 [&_td]:py-3
          [&_tr:not(:last-child)_td]:border-b [&_tr:not(:last-child)_td]:border-theme">
          <h1 className="text-center font-bold text-4xl text-theme mb-4">
            {frontMatter.title}
          </h1>
          <p className="text-lg font-semibold text-center text-theme mb-2">
            {frontMatter.description}
          </p>
          <p className="text-sm text-theme-muted text-center mb-10">
            {frontMatter.date}
          </p>

          {children}
        </article>

        {relatedPosts && relatedPosts.length > 0 && (
          <div className="border-t border-theme pt-10">
            <h2 className="text-2xl font-semibold text-theme mb-6">Related Posts</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {relatedPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group bg-theme-panel hover:bg-black/[0.04] hover:dark:bg-white/[0.08] border border-theme hover:border-[#34D399]/40 rounded-lg p-4 transition-all"
                >
                  <h3 className="text-theme font-medium text-sm group-hover:text-[#34D399] transition-colors leading-snug">
                    {post.title}
                  </h3>
                  <p className="text-theme-muted text-xs mt-1 line-clamp-2">
                    {post.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-[#34D399] hover:underline text-sm"
          >
            ← Back to Blog
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BlogLayout;
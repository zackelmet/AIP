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
    <div className="flex flex-col items-center w-full overflow-x-hidden bg-[#0a141f]">
      <div className="w-full max-w-4xl mx-auto px-6 py-12">
        <div className="relative w-full aspect-[1200/630] mb-10 rounded-xl overflow-hidden border border-white/10">
          <Image
            src={frontMatter.image}
            alt={frontMatter.title}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        </div>
        <article className="prose prose-lg prose-invert mx-auto mb-12 max-w-none
          prose-headings:text-white prose-headings:font-semibold
          prose-p:text-gray-300 prose-p:leading-relaxed
          prose-a:text-[#34D399] prose-a:no-underline hover:prose-a:underline
          prose-strong:text-white
          prose-li:text-gray-300
          prose-code:text-[#34D399] prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
          prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10
          prose-blockquote:border-[#34D399] prose-blockquote:text-gray-400
          prose-hr:border-white/10
          prose-th:text-white prose-th:border-white/20 prose-th:bg-white/5
          prose-td:text-gray-300 prose-td:border-white/10
          [&_table]:w-full [&_table]:border-collapse
          [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-semibold
          [&_td]:px-4 [&_td]:py-3
          [&_tr:not(:last-child)_td]:border-b [&_tr:not(:last-child)_td]:border-white/5">
          <h1 className="text-center font-bold text-4xl text-white mb-4">
            {frontMatter.title}
          </h1>
          <p className="text-lg font-semibold text-center text-gray-300 mb-2">
            {frontMatter.description}
          </p>
          <p className="text-sm text-gray-500 text-center mb-10">
            {frontMatter.date}
          </p>

          {children}
        </article>

        {relatedPosts && relatedPosts.length > 0 && (
          <div className="border-t border-white/10 pt-10">
            <h2 className="text-2xl font-semibold text-white mb-6">Related Posts</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {relatedPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group bg-white/5 hover:bg-white/[0.08] border border-white/10 hover:border-[#34D399]/40 rounded-lg p-4 transition-all"
                >
                  <h3 className="text-white font-medium text-sm group-hover:text-[#34D399] transition-colors leading-snug">
                    {post.title}
                  </h3>
                  <p className="text-gray-400 text-xs mt-1 line-clamp-2">
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
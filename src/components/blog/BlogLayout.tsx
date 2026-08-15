import React from "react";
import Image from "next/image";

interface BlogLayoutProps {
  children: React.ReactNode;
  frontMatter: {
    title: string;
    date: string;
    description: string;
    image: string;
  };
}

const BlogLayout: React.FC<BlogLayoutProps> = ({ children, frontMatter }) => {
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
      </div>
    </div>
  );
};

export default BlogLayout;
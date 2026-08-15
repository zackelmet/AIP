import fs from "fs";
import path from "path";
import matter from "gray-matter";

const postsDirectory = path.join(process.cwd(), "src/posts");

function isPublished(data: { [key: string]: unknown }): boolean {
  if (!data.scheduledDate) return true;
  const scheduled = new Date(data.scheduledDate as string);
  return scheduled <= new Date();
}

export function getPostSlugs() {
  const slugs = fs.readdirSync(postsDirectory);
  return slugs.filter((slug) => {
    const fullPath = path.join(postsDirectory, slug);
    const fileContents = fs.readFileSync(fullPath, "utf8");
    const { data } = matter(fileContents);
    return isPublished(data);
  });
}

export function getPostBySlug(slug: string, fields: string[] = []) {
  const realSlug = slug.replace(/\.mdx$/, "");
  const fullPath = path.join(postsDirectory, `${realSlug}.mdx`);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  if (!isPublished(data)) return null;

  type Items = {
    [key: string]: string;
  };

  const items: Items = {};

  fields.forEach((field) => {
    if (field === "slug") {
      items[field] = realSlug;
    }
    if (field === "content") {
      items[field] = content;
    }

    if (typeof data[field] !== "undefined") {
      items[field] = data[field];
    }
  });

  return items;
}

export function getAllPosts(fields: string[] = []) {
  const slugs = fs
    .readdirSync(postsDirectory)
    .filter((slug) => {
      const fullPath = path.join(postsDirectory, slug);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      const { data } = matter(fileContents);
      return isPublished(data);
    });

  const posts = slugs
    .map((slug) => getPostBySlug(slug, fields))
    .filter((post): post is NonNullable<typeof post> => post !== null)
    .sort((post1, post2) => (post1.date > post2.date ? -1 : 1));
  return posts;
}

import matter from "gray-matter";
import type { Category } from "../../src/site-content.js";
import type { PublicPost } from "./schema.js";

export function renderCategoryPage(
  category: Category,
  posts: readonly PublicPost[],
): string {
  const categoryPosts = posts.filter((post) =>
    post.categoryIds.includes(category.id),
  );
  const list = categoryPosts.length
    ? categoryPosts
        .map((post) => `- [${post.title}](${post.permalink})`)
        .join("\n")
    : "该分类暂时还没有公开文章。";
  const body = `# ${category.name}

${category.description}

${list}
`;

  return matter.stringify(body, {
    title: category.name,
    description: category.description,
    article: false,
    sidebar: false,
    lastUpdated: false,
  });
}

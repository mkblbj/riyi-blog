import matter from "gray-matter";
import type { Category } from "../../src/site-content.js";
import type { PublicPost } from "./schema.js";

function renderPlainText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/\s*\n+\s*/g, " ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/([\\`*_[\]{}()#+.!|~:-])/g, "\\$1");
}

export function renderCategoryPage(
  category: Category,
  posts: readonly PublicPost[],
): string {
  const categoryPosts = posts.filter((post) =>
    post.categoryIds.includes(category.id),
  );
  const list = categoryPosts.length
    ? categoryPosts
        .map((post) => `- [${renderPlainText(post.title)}](${post.permalink})`)
        .join("\n")
    : "该分类暂时还没有公开文章。";
  const body = `# ${renderPlainText(category.name)}

${renderPlainText(category.description)}

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

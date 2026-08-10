import { describe, expect, it } from "vitest";
import { renderCategoryPage } from "../scripts/content/render-category.js";
import { toPublicPost } from "../scripts/content/render-post.js";
import type { PublicPost } from "../scripts/content/schema.js";

const rentId = "11111111-1111-4111-8111-111111111111";
const publishedId = "79f45644-f457-4b94-a288-44780fd8f199";

const category = {
  id: rentId,
  slug: "rent-guide",
  name: "日本租房入门",
  description: "租房说明",
  enabled: true,
  order: 10,
};

const publishedPost: PublicPost = {
  id: publishedId,
  title: "租房文章",
  description: "租房文章说明。",
  coverImg: "/media/cover.webp",
  categoryIds: [rentId],
  categories: ["日本租房入门"],
  tags: [],
  author: { name: "日宜房产" },
  date: "2026-07-28T10:00:00+09:00",
  top: false,
  permalink: `/posts/${publishedId}/`,
  body: "正文",
  sourcePath: `content/posts/${publishedId}.md`,
};

describe("category pages", () => {
  it("keeps a category landing route stable when its label changes", () => {
    const output = renderCategoryPage(category, [publishedPost]);
    expect(output).toContain("# 日本租房入门");
    expect(output).toContain(`/posts/${publishedId}/`);
  });

  it("explains when an enabled category has no published posts", () => {
    expect(renderCategoryPage(category, [])).toContain(
      "该分类暂时还没有公开文章。",
    );
  });
});

describe("public post categories", () => {
  it("reports the source path when a stored category id is missing", () => {
    expect(() =>
      toPublicPost(
        {
          sourcePath: `content/posts/${publishedId}.md`,
          body: "正文",
          data: {
            id: publishedId,
            title: "租房文章",
            description: "租房文章说明文字足够用于页面摘要。",
            coverImg: "/media/cover.webp",
            categories: [rentId],
            tags: [],
            authorName: "日宜房产",
            date: "2026-07-28T10:00:00+09:00",
            top: false,
            status: "published",
          },
        },
        [],
      ),
    ).toThrow(`content/posts/${publishedId}.md: missing category ${rentId}`);
  });
});

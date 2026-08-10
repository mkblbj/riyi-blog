import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { writeRss } from "../scripts/rss.js";
import type { BuildManifest } from "../scripts/content/schema.js";
import {
  buildGlobalHead,
  buildPageHead,
  filterPublicSitemapItems,
  routeFromRelativePath,
} from "../src/seo.js";

describe("SEO", () => {
  it("maps directory index sources to canonical directory URLs", () => {
    expect(routeFromRelativePath("index.md")).toBe("/");
    expect(routeFromRelativePath("about/index.md")).toBe("/about/");
    expect(
      routeFromRelativePath(
        "posts/79f45644-f457-4b94-a288-44780fd8f199/index.md",
      ),
    ).toBe("/posts/79f45644-f457-4b94-a288-44780fd8f199/");
  });

  it("builds canonical, Open Graph and BlogPosting data for an article", () => {
    const head = buildPageHead({
      relativePath: "posts/79f45644-f457-4b94-a288-44780fd8f199/index.md",
      title: "欢迎来到日宜房产博客",
      siteTitle: "日宜住居",
      siteDescription: "日宜住居提供经过编辑的官网说明内容。",
      siteUrl: "https://www.riyihome.com",
      logo: "/site-media/customer-logo.0123456789ab.webp",
      frontmatter: {
        id: "79f45644-f457-4b94-a288-44780fd8f199",
        article: true,
        coverImg: "/media/cover.0123456789ab.webp",
        author: { name: "日宜房产" },
        date: "2026-07-28T12:00:00+09:00",
      },
    });
    expect(head).toContainEqual([
      "link",
      {
        rel: "canonical",
        href: "https://www.riyihome.com/posts/79f45644-f457-4b94-a288-44780fd8f199/",
      },
    ]);
    expect(head).toContainEqual([
      "meta",
      { property: "og:type", content: "article" },
    ]);
    expect(head).toContainEqual([
      "meta",
      { property: "og:site_name", content: "日宜住居" },
    ]);
    expect(head).toContainEqual([
      "meta",
      {
        name: "description",
        content: "日宜住居提供经过编辑的官网说明内容。",
      },
    ]);
    const jsonLd = head.find(
      (entry) =>
        entry[0] === "script" &&
        typeof entry[1] === "object" &&
        entry[1]?.type === "application/ld+json",
    );
    expect(JSON.parse(String(jsonLd?.[2]))).toMatchObject({
      "@type": "BlogPosting",
      headline: "欢迎来到日宜房产博客",
      author: { "@type": "Organization", name: "日宜房产" },
      publisher: {
        "@type": "Organization",
        name: "日宜住居",
        logo: {
          "@type": "ImageObject",
          url: "https://www.riyihome.com/site-media/customer-logo.0123456789ab.webp",
        },
      },
    });
  });

  it("loads no verification or analytics scripts when ids are absent", () => {
    expect(buildGlobalHead({})).toEqual([]);
  });

  it("keeps error pages out of the sitemap", () => {
    expect(
      filterPublicSitemapItems([
        { url: "404.html" },
        { url: "about/" },
        { url: "posts/article/" },
      ]),
    ).toEqual([{ url: "about/" }, { url: "posts/article/" }]);
  });

  it("writes RSS with CMS identity and only manifest posts", async () => {
    const root = await mkdtemp(join(tmpdir(), "riyi-rss-"));
    const manifest: BuildManifest = {
      generatedAt: "2026-07-28T03:00:00.000Z",
      posts: [
        {
          id: "79f45644-f457-4b94-a288-44780fd8f199",
          title: "欢迎来到日宜房产博客",
          description: "日宜房产博客的首篇介绍文章。",
          coverImg: "/media/cover.0123456789ab.webp",
          categoryIds: ["66666666-6666-4666-8666-666666666666"],
          categories: ["公司动态"],
          tags: ["日宜房产"],
          author: { name: "日宜房产" },
          date: "2026-07-28T12:00:00+09:00",
          top: true,
          sticky: 1,
          permalink: "/posts/79f45644-f457-4b94-a288-44780fd8f199/",
          body: "正文",
          sourcePath: "content/posts/79f45644-f457-4b94-a288-44780fd8f199.md",
        },
      ],
    };
    const output = join(root, "rss.xml");
    await writeRss(manifest, output, {
      title: "日宜住居",
      description: "日宜住居提供经过编辑的官网说明内容。",
      logo: "/site-media/customer-logo.0123456789ab.webp",
      url: "https://www.riyihome.com",
    });
    const xml = await readFile(output, "utf8");
    expect(xml).toContain(
      "https://www.riyihome.com/posts/79f45644-f457-4b94-a288-44780fd8f199/",
    );
    expect(xml).toContain("<title>日宜住居资讯</title>");
    expect(xml).toContain(
      "<description>日宜住居提供经过编辑的官网说明内容。</description>",
    );
    expect(xml).toContain(
      "https://www.riyihome.com/site-media/customer-logo.0123456789ab.webp",
    );
    expect(xml).toContain(
      `<copyright>© ${new Date().getFullYear()} 日宜住居</copyright>`,
    );
    expect(xml).toContain("<name>日宜住居</name>");
    expect(xml).not.toContain("<title>日宜房产博客</title>");
    expect(xml).toContain("欢迎来到日宜房产博客");
    expect(xml).not.toContain("draft");
  });
});

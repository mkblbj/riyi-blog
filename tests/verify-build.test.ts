import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import matter from "gray-matter";
import { describe, expect, it, vi } from "vitest";
import { smoke } from "../scripts/smoke.js";
import { verifyBuild } from "../scripts/verify-build.js";

const publishedId = "79f45644-f457-4b94-a288-44780fd8f199";
const draftId = "fa927df7-7638-4551-b5ec-62e69317cd4c";

async function buildFixture() {
  const root = await mkdtemp(join(tmpdir(), "riyi-dist-"));
  const distDir = join(root, "dist");
  const contentDir = join(root, "content");
  const manifestPath = join(root, ".generated/posts.json");
  await mkdir(join(distDir, "posts", publishedId), { recursive: true });
  await mkdir(join(distDir, "media"), { recursive: true });
  await mkdir(join(contentDir, "posts"), { recursive: true });
  await mkdir(join(root, ".generated"), { recursive: true });

  const articleUrl = `https://www.riyihome.com/posts/${publishedId}/`;
  await writeFile(
    join(distDir, "index.html"),
    '<html><head><link rel="canonical" href="https://www.riyihome.com/"></head><body><a href="/posts/' +
      publishedId +
      '/">文章</a></body></html>',
  );
  await writeFile(
    join(distDir, "posts", publishedId, "index.html"),
    `<html><head><link rel="canonical" href="${articleUrl}"><script type="application/ld+json">{"@type":"BlogPosting"}</script></head><body><img src="/media/cover.webp" alt="东京住宅"></body></html>`,
  );
  await writeFile(join(distDir, "media/cover.webp"), "webp");
  await writeFile(join(distDir, "rss.xml"), articleUrl);
  await writeFile(join(distDir, "sitemap.xml"), articleUrl);
  await writeFile(
    join(distDir, "robots.txt"),
    "Sitemap: https://www.riyihome.com/sitemap.xml",
  );
  await writeFile(
    join(distDir, "404.html"),
    "<html><body>404</body></html>",
  );
  await writeFile(
    manifestPath,
    JSON.stringify({
      generatedAt: "2026-07-28T03:00:00.000Z",
      posts: [{ id: publishedId, permalink: `/posts/${publishedId}/` }],
    }),
  );
  await writeFile(
    join(contentDir, "posts", `${draftId}.md`),
    matter.stringify("草稿正文", {
      id: draftId,
      title: "草稿",
      description: "这是一篇不会进入任何公开构建产物的草稿文章。",
      coverImg: "/media/draft.png",
      categories: ["租房指南"],
      tags: [],
      authorName: "日宜房产",
      date: "2026-07-28T10:00:00+09:00",
      top: false,
      status: "draft",
    }),
  );
  return { root, distDir, contentDir, manifestPath };
}

describe("verifyBuild", () => {
  it("accepts a complete static build", async () => {
    const fixture = await buildFixture();
    await expect(verifyBuild(fixture)).resolves.toMatchObject({ errors: [] });
  });

  it("rejects draft ids and Alibaba access keys in public output", async () => {
    const fixture = await buildFixture();
    await writeFile(
      join(fixture.distDir, "leak.js"),
      `${draftId}\nLTAI5tExampleAccessKey123`,
    );
    await expect(verifyBuild(fixture)).rejects.toThrow(
      /unpublished id|credential pattern/,
    );
  });
});

describe("smoke", () => {
  it("checks the home and selected article paths", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response("<html><body>ok</body></html>", {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
    ) as typeof fetch;
    await smoke(
      "https://www.riyihome.com",
      ["/", `/posts/${publishedId}/`],
      fetchImpl,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

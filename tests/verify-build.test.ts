import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import matter from "gray-matter";
import { describe, expect, it, vi } from "vitest";
import { loadSiteContent } from "../scripts/content/load-site.js";
import { smoke } from "../scripts/smoke.js";
import { verifyBuild } from "../scripts/verify-build.js";
import {
  resolveSiteContent,
  SiteManifestSchema,
  type SiteManifest,
} from "../src/site-content.js";
import { createThemeTokens } from "../src/theme-colors.js";

const publishedId = "79f45644-f457-4b94-a288-44780fd8f199";
const draftId = "fa927df7-7638-4551-b5ec-62e69317cd4c";
const officialImagePaths = [
  "/site-media/cms-logo.webp",
  "/site-media/cms-hero.webp",
  "/site-media/cms-rent.webp",
  "/site-media/cms-purchase.webp",
  "/site-media/cms-study.webp",
] as const;

async function buildFixture() {
  const root = await mkdtemp(join(tmpdir(), "riyi-dist-"));
  const distDir = join(root, "dist");
  const contentDir = join(root, "content");
  const manifestPath = join(root, ".generated/posts.json");
  const siteManifestPath = join(root, ".generated/site.json");
  await mkdir(join(distDir, "posts", publishedId), { recursive: true });
  await mkdir(join(distDir, "media"), { recursive: true });
  await mkdir(join(distDir, "site-media"), { recursive: true });
  await mkdir(join(contentDir, "posts"), { recursive: true });
  await mkdir(join(root, ".generated"), { recursive: true });

  const content = resolveSiteContent(loadSiteContent("content"));
  content.settings.siteName = "CMS 当前站点名称";
  content.settings.logo = officialImagePaths[0];
  content.home.hero.image = officialImagePaths[1];
  content.home.hero.imageAlt = "CMS 首屏图";
  content.home.services.items.forEach((service, index) => {
    service.image = officialImagePaths[index + 2] ?? "";
    service.imageAlt = `CMS ${service.title}服务图`;
  });
  const aboutNavigation = content.navigation.items.find(
    ({ href }) => href === "/about/",
  );
  if (!aboutNavigation) throw new Error("fixture is missing About navigation");
  aboutNavigation.href = "/about/?from=nav#team";
  content.categories.at(-1)!.enabled = false;
  const siteManifest: SiteManifest = SiteManifestSchema.parse({
    generatedAt: "2026-08-10T03:00:00.000Z",
    content,
    themeTokens: createThemeTokens(
      content.settings.primaryColor,
      content.settings.secondaryColor,
    ),
  });

  const articleUrl = `https://www.riyihome.com/posts/${publishedId}/`;
  await writeFile(
    join(distDir, "index.html"),
    '<html><head><link rel="canonical" href="https://www.riyihome.com/"><style id="riyi-theme-tokens">:root{--riyi-primary:#1f6658}</style></head><body>CMS 当前站点名称<a href="/posts/' +
      publishedId +
      '/">文章</a></body></html>',
  );
  await writeFile(
    join(distDir, "posts", publishedId, "index.html"),
    `<html><head><link rel="canonical" href="${articleUrl}"><script type="application/ld+json">{"@type":"BlogPosting"}</script></head><body><img src="/media/cover.webp" alt="东京住宅"></body></html>`,
  );
  await writeFile(join(distDir, "media/cover.webp"), "webp");
  await mkdir(join(distDir, "about"), { recursive: true });
  await writeFile(
    join(distDir, "about/index.html"),
    '<html><head><link rel="canonical" href="https://www.riyihome.com/about/"></head><body>关于</body></html>',
  );
  for (const category of siteManifest.content.categories.filter(
    ({ enabled }) => enabled,
  )) {
    await mkdir(join(distDir, "category", category.slug), {
      recursive: true,
    });
    await writeFile(
      join(distDir, "category", category.slug, "index.html"),
      `<html><head><link rel="canonical" href="https://www.riyihome.com/category/${category.slug}/"></head><body>${category.name}</body></html>`,
    );
  }
  for (const imagePath of officialImagePaths) {
    await writeFile(join(distDir, imagePath), "webp");
  }
  await writeFile(join(distDir, "rss.xml"), articleUrl);
  await writeFile(join(distDir, "sitemap.xml"), articleUrl);
  await writeFile(
    join(distDir, "robots.txt"),
    "Sitemap: https://www.riyihome.com/sitemap.xml",
  );
  await writeFile(join(distDir, "404.html"), "<html><body>404</body></html>");
  await writeFile(
    manifestPath,
    JSON.stringify({
      generatedAt: "2026-07-28T03:00:00.000Z",
      posts: [{ id: publishedId, permalink: `/posts/${publishedId}/` }],
    }),
  );
  await writeFile(siteManifestPath, JSON.stringify(siteManifest), "utf8");
  await writeFile(
    join(contentDir, "posts", `${draftId}.md`),
    matter.stringify("草稿正文", {
      id: draftId,
      title: "草稿",
      description: "这是一篇不会进入任何公开构建产物的草稿文章。",
      coverImg: "/media/draft.png",
      categories: ["11111111-1111-4111-8111-111111111111"],
      tags: [],
      authorName: "日宜房产",
      date: "2026-07-28T10:00:00+09:00",
      top: false,
      status: "draft",
    }),
  );
  return {
    root,
    distDir,
    contentDir,
    manifestPath,
    siteManifestPath,
    siteManifest,
  };
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

  it("rejects a missing enabled category landing page", async () => {
    const fixture = await buildFixture();
    const category = fixture.siteManifest.content.categories.find(
      ({ enabled }) => enabled,
    )!;
    await rm(join(fixture.distDir, "category", category.slug), {
      recursive: true,
    });

    await expect(verifyBuild(fixture)).rejects.toThrow(
      new RegExp(`enabled category.*${category.slug}`),
    );
  });

  it.each([
    ["theme style", /<style id="riyi-theme-tokens">[^<]*<\/style>/, ""],
    ["CMS identity", /CMS 当前站点名称/, "旧站点名称"],
  ])("rejects a homepage missing its %s", async (_name, pattern, value) => {
    const fixture = await buildFixture();
    const indexPath = join(fixture.distDir, "index.html");
    const index = await readFile(indexPath, "utf8");
    await writeFile(indexPath, index.replace(pattern, value), "utf8");

    await expect(verifyBuild(fixture)).rejects.toThrow(
      /riyi-theme-tokens|CMS current site identity|CMS 当前站点名称/,
    );
  });

  it("resolves internal navigation without treating query, hash, or external links as files", async () => {
    const fixture = await buildFixture();
    await rm(join(fixture.distDir, "about"), { recursive: true });

    await expect(verifyBuild(fixture)).rejects.toThrow(
      /internal navigation.*\/about\/\?from=nav#team/,
    );
  });

  it("rejects internal navigation that escapes the build directory", async () => {
    const fixture = await buildFixture();
    const aboutNavigation = fixture.siteManifest.content.navigation.items.find(
      ({ href }) => href.startsWith("/about/"),
    )!;
    aboutNavigation.href = "/%2F..%2F..%2Foutside/";
    await writeFile(
      fixture.siteManifestPath,
      JSON.stringify(fixture.siteManifest),
      "utf8",
    );

    await expect(verifyBuild(fixture)).rejects.toThrow(
      /unsafe internal navigation.*outside/,
    );
  });

  it.each(officialImagePaths)(
    "rejects a missing official image at %s",
    async (imagePath) => {
      const fixture = await buildFixture();
      await rm(join(fixture.distDir, imagePath));

      await expect(verifyBuild(fixture)).rejects.toThrow(
        new RegExp(`official image.*${imagePath}`),
      );
    },
  );

  it.each(["{", "{}"])(
    "reports the site manifest path when parsing %j fails",
    async (source) => {
      const fixture = await buildFixture();
      await writeFile(fixture.siteManifestPath, source, "utf8");

      const failure = await verifyBuild(fixture).catch((error) => error);

      expect(failure).toBeInstanceOf(Error);
      expect((failure as Error).message).toContain(fixture.siteManifestPath);
      expect((failure as Error).message).toContain("invalid site manifest");
    },
  );
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

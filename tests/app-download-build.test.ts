import { execFile } from "node:child_process";
import {
  cp,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { load } from "cheerio";
import { describe, expect, it } from "vitest";
import { SiteManifestSchema } from "../src/site-content.js";

const execFileAsync = promisify(execFile);

function requireItem<T extends { id: string }>(items: T[], id: string): T {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`missing fixture item: ${id}`);
  return item;
}

async function createBuildFixture(): Promise<string> {
  const projectRoot = process.cwd();
  const fixtureRoot = await mkdtemp(join(tmpdir(), "riyi-home-build-"));

  try {
    await Promise.all(
      [
        "content",
        "scripts",
        "site",
        "src",
        "package.json",
        "tsconfig.json",
      ].map((entry) =>
        cp(join(projectRoot, entry), join(fixtureRoot, entry), {
          recursive: true,
        }),
      ),
    );
    await symlink(
      join(projectRoot, "node_modules"),
      join(fixtureRoot, "node_modules"),
      "dir",
    );
    return fixtureRoot;
  } catch (error) {
    await rm(fixtureRoot, { recursive: true, force: true });
    throw error;
  }
}

describe("app download homepage integration", () => {
  it("renders editable, visible CMS sections and link behavior in the built site", async () => {
    const fixtureRoot = await createBuildFixture();

    try {
      await execFileAsync("pnpm", ["content:prepare"], {
        cwd: fixtureRoot,
        maxBuffer: 10 * 1024 * 1024,
      });

      const manifestPath = join(fixtureRoot, ".generated/site.json");
      const manifest = SiteManifestSchema.parse(
        JSON.parse(await readFile(manifestPath, "utf8")),
      );
      const { home } = manifest.content;

      home.services.title = "CMS 可编辑房产服务";
      const rent = requireItem(home.services.items, "rent");
      const purchase = requireItem(home.services.items, "purchase");
      const study = requireItem(home.services.items, "study");
      rent.title = "CMS 日本租房";
      rent.order = 20;
      purchase.title = "CMS 日本买房";
      purchase.order = 10;
      purchase.image = "/site-media/cms-service.webp";
      purchase.imageAlt = "CMS 配置的买房服务图片";
      purchase.href = "https://example.com/cms-purchase";
      purchase.external = true;
      study.enabled = false;
      study.title = "不应渲染的隐藏服务";

      home.advantages.enabled = false;
      home.advantages.title = "不应渲染的隐藏优势模块";

      home.actions.title = "CMS 可编辑行动入口";
      const listings = requireItem(home.actions.items, "listings");
      const demand = requireItem(home.actions.items, "demand");
      const wechat = requireItem(home.actions.items, "wechat");
      listings.label = "CMS 查看房源";
      listings.href = "https://example.com/cms-listings";
      listings.order = 10;
      demand.enabled = false;
      demand.label = "不应渲染的隐藏行动";
      wechat.label = "CMS 微信咨询";
      wechat.href = "https://example.com/cms-consult";
      wechat.order = 20;

      home.articles.eyebrow = "CMS 日宜内容";
      home.articles.title = "CMS 最新房产资讯";
      home.articles.description = "CMS 配置的最新文章说明。";

      await writeFile(
        manifestPath,
        `${JSON.stringify(manifest, null, 2)}\n`,
        "utf8",
      );
      await execFileAsync("pnpm", ["exec", "vitepress", "build", "site"], {
        cwd: fixtureRoot,
        maxBuffer: 10 * 1024 * 1024,
      });

      const html = await readFile(
        join(fixtureRoot, "site/.vitepress/dist/index.html"),
        "utf8",
      );
      const $ = load(html);
      const download = $("#download-app");
      const downloadLinks = download.find("a");

      expect(download.length).toBe(1);
      expect(download.find(".riyi-eyebrow").text()).toBe(
        home.appDownload.eyebrow,
      );
      expect(download.find("h2").text()).toBe(home.appDownload.title);
      expect(
        download.find(".riyi-app-download__copy > p:last").text().trim(),
      ).toBe(home.appDownload.description);
      expect(
        downloadLinks.map((_, element) => $(element).attr("href")).get(),
      ).toEqual([home.appDownload.appStoreUrl, home.appDownload.googlePlayUrl]);
      expect(
        downloadLinks.filter("[target='_blank'][rel='noreferrer']"),
      ).toHaveLength(2);
      expect(download.find("button[type='button']").text()).toContain(
        "微信小程序",
      );

      expect($(".riyi-promotion-intro h2").text()).toBe("CMS 可编辑房产服务");
      expect(
        $(".riyi-service-card h3")
          .map((_, element) => $(element).text())
          .get(),
      ).toEqual(["CMS 日本买房", "CMS 日本租房"]);
      expect($("body").text()).not.toContain("不应渲染的隐藏服务");
      expect($("body").text()).not.toContain("不应渲染的隐藏优势模块");
      const serviceImage = $(".riyi-service-card__image");
      expect(serviceImage).toHaveLength(1);
      expect(serviceImage.attr("src")).toBe("/site-media/cms-service.webp");
      expect(serviceImage.attr("alt")).toBe("CMS 配置的买房服务图片");

      const externalServiceLink = $(
        ".riyi-service-card a[href='https://example.com/cms-purchase']",
      );
      expect(externalServiceLink).toHaveLength(1);
      expect(externalServiceLink.attr("target")).toBe("_blank");
      expect(externalServiceLink.attr("rel")).toBe("noreferrer");
      const internalServiceLink = $(
        `.riyi-service-card a[href='${rent.href}']`,
      );
      expect(internalServiceLink).toHaveLength(1);
      expect(internalServiceLink.attr("target")).toBeUndefined();
      expect(internalServiceLink.attr("rel")).toBeUndefined();

      expect($(".riyi-action-copy h2").text()).toBe("CMS 可编辑行动入口");
      const actionLinks = $(".riyi-action-panel .riyi-action-link");
      expect(
        actionLinks.map((_, element) => $(element).find("span").text()).get(),
      ).toEqual(["CMS 查看房源", "CMS 微信咨询"]);
      expect(
        actionLinks.map((_, element) => $(element).attr("href")).get(),
      ).toEqual([
        "https://example.com/cms-listings",
        "https://example.com/cms-consult",
      ]);
      expect($("body").text()).not.toContain("不应渲染的隐藏行动");
      for (const element of actionLinks) {
        expect(new URL($(element).attr("href") ?? "").protocol).toBe("https:");
        expect($(element).attr("target")).toBe("_blank");
        expect($(element).attr("rel")).toBe("noreferrer");
      }

      expect($(".riyi-section-heading").text()).toContain("CMS 日宜内容");
      expect($(".riyi-section-heading").text()).toContain("CMS 最新房产资讯");
      expect($(".riyi-section-heading").text()).toContain(
        "CMS 配置的最新文章说明。",
      );
      expect($(".riyi-article-cta")).toHaveLength(0);

      const articleHtml = await readFile(
        join(
          fixtureRoot,
          "site/.vitepress/dist/posts/79f45644-f457-4b94-a288-44780fd8f199/index.html",
        ),
        "utf8",
      );
      const article = load(articleHtml);
      const articleCta = article(".riyi-article-cta");
      expect(articleCta.find("h2").text()).toBe("CMS 可编辑行动入口");
      const articleActionLinks = articleCta.find(".riyi-article-cta__link");
      expect(
        articleActionLinks
          .map((_, element) => article(element).text().trim())
          .get(),
      ).toEqual(["CMS 查看房源", "CMS 微信咨询"]);
      expect(
        articleActionLinks
          .map((_, element) => article(element).attr("href"))
          .get(),
      ).toEqual([
        "https://example.com/cms-listings",
        "https://example.com/cms-consult",
      ]);
      for (const element of articleActionLinks) {
        expect(article(element).attr("target")).toBe("_blank");
        expect(article(element).attr("rel")).toBe("noreferrer");
      }
    } finally {
      await rm(fixtureRoot, { recursive: true, force: true });
    }
  }, 60_000);
});

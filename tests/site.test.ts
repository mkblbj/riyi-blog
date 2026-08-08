import { access, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { NAV_ITEMS } from "../src/navigation.js";
import { PLATFORM_LINKS } from "../src/platform-links.js";
import {
  CATEGORIES,
  PLATFORM_URL,
  SITE_DESCRIPTION,
  SITE_TITLE,
  SITE_URL,
} from "../src/site.js";
import { teekConfig } from "../site/.vitepress/teek-config.js";

describe("site contract", () => {
  it("keeps the blog and property platform on separate hosts", () => {
    expect(SITE_URL).toBe("https://www.riyihome.com");
    expect(PLATFORM_URL).toBe("https://riyihome.com");
    expect(SITE_TITLE).toBe("日宜房产");
    expect(SITE_DESCRIPTION).toContain("日本房产");
    expect(SITE_DESCRIPTION).toContain("实用内容");
  });

  it("uses only HTTPS business entry points", () => {
    expect(PLATFORM_LINKS).toEqual({
      home: "https://riyihome.com",
      submitDemand:
        "https://riyihome.com/index.html#/pages/project/advisory",
      wechatConsult:
        "https://work.weixin.qq.com/kfid/kfcc5d6c8170e5733d0",
    });
    for (const url of Object.values(PLATFORM_LINKS)) {
      expect(new URL(url).protocol).toBe("https:");
    }
  });

  it("publishes the approved fixed categories", () => {
    expect(CATEGORIES).toEqual([
      "租房指南",
      "买房指南",
      "日本生活",
      "区域介绍",
      "房产政策",
      "公司动态",
    ]);
  });

  it("uses the approved public navigation", () => {
    expect(NAV_ITEMS).toEqual([
      { text: "首页", link: "/" },
      { text: "租房指南", link: "/categories/?category=租房指南" },
      { text: "买房指南", link: "/categories/?category=买房指南" },
      { text: "日本生活", link: "/categories/?category=日本生活" },
      { text: "区域介绍", link: "/categories/?category=区域介绍" },
      { text: "关于日宜", link: "/about/" },
      { text: "查看房源", link: PLATFORM_LINKS.home },
    ]);
  });

  it("contains every required fixed page", async () => {
    await Promise.all(
      [
        "site/index.md",
        "site/categories/index.md",
        "site/tags/index.md",
        "site/archives/index.md",
        "site/about/index.md",
        "site/privacy/index.md",
        "site/404.md",
      ].map((path) => expect(access(path)).resolves.toBeUndefined()),
    );
  });

  it("does not rewrite native directory article routes on the client", () => {
    const pluginNames = (teekConfig.vite?.plugins ?? [])
      .flat()
      .map((plugin) =>
        plugin && typeof plugin === "object" && "name" in plugin
          ? plugin.name
          : "",
      );

    expect(pluginNames).not.toContain(
      "vite-plugin-vitepress-auto-permalink",
    );
    expect(pluginNames).not.toContain(
      "vite-plugin-vitepress-use-permalink",
    );
  });

  it("selects a Simplified Chinese font before Japanese fallbacks", async () => {
    const css = await readFile(
      "site/.vitepress/theme/custom.css",
      "utf8",
    );
    const declaration = css.match(
      /--vp-font-family-base:\s*([^;]+);/,
    )?.[1];
    const families = declaration
      ?.split(",")
      .map((family) => family.trim().replace(/^["']|["']$/g, ""));
    const availableFonts = new Set([
      "Noto Sans JP",
      "Hiragino Sans",
      "PingFang SC",
      "sans-serif",
    ]);

    expect(families?.find((family) => availableFonts.has(family))).toBe(
      "PingFang SC",
    );
  });
});

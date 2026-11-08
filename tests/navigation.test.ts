import { join } from "node:path";
import type { DefaultTheme } from "vitepress";
import { describe, expect, it } from "vitest";
import { loadSiteContent } from "../scripts/content/load-site.js";
import { buildNavigation } from "../src/navigation.js";
import {
  resolveSiteContent,
  type ResolvedSiteContent,
} from "../src/site-content.js";
import { runtimeSiteManifest } from "../site/.vitepress/site-manifest.js";

const manifest = runtimeSiteManifest;

function projectNavigation(
  content: ResolvedSiteContent,
  primaryLimit?: number,
): DefaultTheme.NavItem[] {
  return buildNavigation(content, primaryLimit);
}

function navText(item: DefaultTheme.NavItem): string | undefined {
  return "text" in item ? item.text : undefined;
}

describe("runtime navigation", () => {
  it("keeps Home among the primary items and groups overflow under More", () => {
    const items = [
      ["首页", "/"],
      ["租房指南", "/category/rent-guide/"],
      ["买房指南", "/category/purchase-guide/"],
      ["日本生活", "/category/life/"],
      ["区域介绍", "/category/area-guide/"],
      ["关于日宜", "/about/"],
      ["房产政策", "/category/property-policy/"],
      ["查看房源", "https://riyihome.com"],
    ] as const;
    const contentWithEightVisibleItems: ResolvedSiteContent = {
      ...manifest.content,
      navigation: {
        items: items.map(([label, href], index) => ({
          id: `test-nav-${index}`,
          label,
          href,
          external: href.startsWith("https://"),
          newWindow: href.startsWith("https://"),
          order: index * 10,
        })),
      },
    };

    const nav = projectNavigation(contentWithEightVisibleItems, 6);

    expect(nav.slice(0, 6).map(navText)).toEqual([
      "首页",
      "租房指南",
      "买房指南",
      "日本生活",
      "区域介绍",
      "关于日宜",
    ]);
    expect(nav[6]).toMatchObject({
      text: "更多",
      items: [
        expect.objectContaining({ text: "房产政策" }),
        expect.objectContaining({
          text: "查看房源",
          target: "_blank",
          rel: "noreferrer",
        }),
      ],
    });
  });

  it("does not emit hidden navigation", () => {
    const source = loadSiteContent(join(process.cwd(), "content"));
    source.navigation.items.push({
      id: "71000000-0000-4000-8000-000000000099",
      label: "隐藏入口",
      kind: "internal",
      categoryId: "",
      href: "/privacy/",
      visible: false,
      newWindow: false,
      order: 99,
    });
    const contentWithHiddenItem = resolveSiteContent(source);

    expect(projectNavigation(contentWithHiddenItem).map(navText)).not.toContain(
      "隐藏入口",
    );
  });

  it("keeps an external navigation item in the same tab when requested", () => {
    const contentWithSameTabExternal = structuredClone(manifest.content);
    contentWithSameTabExternal.navigation.items.push({
      id: "71000000-0000-4000-8000-000000000098",
      label: "房产平台",
      href: "https://riyihome.com",
      external: true,
      newWindow: false,
      order: 70,
    });

    const item = projectNavigation(contentWithSameTabExternal, 20).find(
      (navItem) => navText(navItem) === "房产平台",
    );

    expect(item).toMatchObject({
      text: "房产平台",
      link: "https://riyihome.com",
    });
    expect(item).not.toHaveProperty("target");
    expect(item).not.toHaveProperty("rel");
  });
});

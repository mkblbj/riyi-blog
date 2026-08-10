import { defineConfigWithTheme, type DefaultTheme } from "vitepress";
import { teekCssPlugin } from "../../scripts/vite/teek-css.js";
import { buildNavigation } from "../../src/navigation.js";
import {
  buildGlobalHead,
  buildPageHead,
  filterPublicSitemapItems,
} from "../../src/seo.js";
import type { ResolvedSiteContent } from "../../src/site-content.js";
import { SITE_URL } from "../../src/site.js";
import type { ThemeTokens } from "../../src/theme-colors.js";
import { runtimeSiteManifest as siteManifest } from "./site-manifest.js";
import { teekConfig } from "./teek-config.js";

const site = siteManifest.content;

export function buildThemeCss(tokens: ThemeTokens): string {
  const onSecondaryFilter =
    tokens.onSecondary === "#ffffff"
      ? "brightness(0) invert(1)"
      : "brightness(0) invert(0.067)";
  return `:root{--riyi-primary:${tokens.primary};--riyi-secondary:${tokens.secondary};--riyi-brand-text:${tokens.brandText};--riyi-brand-hover:${tokens.brandHover};--riyi-brand-strong:${tokens.brandStrong};--riyi-brand-soft:${tokens.brandSoft};--riyi-secondary-strong:${tokens.secondaryStrong};--riyi-secondary-muted:${tokens.secondaryMuted};--riyi-on-secondary:${tokens.onSecondary};--riyi-on-secondary-filter:${onSecondaryFilter}}.dark{--riyi-brand-text:${tokens.darkBrandText};--riyi-secondary:${tokens.darkSecondary};--riyi-secondary-strong:${tokens.darkSecondaryStrong};--riyi-secondary-muted:${tokens.darkSecondaryMuted}}`;
}

const themeCss = buildThemeCss(siteManifest.themeTokens);

interface RiyiThemeConfig extends DefaultTheme.Config {
  riyi: ResolvedSiteContent;
}

export default defineConfigWithTheme<RiyiThemeConfig>({
  extends: teekConfig,
  vite: {
    plugins: [teekCssPlugin()],
  },
  title: site.settings.siteName,
  titleTemplate: `:title｜${site.settings.siteName}`,
  description: site.settings.siteDescription,
  lang: "zh-CN",
  cleanUrls: false,
  lastUpdated: true,
  head: [
    ["link", { rel: "icon", type: "image/png", href: "/brand/og-default.png" }],
    [
      "link",
      {
        rel: "alternate",
        type: "application/rss+xml",
        title: `${site.settings.siteName}资讯 RSS`,
        href: "/rss.xml",
      },
    ],
    ...buildGlobalHead(process.env),
    ["style", { id: "riyi-theme-tokens" }, themeCss],
  ],
  markdown: {
    image: { lazyLoading: true },
    container: {
      tipLabel: "提示",
      warningLabel: "注意",
      dangerLabel: "重要",
      infoLabel: "信息",
      detailsLabel: "详情",
    },
  },
  sitemap: {
    hostname: SITE_URL,
    transformItems: filterPublicSitemapItems,
  },
  transformPageData(pageData) {
    if (pageData.relativePath === "index.md") {
      pageData.title = site.settings.siteName;
      pageData.frontmatter.description = site.settings.siteDescription;
    }
    const pageHead = buildPageHead({
      relativePath: pageData.relativePath,
      title: pageData.title,
      description:
        typeof pageData.frontmatter.description === "string"
          ? pageData.frontmatter.description
          : site.settings.siteDescription,
      siteTitle: site.settings.siteName,
      siteDescription: site.settings.siteDescription,
      siteUrl: SITE_URL,
      logo: site.settings.logo,
      frontmatter: pageData.frontmatter,
    });
    pageData.frontmatter.head = [
      ...(pageData.frontmatter.head ?? []),
      ...pageHead,
    ];
  },
  themeConfig: {
    nav: buildNavigation(site),
    logo: site.settings.logo || undefined,
    riyi: site,
    search: {
      provider: "local",
      options: {
        translations: {
          button: { buttonText: "搜索", buttonAriaLabel: "搜索" },
          modal: {
            noResultsText: "没有找到相关内容",
            resetButtonTitle: "清除查询条件",
            footer: {
              selectText: "选择",
              navigateText: "切换",
              closeText: "关闭",
            },
          },
        },
      },
    },
    outline: { level: [2, 3], label: "本文目录" },
    returnToTopLabel: "返回顶部",
    sidebarMenuLabel: "菜单",
    darkModeSwitchLabel: "主题",
    lastUpdatedText: "最后更新",
    docFooter: { prev: "上一篇", next: "下一篇" },
  },
});

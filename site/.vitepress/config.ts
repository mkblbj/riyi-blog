import { defineConfig } from "vitepress";
import { teekCssPlugin } from "../../scripts/vite/teek-css.js";
import { NAV_ITEMS } from "../../src/navigation.js";
import {
  buildGlobalHead,
  buildPageHead,
  filterPublicSitemapItems,
} from "../../src/seo.js";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "../../src/site.js";
import { teekConfig } from "./teek-config.js";

export default defineConfig({
  extends: teekConfig,
  vite: {
    plugins: [teekCssPlugin()],
  },
  title: SITE_TITLE,
  titleTemplate: `:title｜${SITE_TITLE}`,
  description: SITE_DESCRIPTION,
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
        title: `${SITE_TITLE}博客 RSS`,
        href: "/rss.xml",
      },
    ],
    ...buildGlobalHead(process.env),
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
    const pageHead = buildPageHead({
      relativePath: pageData.relativePath,
      title: pageData.title,
      description:
        typeof pageData.frontmatter.description === "string"
          ? pageData.frontmatter.description
          : SITE_DESCRIPTION,
      frontmatter: pageData.frontmatter,
    });
    pageData.frontmatter.head = [
      ...(pageData.frontmatter.head ?? []),
      ...pageHead,
    ];
  },
  themeConfig: {
    nav: [...NAV_ITEMS],
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

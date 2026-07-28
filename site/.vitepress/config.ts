import { defineConfig } from "vitepress";
import { NAV_ITEMS } from "../../src/navigation.js";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "../../src/site.js";
import { teekConfig } from "./teek-config.js";

export default defineConfig({
  extends: teekConfig,
  title: SITE_TITLE,
  titleTemplate: `:title｜${SITE_TITLE}`,
  description: SITE_DESCRIPTION,
  lang: "zh-CN",
  cleanUrls: false,
  lastUpdated: true,
  head: [
    ["link", { rel: "icon", type: "image/png", href: "/brand/og-default.png" }],
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
  sitemap: { hostname: SITE_URL },
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

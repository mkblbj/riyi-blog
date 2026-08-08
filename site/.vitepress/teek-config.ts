import { defineTeekConfig } from "vitepress-theme-teek/config";
import { PLATFORM_LINKS } from "../../src/platform-links.js";

export const teekVitePlugins = {
  permalink: false,
  sidebarOption: { ignoreList: ["posts"] },
};

export const teekConfig = defineTeekConfig({
  teekTheme: true,
  teekHome: true,
  vpHome: false,
  vitePlugins: teekVitePlugins,
  loading: false,
  homeCardListPosition: "right",
  author: { name: "日宜房产", link: PLATFORM_LINKS.home },
  banner: {
    enabled: true,
    name: "日宜房产",
    bgStyle: "pure",
    pureBgColor: "#17352f",
    textColor: "#ffffff",
    descStyle: "default",
    description: ["日本找房，就上日宜。找房服务与实用内容，都在这里。"],
    imgWaves: true,
    features: [
      {
        title: "租房指南",
        details: "理解费用、审查与签约流程",
        link: "/categories/?category=租房指南",
      },
      {
        title: "买房指南",
        details: "整理购房、贷款与持有成本",
        link: "/categories/?category=买房指南",
      },
      {
        title: "查看日宜房源",
        details: "返回日宜房产平台寻找合适房源",
        link: PLATFORM_LINKS.home,
      },
    ],
  },
  post: {
    postStyle: "list",
    excerptPosition: "top",
    showMore: true,
    moreLabel: "阅读全文",
    emptyLabel: "文章正在准备中",
    coverImgMode: "small",
    showCapture: false,
  },
  breadcrumb: { enabled: false },
  page: { pageSize: 10 },
  blogger: {
    name: "日宜房产",
    slogan: "分享日本租房、买房、区域选择与生活信息。",
    avatar: "/brand/og-default.png",
    shape: "square",
  },
  topArticle: {
    enabled: true,
    title: "精选文章",
    emptyLabel: "暂无精选文章",
    limit: 5,
  },
  category: {
    enabled: true,
    path: "/categories/",
    pageTitle: "全部分类",
    homeTitle: "文章分类",
  },
  tag: {
    enabled: true,
    path: "/tags/",
    pageTitle: "全部标签",
    homeTitle: "热门标签",
  },
  friendLink: { enabled: false },
  homeCardSort: ["topArticle", "category", "tag"],
  docAnalysis: {
    enabled: false,
    createTime: "2026-07-28",
    wordCount: true,
    readingTime: true,
    statistics: {
      provider: "",
      siteView: false,
      pageView: false,
    },
  },
  footerInfo: {
    topMessage: [
      `<a href="/privacy/">隐私政策</a> · <a href="${PLATFORM_LINKS.home}">日宜房产平台</a>`,
    ],
    theme: { show: false },
    copyright: {
      show: true,
      createYear: 2026,
      suffix: "日宜房产",
    },
  },
});

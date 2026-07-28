import { defineTeekConfig } from "vitepress-theme-teek/config";

export const teekConfig = defineTeekConfig({
  teekTheme: true,
  teekHome: true,
  vpHome: false,
  vitePlugins: { permalink: false },
  loading: false,
  homeCardListPosition: "right",
  author: { name: "日宜房产", link: "https://riyihome.com" },
  banner: {
    enabled: true,
    name: "日宜房产博客",
    bgStyle: "pure",
    pureBgColor: "#17352f",
    textColor: "#ffffff",
    descStyle: "default",
    description: ["在日本安心生活，从看懂房子与城市开始。"],
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
        link: "https://riyihome.com",
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
  homeCardSort: ["topArticle", "category", "tag", "docAnalysis"],
  docAnalysis: {
    enabled: true,
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
      '<a href="/privacy/">隐私政策</a> · <a href="https://riyihome.com">日宜房产平台</a>',
    ],
    theme: { show: false },
    copyright: {
      show: true,
      createYear: 2026,
      suffix: "日宜房产",
    },
  },
});

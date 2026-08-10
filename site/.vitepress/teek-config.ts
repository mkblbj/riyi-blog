import { defineTeekConfig } from "vitepress-theme-teek/config";
import { PLATFORM_LINKS } from "../../src/platform-links.js";
import { runtimeSiteManifest as siteManifest } from "./site-manifest.js";

const site = siteManifest.content;
const hero = site.home.hero;
const bannerBackground = hero.image
  ? { bgStyle: "partImg" as const, imgSrc: hero.image }
  : {
      bgStyle: "pure" as const,
      pureBgColor: site.settings.secondaryColor,
    };

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
  author: { name: site.settings.siteName, link: PLATFORM_LINKS.home },
  banner: {
    enabled: true,
    name: hero.title,
    ...bannerBackground,
    textColor: siteManifest.themeTokens.onSecondary,
    descStyle: "default",
    description: [hero.description],
    imgWaves: true,
    features: hero.quickLinks
      .filter(({ enabled }) => enabled)
      .sort((left, right) => left.order - right.order)
      .map(({ title, description, href }) => ({
        title,
        details: description,
        link: href,
      })),
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
    name: site.settings.siteName,
    slogan: site.settings.siteDescription,
    avatar: site.settings.logo || "/brand/og-default.png",
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
      suffix: site.settings.siteName,
    },
  },
});

import { PLATFORM_LINKS } from "./platform-links.js";

export const NAV_ITEMS = [
  { text: "首页", link: "/" },
  { text: "租房指南", link: "/categories/?category=租房指南" },
  { text: "买房指南", link: "/categories/?category=买房指南" },
  { text: "日本生活", link: "/categories/?category=日本生活" },
  { text: "区域介绍", link: "/categories/?category=区域介绍" },
  { text: "关于日宜", link: "/about/" },
  { text: "查看房源", link: PLATFORM_LINKS.home },
] as const;

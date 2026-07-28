export const SITE_URL = "https://www.riyihome.com" as const;
export const PLATFORM_URL = "https://riyihome.com" as const;
export const SITE_TITLE = "日宜房产" as const;
export const SITE_DESCRIPTION =
  "日宜房产分享日本租房、买房、区域选择与日常生活的实用信息。" as const;

export const CATEGORIES = [
  "租房指南",
  "买房指南",
  "日本生活",
  "区域介绍",
  "房产政策",
  "公司动态",
] as const;

export type Category = (typeof CATEGORIES)[number];

import type { ResolvedHomeContent } from "./site-content.js";

export interface AppDownloadAction {
  id: "app-store" | "google-play" | "wechat-mini-program";
  label: string;
  description: string;
  kind: "link" | "copy";
  value: string;
  iconUrl: string;
}

export function sortByOrder<T extends { order: number }>(
  items: readonly T[],
): T[] {
  return [...items].sort((left, right) => left.order - right.order);
}

export function selectVisibleServices(config: ResolvedHomeContent["services"]) {
  return sortByOrder(config.items.filter(({ enabled }) => enabled));
}

export function selectVisibleAdvantages(
  config: ResolvedHomeContent["advantages"],
) {
  return sortByOrder(config.items.filter(({ enabled }) => enabled));
}

export function selectVisibleActions(config: ResolvedHomeContent["actions"]) {
  return sortByOrder(config.items.filter(({ enabled }) => enabled));
}

export function buildAppDownloadActions(
  config: ResolvedHomeContent["appDownload"],
): AppDownloadAction[] {
  return [
    {
      id: "app-store",
      label: "App Store",
      description: "iPhone 版日宜找房",
      kind: "link",
      value: config.appStoreUrl,
      iconUrl: "https://cdn.simpleicons.org/apple/111111",
    },
    {
      id: "google-play",
      label: "Google Play",
      description: "Android 版日宜找房",
      kind: "link",
      value: config.googlePlayUrl,
      iconUrl: "https://cdn.simpleicons.org/googleplay/34A853",
    },
    {
      id: "wechat-mini-program",
      label: "微信小程序",
      description: "复制口令后在微信打开",
      kind: "copy",
      value: config.wechatMiniProgram,
      iconUrl: "https://cdn.simpleicons.org/wechat/07C160",
    },
  ];
}

export function shouldShowArticleCta(
  frontmatter: Record<string, unknown>,
): boolean {
  return frontmatter.article === true;
}

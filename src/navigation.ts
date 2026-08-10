import type { DefaultTheme } from "vitepress";
import type {
  ResolvedNavigationItem,
  ResolvedSiteContent,
} from "./site-content.js";

function toNavItem(item: ResolvedNavigationItem): DefaultTheme.NavItemWithLink {
  const link = { text: item.label, link: item.href };
  if (item.external && item.newWindow) {
    return { ...link, target: "_blank", rel: "noreferrer" };
  }
  return link;
}

export function buildNavigation(
  content: ResolvedSiteContent,
  primaryLimit = 6,
): DefaultTheme.NavItem[] {
  const items = content.navigation.items.map(toNavItem);
  if (items.length <= primaryLimit) return items;

  return [
    ...items.slice(0, primaryLimit),
    { text: "更多", items: items.slice(primaryLimit) },
  ];
}

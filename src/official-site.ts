import { PLATFORM_LINKS } from "./platform-links.js";

export interface PromotionCard {
  title: string;
  description: string;
}

export interface ServiceCard extends PromotionCard {
  link: string;
  linkLabel: string;
}

export interface OfficialAction {
  label: string;
  href: string;
  description: string;
  tone: "primary" | "secondary" | "quiet";
}

export const HOME_SERVICES: readonly ServiceCard[] = [
  {
    title: "日本租房",
    description:
      "从初期费用、入住审查到签约流程，把容易忽略的细节提前说明。",
    link: "/categories/?category=租房指南",
    linkLabel: "阅读租房指南",
  },
  {
    title: "日本买房",
    description:
      "围绕区域、预算、贷款与持有成本，帮助你建立更完整的判断。",
    link: "/categories/?category=买房指南",
    linkLabel: "阅读买房指南",
  },
  {
    title: "留学安居",
    description:
      "结合学校、通勤与日常生活需求，理解房子之外真正影响居住的条件。",
    link: "/categories/?category=日本生活",
    linkLabel: "了解日本生活",
  },
] as const;

export const HOME_ADVANTAGES: readonly PromotionCard[] = [
  {
    title: "短视频了解房源",
    description:
      "通过更直观的内容了解采光、动线与空间，先建立判断，再安排下一步。",
  },
  {
    title: "结合通勤与生活圈筛选",
    description:
      "不只看地址和面积，也把学校、通勤、配套与日常节奏放进选择里。",
  },
  {
    title: "整理与核验房源信息",
    description:
      "减少重复、过期和难以理解的信息，让重要条件更容易比较。",
  },
  {
    title: "按需求持续关注",
    description:
      "告诉我们预算、区域和入住计划，持续关注更贴近需求的房源机会。",
  },
] as const;

export const OFFICIAL_ACTIONS: readonly OfficialAction[] = [
  {
    label: "查看房源",
    href: PLATFORM_LINKS.home,
    description: "进入日宜房产平台",
    tone: "primary",
  },
  {
    label: "提交需求",
    href: PLATFORM_LINKS.submitDemand,
    description: "说明预算与找房计划",
    tone: "secondary",
  },
  {
    label: "微信咨询",
    href: PLATFORM_LINKS.wechatConsult,
    description: "与日宜顾问进一步沟通",
    tone: "quiet",
  },
] as const;

export function shouldShowArticleCta(
  frontmatter: Record<string, unknown>,
): boolean {
  return frontmatter.article === true;
}

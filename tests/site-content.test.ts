import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stringify } from "yaml";
import { describe, expect, it } from "vitest";

import {
  resolveLinkTarget,
  resolveSiteContent,
  validatePostCategoryReferences,
  type Category,
} from "../src/site-content.js";
import { loadSiteContent } from "../scripts/content/load-site.js";

const RENT_ID = "11111111-1111-4111-8111-111111111111";
const PURCHASE_ID = "22222222-2222-4222-8222-222222222222";

const enabledCategories: Category[] = [
  {
    id: RENT_ID,
    slug: "rent-guide",
    name: "租房指南",
    description: "日本租房费用、审查与签约流程。",
    enabled: true,
    order: 10,
  },
];
const disabledRentCategories: Category[] = enabledCategories.map(
  (category) => ({
    ...category,
    enabled: false,
  }),
);

const settings = {
  schemaVersion: 1,
  layoutPreset: "official-v1",
  siteName: "日宜房产",
  siteDescription:
    "日宜房产提供日本房产租赁、买卖与安居服务，并整理区域选择、流程费用和日常生活的实用内容。",
  logo: "",
  primaryColor: "#1f6658",
  secondaryColor: "#17352f",
};

const home = {
  hero: {
    title: "日宜房产",
    description: "日本找房，就上日宜。找房服务与实用内容，都在这里。",
    image: "",
    imageAlt: "",
    quickLinks: [
      {
        id: "rent",
        enabled: true,
        title: "租房指南",
        description: "理解费用、审查与签约流程",
        kind: "category",
        categoryId: RENT_ID,
        href: "",
        order: 10,
      },
      {
        id: "purchase",
        enabled: true,
        title: "买房指南",
        description: "整理购房、贷款与持有成本",
        kind: "category",
        categoryId: PURCHASE_ID,
        href: "",
        order: 20,
      },
      {
        id: "listings",
        enabled: true,
        title: "查看日宜房源",
        description: "返回日宜房产平台寻找合适房源",
        kind: "external",
        categoryId: "",
        href: "https://riyihome.com",
        order: 30,
      },
    ],
  },
  appDownload: {
    enabled: true,
    eyebrow: "随时随地找房",
    title: "下载日宜找房 App",
    description:
      "浏览日本房源、短视频看房和区域信息，也可以直接使用微信小程序。",
    appStoreUrl: "https://apps.apple.com/jp/app/example",
    googlePlayUrl: "https://play.google.com/store/apps/details?id=example",
    wechatMiniProgram: "#小程序://日宜找房/eFzVt03INd0YNma",
  },
  services: {
    eyebrow: "从找房到安居",
    title: "看懂选择，再决定下一步",
    description: "日宜把日本房产服务与实用内容放在同一个官网里。",
    items: [
      {
        id: "rent",
        enabled: true,
        title: "日本租房",
        description: "从初期费用、入住审查到签约流程。",
        image: "",
        imageAlt: "",
        linkLabel: "阅读租房指南",
        kind: "category",
        categoryId: RENT_ID,
        href: "",
        order: 10,
      },
      {
        id: "purchase",
        enabled: true,
        title: "日本买房",
        description: "围绕区域、预算、贷款与持有成本。",
        image: "",
        imageAlt: "",
        linkLabel: "阅读买房指南",
        kind: "category",
        categoryId: PURCHASE_ID,
        href: "",
        order: 20,
      },
      {
        id: "study",
        enabled: true,
        title: "留学安居",
        description: "结合学校、通勤与日常生活需求。",
        image: "",
        imageAlt: "",
        linkLabel: "了解日本生活",
        kind: "internal",
        categoryId: "",
        href: "/japan-life/",
        order: 30,
      },
    ],
  },
  advantages: {
    enabled: true,
    eyebrow: "日宜的方式",
    title: "让找房信息更直观、更清楚",
    description: "把空间、位置和真实生活条件一起说明。",
    items: [
      {
        id: "video",
        enabled: true,
        title: "短视频了解房源",
        description: "直观了解空间。",
        order: 10,
      },
      {
        id: "commute",
        enabled: true,
        title: "结合通勤筛选",
        description: "把通勤放进选择。",
        order: 20,
      },
      {
        id: "verify",
        enabled: true,
        title: "核验房源信息",
        description: "让条件容易比较。",
        order: 30,
      },
      {
        id: "follow",
        enabled: true,
        title: "按需求持续关注",
        description: "持续关注房源。",
        order: 40,
      },
    ],
  },
  actions: {
    eyebrow: "准备开始找房？",
    title: "把你的计划告诉日宜",
    description: "先浏览房源，或直接说明预算、区域与入住时间。",
    items: [
      {
        id: "listings",
        enabled: true,
        label: "查看房源",
        description: "进入日宜房产平台",
        tone: "primary",
        href: "https://riyihome.com",
        order: 10,
      },
      {
        id: "demand",
        enabled: true,
        label: "提交需求",
        description: "说明预算与找房计划",
        tone: "secondary",
        href: "https://riyihome.com/demand",
        order: 20,
      },
      {
        id: "wechat",
        enabled: true,
        label: "微信咨询",
        description: "与日宜顾问沟通",
        tone: "quiet",
        href: "https://work.weixin.qq.com/example",
        order: 30,
      },
    ],
  },
  articles: {
    eyebrow: "日宜内容",
    title: "最新房产资讯",
    description: "持续整理日本租房、买房与生活中的实用信息。",
  },
};

const navigation = {
  home: { label: "首页", order: 0 },
  items: [
    {
      id: "71000000-0000-4000-8000-000000000001",
      label: "租房指南",
      kind: "category",
      categoryId: RENT_ID,
      href: "",
      visible: true,
      newWindow: false,
      order: 10,
    },
  ],
};

async function siteFixture(options: { disableRent?: boolean } = {}) {
  const root = await mkdtemp(join(tmpdir(), "riyi-site-content-"));
  await mkdir(join(root, "content/site"), { recursive: true });
  await mkdir(join(root, "content/categories"), { recursive: true });
  await writeFile(join(root, "content/site/settings.yml"), stringify(settings));
  await writeFile(join(root, "content/site/home.yml"), stringify(home));
  await writeFile(
    join(root, "content/site/navigation.yml"),
    stringify(navigation),
  );
  await writeFile(
    join(root, "content/categories/rent.yml"),
    stringify({
      ...enabledCategories[0],
      enabled: !options.disableRent,
    }),
  );
  await writeFile(
    join(root, "content/categories/purchase.yml"),
    stringify({
      id: PURCHASE_ID,
      name: "买房指南",
      description: "日本买房预算、贷款、交易和持有成本。",
      enabled: true,
      order: 20,
    }),
  );
  return root;
}

describe("site content", () => {
  it("loads categories with stored slugs and UUID slug fallbacks", async () => {
    const root = await siteFixture();
    const content = loadSiteContent(join(root, "content"));
    expect(content.categories.map(({ slug }) => slug)).toEqual([
      "rent-guide",
      PURCHASE_ID,
    ]);
  });

  it("resolves category links and orders only visible items", async () => {
    const content = resolveSiteContent(
      loadSiteContent(join(await siteFixture(), "content")),
    );
    expect(
      content.navigation.items.map(({ label, href }) => ({ label, href })),
    ).toEqual([
      { label: "首页", href: "/" },
      { label: "租房指南", href: "/category/rent-guide/" },
    ]);
  });

  it("rejects navigation that references a disabled category", async () => {
    const source = loadSiteContent(
      join(await siteFixture({ disableRent: true }), "content"),
    );
    expect(() => resolveSiteContent(source)).toThrow(
      `content/site/navigation.yml: category ${RENT_ID} is disabled`,
    );
  });

  it("keeps protected Home while ordinary navigation changes and reorders", async () => {
    const source = loadSiteContent(join(await siteFixture(), "content"));
    source.navigation.home = { label: "开始", order: 20 };
    source.navigation.items = [
      {
        id: "71000000-0000-4000-8000-000000000009",
        label: "最新指南",
        kind: "internal",
        categoryId: "",
        href: "/about/",
        visible: true,
        newWindow: false,
        order: 10,
      },
    ];
    expect(resolveSiteContent(source).navigation.items).toMatchObject([
      { id: "71000000-0000-4000-8000-000000000009", label: "最新指南" },
      { id: "home", label: "开始", href: "/" },
    ]);
  });

  it("rejects a category file missing while still used by a post", () => {
    expect(() =>
      validatePostCategoryReferences(
        ["99999999-9999-4999-8999-999999999999"],
        enabledCategories,
        "content/posts/example.md",
      ),
    ).toThrow(
      "content/posts/example.md: missing category 99999999-9999-4999-8999-999999999999",
    );
  });

  it("rejects a disabled category still used by a post", () => {
    expect(() =>
      validatePostCategoryReferences(
        [RENT_ID],
        disabledRentCategories,
        "content/posts/example.md",
      ),
    ).toThrow(
      `content/posts/example.md: disabled category ${RENT_ID}; choose an enabled category`,
    );
  });

  it("resolves valid internal and external targets", () => {
    expect(
      resolveLinkTarget(
        { kind: "internal", categoryId: "", href: "/about/" },
        enabledCategories,
        "content/site/home.yml",
      ),
    ).toEqual({ href: "/about/", external: false });
    expect(
      resolveLinkTarget(
        { kind: "external", categoryId: "", href: "https://riyihome.com" },
        enabledCategories,
        "content/site/home.yml",
      ),
    ).toEqual({ href: "https://riyihome.com", external: true });
  });

  it("rejects invalid target protocols with the source path", () => {
    expect(() =>
      resolveLinkTarget(
        { kind: "external", categoryId: "", href: "javascript:alert(1)" },
        enabledCategories,
        "content/site/home.yml",
      ),
    ).toThrow("content/site/home.yml: invalid external target");
    expect(() =>
      resolveLinkTarget(
        { kind: "internal", categoryId: "", href: "//example.com" },
        enabledCategories,
        "content/site/home.yml",
      ),
    ).toThrow("content/site/home.yml: invalid internal target");
  });

  it("rejects backslashes and control characters in internal targets", () => {
    expect(() =>
      resolveLinkTarget(
        { kind: "internal", categoryId: "", href: "/\\evil.example/path" },
        enabledCategories,
        "content/site/home.yml",
      ),
    ).toThrow("content/site/home.yml: invalid internal target");
    expect(() =>
      resolveLinkTarget(
        { kind: "internal", categoryId: "", href: "/about/\u0000" },
        enabledCategories,
        "content/site/home.yml",
      ),
    ).toThrow("content/site/home.yml: invalid internal target");
    expect(() =>
      resolveLinkTarget(
        { kind: "internal", categoryId: "", href: "/about/\u0085" },
        enabledCategories,
        "content/site/home.yml",
      ),
    ).toThrow("content/site/home.yml: invalid internal target");
  });

  it("rejects duplicate category UUIDs, slugs, and order values", async () => {
    const root = await siteFixture();
    const categoriesDir = join(root, "content/categories");
    await writeFile(
      join(categoriesDir, "duplicate-id.yml"),
      stringify({ ...enabledCategories[0], slug: "different", order: 30 }),
    );
    expect(() => loadSiteContent(join(root, "content"))).toThrow(
      "duplicate category id",
    );

    const secondRoot = await siteFixture();
    await writeFile(
      join(secondRoot, "content/categories/duplicate-slug.yml"),
      stringify({
        ...enabledCategories[0],
        id: "33333333-3333-4333-8333-333333333333",
        order: 30,
      }),
    );
    expect(() => loadSiteContent(join(secondRoot, "content"))).toThrow(
      "duplicate category slug",
    );

    const thirdRoot = await siteFixture();
    await writeFile(
      join(thirdRoot, "content/categories/duplicate-order.yml"),
      stringify({
        ...enabledCategories[0],
        id: "33333333-3333-4333-8333-333333333333",
        slug: "life",
        order: 20,
      }),
    );
    expect(() => loadSiteContent(join(thirdRoot, "content"))).toThrow(
      "duplicate category order",
    );
  });

  it("rejects duplicate navigation IDs and order values including Home", async () => {
    const source = loadSiteContent(join(await siteFixture(), "content"));
    source.navigation.items.push({ ...source.navigation.items[0]!, order: 20 });
    expect(() => resolveSiteContent(source)).toThrow(
      "content/site/navigation.yml: duplicate item id",
    );

    const orderSource = loadSiteContent(join(await siteFixture(), "content"));
    orderSource.navigation.items.push({
      ...orderSource.navigation.items[0]!,
      id: "71000000-0000-4000-8000-000000000002",
    });
    expect(() => resolveSiteContent(orderSource)).toThrow(
      "content/site/navigation.yml: duplicate item order",
    );

    const homeOrderSource = loadSiteContent(
      join(await siteFixture(), "content"),
    );
    homeOrderSource.navigation.home.order = 10;
    expect(() => resolveSiteContent(homeOrderSource)).toThrow(
      "content/site/navigation.yml: duplicate item order",
    );
  });

  it("rejects new windows for category and internal navigation", async () => {
    const categorySource = loadSiteContent(
      join(await siteFixture(), "content"),
    );
    categorySource.navigation.items[0]!.newWindow = true;
    expect(() => resolveSiteContent(categorySource)).toThrow(
      "content/site/navigation.yml: newWindow is only valid for external items",
    );
  });

  it("requires alternative text for configured hero and service images", async () => {
    const heroSource = loadSiteContent(join(await siteFixture(), "content"));
    heroSource.home.hero.image = "/site-media/hero.webp";
    expect(() => resolveSiteContent(heroSource)).toThrow(
      "content/site/home.yml: hero imageAlt is required when image is set",
    );

    const serviceSource = loadSiteContent(join(await siteFixture(), "content"));
    serviceSource.home.services.items[0]!.image = "/site-media/rent.webp";
    expect(() => resolveSiteContent(serviceSource)).toThrow(
      "content/site/home.yml: service rent imageAlt is required when image is set",
    );
  });

  it("requires at least one enabled action", async () => {
    const source = loadSiteContent(join(await siteFixture(), "content"));
    source.home.actions.items.forEach((action) => {
      action.enabled = false;
    });
    expect(() => resolveSiteContent(source)).toThrow(
      "content/site/home.yml: at least one action must be enabled",
    );
  });

  it("prefixes singleton schema errors with their source path", async () => {
    const root = await siteFixture();
    await writeFile(
      join(root, "content/site/settings.yml"),
      "schemaVersion: 2\n",
    );
    expect(() => loadSiteContent(join(root, "content"))).toThrow(
      "content/site/settings.yml:",
    );
  });

  it("rejects unknown settings fields", async () => {
    const root = await siteFixture();
    await writeFile(
      join(root, "content/site/settings.yml"),
      stringify({ ...settings, customCss: "body { display: none; }" }),
    );
    expect(() => loadSiteContent(join(root, "content"))).toThrow(
      "content/site/settings.yml:",
    );
  });

  it("rejects unknown nested home fields", async () => {
    const root = await siteFixture();
    await writeFile(
      join(root, "content/site/home.yml"),
      stringify({
        ...home,
        hero: { ...home.hero, fontFamily: "serif" },
      }),
    );
    expect(() => loadSiteContent(join(root, "content"))).toThrow(
      "content/site/home.yml:",
    );
  });
});

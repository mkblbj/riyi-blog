# Customer-Editable Official Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing Pages CMS setup so a non-technical customer can safely manage official-site content, images, brand colors, navigation, and article categories without changing the VitePress/Teek/GitHub/Aliyun architecture.

**Architecture:** Keep Pages CMS as the only editing layer and store all editable values in versioned YAML/Markdown files. A typed content pipeline validates relationships, optimizes article and official-site media, resolves category IDs into display labels, and emits a generated site manifest; VitePress and Teek consume that manifest while fixed Vue components retain control of layout and accessibility. GitHub Actions remains the only production gate, so invalid content never reaches the Aliyun upload job.

**Tech Stack:** Node.js 22.x, pnpm 10.34.5, TypeScript 6, Zod 4, YAML 2, Sharp 0.35, VitePress 1.6.4, Vue 3.5, vitepress-theme-teek 1.6.2, Vitest 3, Pages CMS, GitHub Actions, Aliyun OSS/CDN.

## Global Constraints

- Keep VitePress, vitepress-theme-teek, Pages CMS, Markdown content, GitHub Actions, and Aliyun OSS/CDN; add no database, UniCloud dependency, or second CMS.
- First release uses fixed layout preset `official-v1`; do not add arbitrary blocks, HTML, Vue, CSS, fonts, or free-form per-section styling to CMS fields.
- Expose exactly two global color inputs: primary brand color and secondary brand color.
- Keep system Home navigation undeletable; allow ordinary navigation items to be added, edited, hidden, reordered, and removed.
- Allow categories to be created, renamed, reordered, enabled, and disabled; set `operations.delete: false` for the category collection.
- Save to `main` and publish automatically only after validation, tests, build verification, and deploy gates pass.
- Preserve article permalinks `/posts/<uuid>/`; category labels may change without rewriting article URLs.
- Keep original uploaded JPG, JPEG, PNG, and WebP files; reject files over 10 MiB and publish optimized hashed WebP assets.
- Seed editable YAML with the current production copy, links, navigation, and colors so the default build remains visually and functionally equivalent.
- Do not commit secrets, `.env*`, local build output, or generated manifests.

---

## File Structure

### New tracked content

- `content/site/settings.yml` — site identity, logo, two brand colors, schema version, layout preset.
- `content/site/home.yml` — fixed homepage modules, copy, optional images, targets, visibility, and order.
- `content/site/navigation.yml` — protected Home item plus editable navigation list.
- `content/categories/<uuid>.yml` — one stable category record per file.
- `content/site-media/.gitkeep` — keeps the initially empty customer-managed official-site image directory in Git.

### New source and pipeline units

- `src/site-content.ts` — Zod schemas, public types, link resolution, ordering, and relationship validation; no filesystem access.
- `src/theme-colors.ts` — hex parsing, contrast calculations, derived light/dark theme tokens.
- `scripts/content/load-site.ts` — read YAML source files and derive a stable category slug from stored slug or UUID.
- `scripts/content/site-images.ts` — validate and rewrite `/site-media/` references with the optimized manifest.
- `scripts/content/render-category.ts` — generate stable category landing Markdown under `/category/<slug>/`.
- `site/.vitepress/site-manifest.ts` — synchronously load `.generated/site.json`, with a source-content fallback for direct config imports.
- `site/.vitepress/theme/use-riyi-content.ts` — typed access to serialized `themeConfig.riyi` content.

### Generated output

- `.generated/site.json` — resolved official-site content, categories, navigation, and theme tokens.
- `site/public/site-media/` — optimized official-site WebP assets.
- `site/category/` — generated stable category landing pages.

### Existing files that change

- `.pages.yml`
- `.gitignore`
- `content/posts/79f45644-f457-4b94-a288-44780fd8f199.md`
- `src/site.ts`
- `src/navigation.ts`
- `src/official-site.ts`
- `src/seo.ts`
- `scripts/content/schema.ts`
- `scripts/content/load-posts.ts`
- `scripts/content/images.ts`
- `scripts/content/prepare.ts`
- `scripts/content/render-post.ts`
- `scripts/rss.ts`
- `scripts/verify-build.ts`
- `scripts/deploy/run.ts`
- `site/.vitepress/config.ts`
- `site/.vitepress/teek-config.ts`
- `site/.vitepress/theme/components/AppDownload.vue`
- `site/.vitepress/theme/components/ArticlePlatformCta.vue`
- `site/.vitepress/theme/components/HomePromotion.vue`
- `site/.vitepress/theme/components/LatestArticlesHeading.vue`
- `site/.vitepress/theme/custom.css`
- `.github/workflows/deploy.yml`
- `README.md`
- `docs/customer/publishing.md`
- `docs/operations/acceptance.md`

---

### Task 1: Expose official-site content in Pages CMS

**Files:**
- Create: `content/site/settings.yml`
- Create: `content/site/home.yml`
- Create: `content/site/navigation.yml`
- Create: `content/site-media/.gitkeep`
- Create: `content/categories/11111111-1111-4111-8111-111111111111.yml`
- Create: `content/categories/22222222-2222-4222-8222-222222222222.yml`
- Create: `content/categories/33333333-3333-4333-8333-333333333333.yml`
- Create: `content/categories/44444444-4444-4444-8444-444444444444.yml`
- Create: `content/categories/55555555-5555-4555-8555-555555555555.yml`
- Create: `content/categories/66666666-6666-4666-8666-666666666666.yml`
- Modify: `.pages.yml`
- Test: `tests/pages-cms-config.test.ts`

**Interfaces:**
- Produces: Pages CMS collections named `site_settings`, `home_content`, `navigation`, and `categories`, plus media source `site_images`.
- Produces: article `categories` field as a reference to `categories`, saving `{fields.id}` and displaying `{fields.name}`.
- Produces: category UUIDs used by Tasks 2 and 4.
- Pages CMS groups can contain only content entries, so the four structured editors live under “官网管理” while the named `site_images` source appears in the CMS media area with label “官网图片”. It still backs every official-site image picker and requires no second admin surface.

- [ ] **Step 1: Write the failing Pages CMS contract tests**

Replace the fixed-category assertion in `tests/pages-cms-config.test.ts` and add tests for the official-site group:

```ts
it("exposes protected official-site settings and media", async () => {
  const config = parse(await readFile(".pages.yml", "utf8"));
  expect(config.media).toContainEqual(
    expect.objectContaining({
      name: "site_images",
      label: "官网图片",
      input: "content/site-media",
      output: "/site-media",
      rename: "random",
      extensions: ["jpg", "jpeg", "png", "webp"],
    }),
  );

  const official = config.content.find(
    (entry: { name: string }) => entry.name === "official_site",
  );
  expect(official).toMatchObject({ type: "group", label: "官网管理" });
  expect(official.items.map((item: { name: string }) => item.name)).toEqual([
    "site_settings",
    "home_content",
    "navigation",
    "categories",
  ]);

  for (const name of ["site_settings", "home_content", "navigation"]) {
    const entry = official.items.find((item: { name: string }) => item.name === name);
    expect(entry.operations).toMatchObject({ delete: false, rename: false });
  }
});

it("uses safe dynamic category references without hard deletion", async () => {
  const config = parse(await readFile(".pages.yml", "utf8"));
  const official = config.content.find(
    (entry: { name: string }) => entry.name === "official_site",
  );
  const categories = official.items.find(
    (entry: { name: string }) => entry.name === "categories",
  );
  expect(categories).toMatchObject({
    type: "collection",
    path: "content/categories",
    format: "yaml",
    filename: { template: "{id}.yml", field: false },
    operations: { create: true, rename: false, delete: false },
  });

  const posts = config.content.find(
    (entry: { name: string }) => entry.name === "posts",
  );
  const categoryField = posts.fields.find(
    (field: { name: string }) => field.name === "categories",
  );
  expect(categoryField).toMatchObject({
    type: "reference",
    options: {
      collection: "categories",
      multiple: true,
      min: 1,
      max: 1,
      value: "{fields.id}",
      label: "{fields.name}",
    },
  });
});
```

- [ ] **Step 2: Run the focused test and verify the red state**

Run: `pnpm exec vitest run tests/pages-cms-config.test.ts`

Expected: FAIL because `official_site`, `site_images`, and the dynamic category reference do not exist.

- [ ] **Step 3: Seed the approved current content files**

Create `content/site/settings.yml` with the current identity and colors:

```yaml
schemaVersion: 1
layoutPreset: official-v1
siteName: 日宜房产
siteDescription: 日宜房产提供日本房产租赁、买卖与安居服务，并整理区域选择、流程费用和日常生活的实用内容。
logo: ""
primaryColor: "#1f6658"
secondaryColor: "#17352f"
```

Create `content/site/navigation.yml` with a protected Home object and the current ordinary entries. Category items store the seeded UUIDs, not Chinese labels:

```yaml
home:
  label: 首页
  order: 0
items:
  - id: 71000000-0000-4000-8000-000000000001
    label: 租房指南
    kind: category
    categoryId: 11111111-1111-4111-8111-111111111111
    href: ""
    visible: true
    newWindow: false
    order: 10
  - id: 71000000-0000-4000-8000-000000000002
    label: 买房指南
    kind: category
    categoryId: 22222222-2222-4222-8222-222222222222
    href: ""
    visible: true
    newWindow: false
    order: 20
  - id: 71000000-0000-4000-8000-000000000003
    label: 日本生活
    kind: category
    categoryId: 33333333-3333-4333-8333-333333333333
    href: ""
    visible: true
    newWindow: false
    order: 30
  - id: 71000000-0000-4000-8000-000000000004
    label: 区域介绍
    kind: category
    categoryId: 44444444-4444-4444-8444-444444444444
    href: ""
    visible: true
    newWindow: false
    order: 40
  - id: 71000000-0000-4000-8000-000000000005
    label: 关于日宜
    kind: internal
    categoryId: ""
    href: /about/
    visible: true
    newWindow: false
    order: 50
  - id: 71000000-0000-4000-8000-000000000006
    label: 查看房源
    kind: external
    categoryId: ""
    href: https://riyihome.com
    visible: true
    newWindow: true
    order: 60
```

Create six category YAML files with these exact values:

| UUID | slug | name | description | order |
| --- | --- | --- | --- | ---: |
| `11111111-1111-4111-8111-111111111111` | `rent-guide` | 租房指南 | 日本租房费用、审查与签约流程。 | 10 |
| `22222222-2222-4222-8222-222222222222` | `purchase-guide` | 买房指南 | 日本买房预算、贷款、交易和持有成本。 | 20 |
| `33333333-3333-4333-8333-333333333333` | `japan-life` | 日本生活 | 在日本安居所需的生活、通勤与手续信息。 | 30 |
| `44444444-4444-4444-8444-444444444444` | `area-guide` | 区域介绍 | 日本各地区交通、配套与居住特点。 | 40 |
| `55555555-5555-4555-8555-555555555555` | `property-policy` | 房产政策 | 日本房产相关政策与制度变化。 | 50 |
| `66666666-6666-4666-8666-666666666666` | `company-news` | 公司动态 | 日宜房产的服务、产品与公司动态。 | 60 |

Set `enabled: true` in every file. Use this exact YAML shape:

```yaml
id: 11111111-1111-4111-8111-111111111111
slug: rent-guide
name: 租房指南
description: 日本租房费用、审查与签约流程。
enabled: true
order: 10
```

Create `content/site/home.yml` using the current production copy. Use exactly these top-level keys and fixed cardinalities:

```yaml
hero:
  title: 日宜房产
  description: 日本找房，就上日宜。找房服务与实用内容，都在这里。
  image: ""
  imageAlt: ""
  quickLinks:
    - { id: rent, enabled: true, title: 租房指南, description: 理解费用、审查与签约流程, kind: category, categoryId: 11111111-1111-4111-8111-111111111111, href: "", order: 10 }
    - { id: purchase, enabled: true, title: 买房指南, description: 整理购房、贷款与持有成本, kind: category, categoryId: 22222222-2222-4222-8222-222222222222, href: "", order: 20 }
    - { id: listings, enabled: true, title: 查看日宜房源, description: 返回日宜房产平台寻找合适房源, kind: external, categoryId: "", href: https://riyihome.com, order: 30 }
appDownload:
  enabled: true
  eyebrow: 随时随地找房
  title: 下载日宜找房 App
  description: 浏览日本房源、短视频看房和区域信息，也可以直接使用微信小程序。
  appStoreUrl: https://apps.apple.com/jp/app/%E6%97%A5%E5%AE%9C%E6%89%BE%E6%88%BF/id6756088611
  googlePlayUrl: https://play.google.com/store/apps/details?id=com.rykj.riyizhaofang
  wechatMiniProgram: "#小程序://日宜找房/eFzVt03INd0YNma"
services:
  eyebrow: 从找房到安居
  title: 看懂选择，再决定下一步
  description: 日宜把日本房产服务与实用内容放在同一个官网里。你可以先了解流程、区域与生活条件，也可以直接开始找房。
  items:
    - { id: rent, enabled: true, title: 日本租房, description: 从初期费用、入住审查到签约流程，把容易忽略的细节提前说明。, image: "", imageAlt: "", linkLabel: 阅读租房指南, kind: category, categoryId: 11111111-1111-4111-8111-111111111111, href: "", order: 10 }
    - { id: purchase, enabled: true, title: 日本买房, description: 围绕区域、预算、贷款与持有成本，帮助你建立更完整的判断。, image: "", imageAlt: "", linkLabel: 阅读买房指南, kind: category, categoryId: 22222222-2222-4222-8222-222222222222, href: "", order: 20 }
    - { id: study, enabled: true, title: 留学安居, description: 结合学校、通勤与日常生活需求，理解房子之外真正影响居住的条件。, image: "", imageAlt: "", linkLabel: 了解日本生活, kind: category, categoryId: 33333333-3333-4333-8333-333333333333, href: "", order: 30 }
advantages:
  enabled: true
  eyebrow: 日宜的方式
  title: 让找房信息更直观、更清楚
  description: 房子不是一串参数。我们希望把空间、位置和真实生活条件一起说明，降低比较与沟通成本。
  items:
    - { id: video, enabled: true, title: 短视频了解房源, description: 通过更直观的内容了解采光、动线与空间，先建立判断，再安排下一步。, order: 10 }
    - { id: commute, enabled: true, title: 结合通勤与生活圈筛选, description: 不只看地址和面积，也把学校、通勤、配套与日常节奏放进选择里。, order: 20 }
    - { id: verify, enabled: true, title: 整理与核验房源信息, description: 减少重复、过期和难以理解的信息，让重要条件更容易比较。, order: 30 }
    - { id: follow, enabled: true, title: 按需求持续关注, description: 告诉我们预算、区域和入住计划，持续关注更贴近需求的房源机会。, order: 40 }
actions:
  eyebrow: 准备开始找房？
  title: 把你的计划告诉日宜
  description: 先浏览房源，或直接说明预算、区域与入住时间。
  items:
    - { id: listings, enabled: true, label: 查看房源, description: 进入日宜房产平台, tone: primary, href: https://riyihome.com, order: 10 }
    - { id: demand, enabled: true, label: 提交需求, description: 说明预算与找房计划, tone: secondary, href: "https://riyihome.com/index.html#/pages/project/advisory", order: 20 }
    - { id: wechat, enabled: true, label: 微信咨询, description: 与日宜顾问进一步沟通, tone: quiet, href: https://work.weixin.qq.com/kfid/kfcc5d6c8170e5733d0, order: 30 }
articles:
  eyebrow: 日宜内容
  title: 最新房产资讯
  description: 持续整理日本租房、买房、区域选择与日常生活中的实用信息。
```

- [ ] **Step 4: Configure `.pages.yml` with exact protected entries**

Add `site_images`, wrap the four official-site entries in `type: group`, set the three singleton files to `operations: { create: false, rename: false, delete: false }`, and set category operations to `{ create: true, rename: false, delete: false }`. Define UUID fields with `options: { editable: false, generate: false }`, use `type: image` with `media: site_images`, use list bounds `min: 3, max: 3` for quick links/services/actions and `min: 4, max: 4` for advantages, and give color strings this pattern:

```yaml
pattern:
  regex: "^#[0-9A-Fa-f]{6}$"
  message: 请输入六位颜色，例如 #1f6658
```

For `categories`, use `filename: { template: "{id}.yml", field: false }`, hide the optional `slug` field, and keep `id` read-only. For article `categories`, use the reference contract asserted in Step 1. Pages CMS references cannot filter entries by `enabled`; therefore add field help text instructing the customer to select only enabled categories, and rely on the build validation in Task 2 to block a disabled selection with a file-specific error before deployment. The prior production version remains online while the customer migrates the article to an enabled category.

- [ ] **Step 5: Run the focused and full configuration tests**

Run: `pnpm exec vitest run tests/pages-cms-config.test.ts`

Expected: PASS.

Run: `pnpm test`

Expected: PASS because the public post still contains the old Chinese category until Task 4 migrates the content pipeline.

- [ ] **Step 6: Commit the CMS surface**

```bash
git add .pages.yml content/site content/site-media content/categories tests/pages-cms-config.test.ts
git commit -m "feat: expose official site content in Pages CMS"
```

---

### Task 2: Add typed site-content loading and relationship validation

**Files:**
- Create: `src/site-content.ts`
- Create: `scripts/content/load-site.ts`
- Test: `tests/site-content.test.ts`

**Interfaces:**
- Produces: `SiteSourceContent`, `ResolvedSiteContent`, `Category`, `ResolvedHomeContent`, `ResolvedNavigationItem`.
- Produces: `loadSiteContent(contentDir: string): SiteSourceContent`.
- Produces: `resolveSiteContent(source: SiteSourceContent): ResolvedSiteContent`.
- Produces: `resolveLinkTarget(target: LinkTarget, categories: readonly Category[], sourcePath: string): { href: string; external: boolean }`.
- Produces: `validatePostCategoryReferences(categoryIds: readonly string[], categories: readonly Category[], sourcePath: string): void`.

- [ ] **Step 1: Write failing schema and relationship tests**

Create `tests/site-content.test.ts` with temporary YAML fixtures and these behaviors:

```ts
const enabledCategories: Category[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "rent-guide",
    name: "租房指南",
    description: "日本租房费用、审查与签约流程。",
    enabled: true,
    order: 10,
  },
];
const disabledRentCategories: Category[] = enabledCategories.map((category) => ({
  ...category,
  enabled: false,
}));

it("loads categories with stored slugs and UUID slug fallbacks", async () => {
  const root = await siteFixture();
  const content = loadSiteContent(join(root, "content"));
  expect(content.categories.map(({ slug }) => slug)).toEqual([
    "rent-guide",
    "22222222-2222-4222-8222-222222222222",
  ]);
});

it("resolves category links and orders only visible items", async () => {
  const content = resolveSiteContent(loadSiteContent(join(await siteFixture(), "content")));
  expect(content.navigation.items.map(({ label, href }) => ({ label, href }))).toEqual([
    { label: "首页", href: "/" },
    { label: "租房指南", href: "/category/rent-guide/" },
  ]);
});

it("rejects navigation that references a disabled category", async () => {
  const source = loadSiteContent(join(await siteFixture({ disableRent: true }), "content"));
  expect(() => resolveSiteContent(source)).toThrow(
    "content/site/navigation.yml: category 11111111-1111-4111-8111-111111111111 is disabled",
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
  ).toThrow("content/posts/example.md: missing category 99999999-9999-4999-8999-999999999999");
});

it("rejects a disabled category still used by a post", () => {
  expect(() =>
    validatePostCategoryReferences(
      ["11111111-1111-4111-8111-111111111111"],
      disabledRentCategories,
      "content/posts/example.md",
    ),
  ).toThrow(
    "content/posts/example.md: disabled category 11111111-1111-4111-8111-111111111111; choose an enabled category",
  );
});
```

The fixture must write valid `settings.yml`, `home.yml`, `navigation.yml`, and two category files. The second category omits `slug` so the UUID fallback is exercised.

- [ ] **Step 2: Run the tests and verify the red state**

Run: `pnpm exec vitest run tests/site-content.test.ts`

Expected: FAIL because `src/site-content.ts` and `scripts/content/load-site.ts` do not exist.

- [ ] **Step 3: Implement the pure schemas and exact shared types**

Create `src/site-content.ts` with these contracts:

```ts
import { z } from "zod";

const uuid = z.uuid();
const shortText = z.string().trim().min(1).max(120);
const longText = z.string().trim().min(1).max(500);
const optionalSiteImage = z.union([
  z.literal(""),
  z.string().regex(/^\/site-media\/[^\s]+$/),
]);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const LinkTargetSchema = z.object({
  kind: z.enum(["category", "internal", "external"]),
  categoryId: z.union([z.literal(""), uuid]).default(""),
  href: z.string().trim().default(""),
});

export const CategorySourceSchema = z.object({
  id: uuid,
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  name: shortText,
  description: z.string().trim().max(320).default(""),
  enabled: z.boolean(),
  order: z.number().int().nonnegative(),
});

export const SiteSettingsSchema = z.object({
  schemaVersion: z.literal(1),
  layoutPreset: z.literal("official-v1"),
  siteName: shortText,
  siteDescription: z.string().trim().min(20).max(320),
  logo: optionalSiteImage,
  primaryColor: hexColor,
  secondaryColor: hexColor,
});
```

Define reusable item schemas with these exact stored fields:

```ts
const ordered = { enabled: z.boolean(), order: z.number().int().nonnegative() };
const target = LinkTargetSchema.shape;

const QuickLinkSchema = z.object({
  id: z.enum(["rent", "purchase", "listings"]),
  ...ordered,
  title: shortText,
  description: longText,
  ...target,
});

const ServiceSchema = z.object({
  id: z.enum(["rent", "purchase", "study"]),
  ...ordered,
  title: shortText,
  description: longText,
  image: optionalSiteImage,
  imageAlt: z.string().trim().max(160).default(""),
  linkLabel: shortText,
  ...target,
});

const AdvantageSchema = z.object({
  id: z.enum(["video", "commute", "verify", "follow"]),
  ...ordered,
  title: shortText,
  description: longText,
});

const ActionSchema = z.object({
  id: z.enum(["listings", "demand", "wechat"]),
  ...ordered,
  label: shortText,
  description: longText,
  tone: z.enum(["primary", "secondary", "quiet"]),
  href: z.url().refine((value) => new URL(value).protocol === "https:"),
});
```

Define `HomeContentSchema` with `hero.quickLinks.length(3)`, `services.items.length(3)`, `advantages.items.length(4)`, and `actions.items.length(3)`. Validate App Store and Google Play as HTTPS URLs and validate the mini-program token with `/^#小程序:\/\/[^/\s]+\/[A-Za-z0-9]+$/`. Define `NavigationSchema` as:

```ts
export const NavigationSchema = z.object({
  home: z.object({
    label: shortText,
    order: z.number().int().nonnegative(),
  }),
  items: z.array(
    z.object({
      id: uuid,
      label: shortText,
      kind: z.enum(["category", "internal", "external"]),
      categoryId: z.union([z.literal(""), uuid]).default(""),
      href: z.string().trim().default(""),
      visible: z.boolean(),
      newWindow: z.boolean(),
      order: z.number().int().nonnegative(),
    }),
  ),
});
```

Export inferred source types and explicit resolved types. `Category.slug` is required after loading. `ResolvedNavigationItem` is `{ id: string, label, href, external, newWindow, order }`; the protected Home resolves to `{ id: "home", href: "/", external: false, newWindow: false }`, while ordinary IDs remain UUIDs. `ResolvedHomeContent` replaces each homepage link target with validated `href` and `external` properties and adds `external: true` to each HTTPS action. Export `ResolvedSiteContentSchema` as the Zod schema for `{ settings, home, navigation, categories }`, and infer `ResolvedSiteContent` from that schema so the generated manifest and VitePress runtime cannot drift from the resolved-content contract.

- [ ] **Step 4: Implement the filesystem loader and relationship checks**

Create `scripts/content/load-site.ts` using `readFileSync`, `readdirSync`, `yaml.parse`, and the schemas. Export:

```ts
export function loadSiteContent(contentDir: string): SiteSourceContent;
```

Read the three singleton files and all `*.yml` files from `content/categories`. Parse errors must be rethrown as `new Error(`${sourcePath}: ${message}`)`. Set `slug` to `parsed.slug ?? parsed.id`, reject duplicate UUIDs/slugs/order values, and sort categories by `order` then `name`.

In `resolveLinkTarget`, catch invalid URLs and enforce:

```ts
if (target.kind === "category") {
  return { href: `/category/${category.slug}/`, external: false };
}
if (target.kind === "internal" && /^\/(?!\/)/.test(target.href)) {
  return { href: target.href, external: false };
}
if (target.kind === "external" && isHttpsUrl(target.href)) {
  return { href: target.href, external: true };
}
throw new Error(`${sourcePath}: invalid ${target.kind} target`);
```

Always create the protected Home resolved item, combine it with ordinary items whose `visible === true`, and sort the combined list by `order` then `label`; this preserves Home while honoring its customer-editable order. Enforce at least one enabled action. Validate every category target against enabled categories. Resolve hero quick links and service targets to stored `href` plus an `external` boolean so Vue components never repeat target validation. Preserve `newWindow` only for external navigation; reject `newWindow: true` on internal and category items. Reject duplicate item IDs and order values, including an order collision with Home. If the hero or a service image is non-empty, require its matching non-empty `imageAlt`. `validatePostCategoryReferences` must reject both a missing category file and an existing category with `enabled: false`; this prevents an invalid save from reaching Aliyun even though Pages CMS cannot hide disabled reference entries.

- [ ] **Step 5: Run focused tests and type checking**

Run: `pnpm exec vitest run tests/site-content.test.ts`

Expected: PASS.

Run: `pnpm exec tsc --noEmit`

Expected: PASS.

- [ ] **Step 6: Commit the source-content contract**

```bash
git add src/site-content.ts scripts/content/load-site.ts tests/site-content.test.ts
git commit -m "feat: validate editable site content"
```

---

### Task 3: Derive safe brand-color tokens

**Files:**
- Create: `src/theme-colors.ts`
- Test: `tests/theme-colors.test.ts`

**Interfaces:**
- Consumes: `SiteSettings.primaryColor` and `SiteSettings.secondaryColor` from Task 2.
- Produces: `parseHexColor(value: string): Rgb`.
- Produces: `contrastRatio(left: string, right: string): number`.
- Produces: `createThemeTokens(primary: string, secondary: string): ThemeTokens`.
- Produces: `ThemeTokensSchema` for generated-manifest validation.

- [ ] **Step 1: Write failing color derivation tests**

Create `tests/theme-colors.test.ts`:

```ts
describe("brand theme colors", () => {
  it("derives stable light and dark tokens from two colors", () => {
    expect(createThemeTokens("#1f6658", "#17352f")).toMatchObject({
      primary: "#1f6658",
      secondary: "#17352f",
      onSecondary: "#ffffff",
    });
  });

  it("keeps generated text and links readable", () => {
    for (const [primary, secondary] of [
      ["#f6d365", "#fda085"],
      ["#2463eb", "#172554"],
      ["#9333ea", "#3b0764"],
    ]) {
      const tokens = createThemeTokens(primary, secondary);
      expect(contrastRatio(tokens.brandText, "#ffffff")).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(tokens.onSecondary, secondary)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(tokens.darkBrandText, "#202321")).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("rejects invalid hex colors with the field value", () => {
    expect(() => createThemeTokens("green", "#17352f")).toThrow(
      'invalid hex color "green"',
    );
  });
});
```

- [ ] **Step 2: Run the focused test and verify the red state**

Run: `pnpm exec vitest run tests/theme-colors.test.ts`

Expected: FAIL because the functions are not implemented.

- [ ] **Step 3: Implement deterministic WCAG-aware derivation**

Define this exact public interface:

```ts
export interface ThemeTokens {
  primary: string;
  secondary: string;
  brandText: string;
  brandHover: string;
  brandStrong: string;
  brandSoft: string;
  secondaryStrong: string;
  secondaryMuted: string;
  onSecondary: "#111111" | "#ffffff";
  darkBrandText: string;
  darkSecondary: string;
  darkSecondaryStrong: string;
  darkSecondaryMuted: string;
}
```

Export `ThemeTokensSchema` as a Zod object containing exactly the same thirteen properties, with `onSecondary` restricted to `#111111` or `#ffffff`.

Implement sRGB relative luminance and `(lighter + 0.05) / (darker + 0.05)`. Implement `mix(left, right, amount)` so `amount` is the `right` color's fraction, rounded per RGB channel. Derive the exact tokens as follows:

```ts
brandHover = mix(primary, "#000000", 0.18);
brandStrong = mix(primary, "#000000", 0.34);
brandSoft = mix("#ffffff", primary, 0.14);
secondaryStrong = mix(secondary, "#000000", 0.24);
secondaryMuted = mix("#ffffff", secondary, 0.12);
darkSecondary = mix(secondary, "#ffffff", 0.18);
darkSecondaryStrong = mix(secondary, "#ffffff", 0.34);
darkSecondaryMuted = mix("#202321", secondary, 0.14);
```

`brandText` must repeatedly mix primary with `#000000` in 8% increments until it reaches 4.5 against white. `darkBrandText` must repeatedly mix primary with `#ffffff` in 8% increments until it reaches 4.5 against `#202321`. Choose `onSecondary` from `#111111` and `#ffffff` by the higher contrast against `secondary`, and assert the chosen value reaches 4.5.

- [ ] **Step 4: Run focused tests and type checking**

Run: `pnpm exec vitest run tests/theme-colors.test.ts`

Expected: PASS.

Run: `pnpm exec tsc --noEmit`

Expected: PASS.

- [ ] **Step 5: Commit the color engine**

```bash
git add src/theme-colors.ts tests/theme-colors.test.ts
git commit -m "feat: derive accessible brand colors"
```

---

### Task 4: Migrate articles to stable category IDs and generate category pages

**Files:**
- Modify: `content/posts/79f45644-f457-4b94-a288-44780fd8f199.md`
- Modify: `.gitignore`
- Modify: `src/site.ts`
- Modify: `scripts/content/schema.ts`
- Modify: `scripts/content/load-posts.ts`
- Modify: `scripts/content/render-post.ts`
- Modify: `scripts/content/prepare.ts`
- Modify: `scripts/rss.ts`
- Create: `scripts/content/render-category.ts`
- Modify: `tests/content-prepare.test.ts`
- Modify: `tests/images.test.ts`
- Modify: `tests/seo.test.ts`
- Modify: `tests/site.test.ts`
- Modify: `tests/verify-build.test.ts`
- Test: `tests/categories.test.ts`

**Interfaces:**
- Consumes: `loadSiteContent`, `resolveSiteContent`, and `validatePostCategoryReferences` from Task 2.
- Produces: `toPublicPost(post: LoadedPost, categories: readonly Category[]): PublicPost`.
- Produces: `PublicPost.categoryIds: string[]` and public `categories: string[]` labels for Teek/RSS.
- Produces: `renderCategoryPage(category: Category, posts: readonly PublicPost[]): string`.
- Produces: generated `/category/<slug>/index.md` pages.

- [ ] **Step 1: Write failing category migration tests**

Update fixture posts in `tests/content-prepare.test.ts` to store the rent UUID. Extend the fixture with the four site-content paths. Assert:

```ts
expect(manifest.posts[0]).toMatchObject({
  categoryIds: ["11111111-1111-4111-8111-111111111111"],
  categories: ["租房指南"],
});

const categoryPage = await readFile(
  join(root, "site/category/rent-guide/index.md"),
  "utf8",
);
expect(categoryPage).toContain("title: 租房指南");
expect(categoryPage).toContain(`/posts/${publishedId}/`);
```

Create `tests/categories.test.ts`:

```ts
it("keeps a category landing route stable when its label changes", () => {
  const category = {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "rent-guide",
    name: "日本租房入门",
    description: "租房说明",
    enabled: true,
    order: 10,
  };
  const output = renderCategoryPage(category, [publishedPost]);
  expect(output).toContain("# 日本租房入门");
  expect(output).toContain("/posts/79f45644-f457-4b94-a288-44780fd8f199/");
});
```

- [ ] **Step 2: Run the focused tests and verify the red state**

Run: `pnpm exec vitest run tests/content-prepare.test.ts tests/categories.test.ts`

Expected: FAIL because raw posts still require fixed Chinese category strings and no category page is generated.

- [ ] **Step 3: Change the raw/public post contracts**

In `scripts/content/schema.ts`, replace `z.enum(CATEGORIES)` with `z.uuid()`, add `categoryIds` to `PublicPost`, keep `categories: string[]`, and remove the `CATEGORIES` import. Remove the fixed `CATEGORIES` array and derived `Category` type from `src/site.ts`. In `toPublicPost`, resolve every ID through a category map and throw a source-path error if it is missing or disabled:

```ts
export function toPublicPost(
  post: LoadedPost,
  categories: readonly Category[],
): PublicPost {
  validatePostCategoryReferences(post.data.categories, categories, post.sourcePath);
  const byId = new Map(categories.map((category) => [category.id, category]));
  const {
    authorName,
    status: _status,
    categories: storedCategoryIds,
    ...data
  } = post.data;
  const categoryIds = [...storedCategoryIds];
  return {
    ...data,
    categoryIds,
    categories: categoryIds.map((id) => byId.get(id)!.name),
    author: { name: authorName },
    permalink: `/posts/${post.data.id}/`,
    body: post.body,
    sourcePath: post.sourcePath,
  };
}
```

Omit `categoryIds` from rendered public frontmatter; write only Chinese `categories` for Teek while retaining IDs in `.generated/posts.json`.

Update every typed `PublicPost` fixture in `tests/images.test.ts` and `tests/seo.test.ts` to include both `categoryIds: ["11111111-1111-4111-8111-111111111111"]` (or the company UUID for the welcome post) and its resolved Chinese `categories`. Update raw article fixtures in `tests/content-prepare.test.ts` and `tests/verify-build.test.ts` to store the UUID rather than a Chinese label. This keeps `pnpm exec tsc --noEmit` green at the same commit that makes `categoryIds` required.

- [ ] **Step 4: Generate stable category landing Markdown**

Add `site/category/` to `.gitignore`. Implement `renderCategoryPage` with frontmatter `title`, `description`, `article: false`, `sidebar: false`, `lastUpdated: false`, and a Markdown list of published posts matching `category.id`. If there are no posts, render `该分类暂时还没有公开文章。`.

In `prepareContent`, load and resolve site content before posts, clear only `site/category/`, and generate a page for every enabled category. Change `writeRss` to accept `{ title, description, logo, url }`; pass the resolved settings plus `SITE_URL`, update the direct call in `tests/seo.test.ts` with the same fixture identity, and use `new URL(logo || "/brand/og-default.png", url)` for feed image and favicon. Do not delete the tracked `site/categories/index.md` page.

Extend `tests/content-prepare.test.ts` to read `site/public/rss.xml` and prove the resolved identity reaches the feed:

```ts
const rss = await readFile(join(root, "site/public/rss.xml"), "utf8");
expect(rss).toContain("<title>日宜房产资讯</title>");
expect(rss).toContain("<description>日宜房产提供日本房产租赁");
expect(rss).toContain("<name>日宜房产</name>");
```

- [ ] **Step 5: Migrate the tracked production article**

Change the article category to:

```yaml
categories:
  - 66666666-6666-4666-8666-666666666666
```

- [ ] **Step 6: Run focused and full tests**

Run: `pnpm exec vitest run tests/content-prepare.test.ts tests/categories.test.ts tests/images.test.ts tests/seo.test.ts tests/site.test.ts tests/verify-build.test.ts`

Expected: PASS.

Run: `pnpm test && pnpm exec tsc --noEmit`

Expected: PASS with the original article permalink and public Chinese category label intact.

- [ ] **Step 7: Commit category migration**

```bash
git add .gitignore content/posts src/site.ts scripts/content scripts/rss.ts tests/content-prepare.test.ts tests/categories.test.ts tests/images.test.ts tests/seo.test.ts tests/site.test.ts tests/verify-build.test.ts
git commit -m "feat: add stable editable article categories"
```

---

### Task 5: Optimize official-site media and emit the site manifest

**Files:**
- Modify: `.gitignore`
- Modify: `src/site-content.ts`
- Modify: `scripts/content/images.ts`
- Create: `scripts/content/site-images.ts`
- Modify: `scripts/content/prepare.ts`
- Modify: `scripts/content/schema.ts`
- Modify: `tests/images.test.ts`
- Modify: `tests/content-prepare.test.ts`
- Test: `tests/site-images.test.ts`

**Interfaces:**
- Consumes: `SiteSourceContent`, `ResolvedSiteContent`, and `createThemeTokens`.
- Changes: `optimizeMedia(inputDir: string, outputDir: string, publicPrefix?: string): Promise<MediaManifest>`.
- Produces: `applySiteMediaManifest(content: ResolvedSiteContent, media: MediaManifest): ResolvedSiteContent`.
- Produces: `.generated/site.json` conforming to `SiteManifest`.

- [ ] **Step 1: Write failing media-prefix and site-reference tests**

Extend `tests/images.test.ts`:

```ts
const manifest = await optimizeMedia(input, output, "/site-media");
expect(manifest.paths.get("/site-media/hero.png")).toMatch(
  /^\/site-media\/hero\.[a-f0-9]{12}\.webp$/,
);
```

Create `tests/site-images.test.ts`:

```ts
it("rewrites every configured official-site image", () => {
  const rewritten = applySiteMediaManifest(siteContentWithImages, {
    paths: new Map([
      ["/site-media/logo.png", "/site-media/logo.111111111111.webp"],
      ["/site-media/hero.png", "/site-media/hero.222222222222.webp"],
      ["/site-media/rent.png", "/site-media/rent.333333333333.webp"],
    ]),
    files: [],
  });
  expect(rewritten.settings.logo).toBe("/site-media/logo.111111111111.webp");
  expect(rewritten.home.hero.image).toBe("/site-media/hero.222222222222.webp");
  expect(rewritten.home.services.items[0]?.image).toBe(
    "/site-media/rent.333333333333.webp",
  );
});

it("rejects a configured image that is absent from the media manifest", () => {
  expect(() => applySiteMediaManifest(siteContentWithImages, { paths: new Map(), files: [] }))
    .toThrow("content/site/home.yml: missing site image /site-media/hero.png");
});
```

- [ ] **Step 2: Run focused tests and verify the red state**

Run: `pnpm exec vitest run tests/images.test.ts tests/site-images.test.ts`

Expected: FAIL because `optimizeMedia` hardcodes `/media` and `site-images.ts` does not exist.

- [ ] **Step 3: Generalize media optimization and rewrite typed content**

Normalize `publicPrefix` to one leading slash and no trailing slash, then use it for both source and output public paths. Keep all current hashing, resize, WebP, and 10 MiB behavior unchanged.

In `site-images.ts`, collect only non-empty values from `settings.logo`, `home.hero.image`, and every service image. Verify each has a manifest mapping. Return a copied resolved-content object with rewritten paths; do not mutate the input. When `PrepareOptions.optimizeImages === false`, skip both article and official-site optimization and leave source paths unchanged; production and `pnpm build` continue to use the default `true` behavior.

- [ ] **Step 4: Emit the resolved site manifest during content preparation**

Add `siteManifestPath?: string` to `PrepareOptions` and resolve it as `options.siteManifestPath ?? join(dirname(options.manifestPath), "site.json")`; with the repository defaults this is `.generated/site.json`, while temporary tests stay inside their fixture directory. Optimize `content/site-media` into `site/public/site-media`, resolve image paths, call `createThemeTokens`, and write:

```ts
const siteManifest: SiteManifest = {
  generatedAt: manifest.generatedAt,
  content: publicSiteContent,
  themeTokens: createThemeTokens(
    publicSiteContent.settings.primaryColor,
    publicSiteContent.settings.secondaryColor,
  ),
};
```

At this point import `ThemeTokensSchema` from `./theme-colors.js` and add `SiteManifest` and `SiteManifestSchema` to `src/site-content.ts` using the already exported resolved-content and theme-token schemas:

```ts
export const SiteManifestSchema = z.object({
  generatedAt: z.iso.datetime({ offset: true }),
  content: ResolvedSiteContentSchema,
  themeTokens: ThemeTokensSchema,
});

export type SiteManifest = z.infer<typeof SiteManifestSchema>;
```

`site/.vitepress/site-manifest.ts` in Task 6 relies on these exact exports.

Add `site/public/site-media/` to `.gitignore`.

Keep RSS generation after official-site image rewriting and pass `publicSiteContent.settings.logo`, so a customer logo in the feed points to the hashed WebP that is actually present in `site/public/site-media/`.

- [ ] **Step 5: Run focused tests, full tests, and type checking**

Run: `pnpm exec vitest run tests/images.test.ts tests/site-images.test.ts tests/content-prepare.test.ts`

Expected: PASS.

Run: `pnpm test && pnpm exec tsc --noEmit`

Expected: PASS and `.generated/site.json` exists after the build-integration test.

- [ ] **Step 6: Commit site media and manifest generation**

```bash
git add .gitignore scripts/content src/site-content.ts tests/images.test.ts tests/site-images.test.ts tests/content-prepare.test.ts
git commit -m "feat: prepare editable site media and manifest"
```

---

### Task 6: Drive VitePress, Teek, SEO, RSS, and navigation from the manifest

**Files:**
- Create: `site/.vitepress/site-manifest.ts`
- Modify: `src/site.ts`
- Modify: `src/navigation.ts`
- Modify: `src/seo.ts`
- Modify: `scripts/rss.ts`
- Modify: `site/.vitepress/config.ts`
- Modify: `site/.vitepress/teek-config.ts`
- Modify: `tests/site.test.ts`
- Modify: `tests/seo.test.ts`
- Test: `tests/navigation.test.ts`

**Interfaces:**
- Consumes: `.generated/site.json` and source YAML fallback.
- Produces: `loadRuntimeSiteManifest(projectRoot?: string): SiteManifest`.
- Produces: `buildNavigation(content: ResolvedSiteContent, primaryLimit?: number): DefaultTheme.NavItem[]`.
- Serializes: `themeConfig.riyi = siteManifest.content` for Vue components.

- [ ] **Step 1: Write failing runtime navigation and identity tests**

Create `tests/navigation.test.ts`:

```ts
it("sorts Home with ordinary items by order and groups overflow under More", () => {
  const nav = buildNavigation(contentWithEightVisibleItems, 6);
  expect(nav.slice(0, 6).map((item) => item.text)).toEqual([
    "首页",
    "租房指南",
    "买房指南",
    "日本生活",
    "区域介绍",
    "关于日宜",
  ]);
  expect(nav[6]).toMatchObject({
    text: "更多",
    items: [
      expect.objectContaining({ text: "房产政策" }),
      expect.objectContaining({ text: "查看房源", target: "_blank" }),
    ],
  });
});

it("does not emit hidden navigation", () => {
  expect(buildNavigation(contentWithHiddenItem).map((item) => item.text))
    .not.toContain("隐藏入口");
});

it("keeps an external navigation item in the same tab when requested", () => {
  const item = buildNavigation(contentWithSameTabExternal).find(
    ({ text }) => text === "房产平台",
  );
  expect(item).toMatchObject({ text: "房产平台", link: "https://riyihome.com" });
  expect(item).not.toHaveProperty("target");
  expect(item).not.toHaveProperty("rel");
});
```

Update `tests/site.test.ts` to assert that config title, description, logo, banner, and serialized `themeConfig.riyi` equal runtime manifest values rather than hardcoded constants.

- [ ] **Step 2: Run focused tests and verify the red state**

Run: `pnpm exec vitest run tests/navigation.test.ts tests/site.test.ts tests/seo.test.ts`

Expected: FAIL because config still imports fixed constants and navigation.

- [ ] **Step 3: Implement runtime manifest loading and navigation projection**

`loadRuntimeSiteManifest` first parses `.generated/site.json` with a `SiteManifestSchema`. If the file is absent, synchronously load source YAML, resolve content, leave `/site-media/` paths unchanged, and derive theme tokens. Any other read or parse failure must be rethrown with the manifest path.

`buildNavigation` must map the already resolved and ordered navigation list, which always contains Home. External items include `target: "_blank"` and `rel: "noreferrer"` only when their stored `newWindow` is `true`; external same-tab items omit both properties. If the count exceeds `primaryLimit`, retain the first `primaryLimit` entries and place the remainder under `{ text: "更多", items }`.

- [ ] **Step 4: Replace fixed runtime identity and Teek banner data**

Keep only deployment-stable constants such as `SITE_URL` and `PLATFORM_URL` in `src/site.ts`. In `site/.vitepress/config.ts`, load the manifest once and set:

```ts
title: site.settings.siteName,
titleTemplate: `:title｜${site.settings.siteName}`,
description: site.settings.siteDescription,
themeConfig: {
  nav: buildNavigation(site),
  logo: site.settings.logo || undefined,
  riyi: site,
}
```

When `relativePath === "index.md"`, override `pageData.title` and frontmatter description from settings before building page head. Change `buildPageHead` to consume `{ siteTitle, siteDescription, siteUrl, logo }` rather than importing editable identity constants.

In `teek-config.ts`, set author/blogger names and footer copyright suffix from `siteName`, set the blogger slogan from `siteDescription`, and set the blogger avatar to `logo || "/brand/og-default.png"`. Set the banner to `bgStyle: "partImg"` and `imgSrc` when `hero.image` is non-empty, otherwise keep `bgStyle: "pure"` and use `secondaryColor`. Map sorted enabled quick links into `banner.features`. Use `themeTokens.onSecondary` for text color and preserve the existing Teek options unrelated to editable content.

Keep the Task 4 `writeRss` identity argument and update its tests so changed CMS identity appears in feed title, description, image, copyright, and author.

- [ ] **Step 5: Run focused tests, build, and verification**

Run: `pnpm exec vitest run tests/navigation.test.ts tests/site.test.ts tests/seo.test.ts`

Expected: PASS.

Run: `pnpm build && pnpm verify`

Expected: PASS with the current title, navigation, Teek banner, article routes, RSS, and sitemap.

- [ ] **Step 6: Commit manifest-driven runtime configuration**

```bash
git add src site/.vitepress/config.ts site/.vitepress/teek-config.ts site/.vitepress/site-manifest.ts scripts/rss.ts scripts/content/prepare.ts tests/navigation.test.ts tests/site.test.ts tests/seo.test.ts
git commit -m "feat: drive site configuration from CMS content"
```

---

### Task 7: Render editable homepage, download, and article actions

**Files:**
- Create: `site/.vitepress/theme/use-riyi-content.ts`
- Modify: `src/official-site.ts`
- Modify: `site/.vitepress/theme/components/AppDownload.vue`
- Modify: `site/.vitepress/theme/components/ArticlePlatformCta.vue`
- Modify: `site/.vitepress/theme/components/HomePromotion.vue`
- Modify: `site/.vitepress/theme/components/LatestArticlesHeading.vue`
- Modify: `site/.vitepress/theme/custom.css`
- Modify: `tests/official-site.test.ts`
- Modify: `tests/app-download.test.ts`
- Modify: `tests/app-download-build.test.ts`
- Modify: `tests/official-css.test.ts`

**Interfaces:**
- Consumes: `themeConfig.riyi: ResolvedSiteContent` from Task 6.
- Produces: `useRiyiContent(): ComputedRef<ResolvedSiteContent>`.
- Produces: `buildAppDownloadActions(config: ResolvedHomeContent["appDownload"]): AppDownloadAction[]`.
- Preserves: `shouldShowArticleCta(frontmatter): boolean`.

- [ ] **Step 1: Write failing public-content and build integration tests**

Update `tests/official-site.test.ts` so builders receive fixture content instead of asserting old module constants:

```ts
it("sorts and filters CMS services and actions", () => {
  expect(selectVisibleServices(home.services).map(({ id }) => id)).toEqual([
    "purchase",
    "rent",
  ]);
  expect(selectVisibleActions(home.actions).map(({ id }) => id)).toEqual([
    "listings",
    "wechat",
  ]);
});
```

Extend the single-build test in `tests/app-download-build.test.ts` to assert current YAML values appear in the homepage, hidden fixtures are absent when the YAML fixture loader is unit-tested, service images include their configured alt, and actions preserve the App Store, Google Play, mini-program button, and HTTPS consultation links.

- [ ] **Step 2: Run focused tests and verify the red state**

Run: `pnpm exec vitest run tests/official-site.test.ts tests/app-download.test.ts tests/app-download-build.test.ts`

Expected: FAIL because the components still import fixed arrays.

- [ ] **Step 3: Add typed theme-content access and pure selectors**

Implement:

```ts
export function useRiyiContent() {
  const { theme } = useData<{ riyi: ResolvedSiteContent }>();
  return computed(() => theme.value.riyi);
}
```

Move only immutable UI metadata such as store icon URLs and action tones into `src/official-site.ts`. Add pure `sortByOrder`, `selectVisibleServices`, `selectVisibleAdvantages`, and `selectVisibleActions` helpers. `buildAppDownloadActions` receives CMS URLs and token while keeping fixed icon URLs and action kinds.

- [ ] **Step 4: Refactor Vue components to consume CMS content**

`HomePromotion.vue` obtains `home` once, renders `AppDownload` only when enabled, renders service cards from the visible sorted selector, adds `<img>` only when `service.image` is non-empty, renders advantages only when enabled, and renders only enabled actions.

`AppDownload.vue` accepts a required `config` prop and copies `config.wechatMiniProgram`. `LatestArticlesHeading.vue` renders `home.articles`. `ArticlePlatformCta.vue` reads the shared action section and hides itself if the page is not an article or no actions remain.

For each resolved service or action link, add `:target="item.external ? '_blank' : undefined"` and `:rel="item.external ? 'noreferrer' : undefined"`. App Store and Google Play links remain external, while the mini-program action remains a copy button. Keep all existing keyboard and clipboard fallback behavior.

- [ ] **Step 5: Update CSS for optional images and hidden modules**

Add `.riyi-service-card__image` with `aspect-ratio: 16 / 9`, `object-fit: cover`, full card width, and existing border radius. Keep existing 960px, 767px, dark-mode, focus-visible, and reduced-motion behavior.

- [ ] **Step 6: Run component contracts and the built-homepage test**

Run: `pnpm exec vitest run tests/official-site.test.ts tests/app-download.test.ts tests/official-css.test.ts tests/app-download-build.test.ts`

Expected: PASS after one successful VitePress build.

Run: `pnpm exec tsc --noEmit`

Expected: PASS.

- [ ] **Step 7: Commit manifest-driven Vue rendering**

```bash
git add src/official-site.ts site/.vitepress/theme tests/official-site.test.ts tests/app-download.test.ts tests/app-download-build.test.ts tests/official-css.test.ts
git commit -m "feat: render editable official site sections"
```

---

### Task 8: Apply dynamic brand tokens and verify deployment gates

**Files:**
- Modify: `site/.vitepress/config.ts`
- Modify: `site/.vitepress/theme/custom.css`
- Modify: `scripts/verify-build.ts`
- Modify: `scripts/deploy/run.ts`
- Modify: `.github/workflows/deploy.yml`
- Modify: `tests/official-css.test.ts`
- Modify: `tests/verify-build.test.ts`
- Modify: `tests/deploy.test.ts`
- Modify: `tests/workflows.test.ts`

**Interfaces:**
- Consumes: `SiteManifest.themeTokens` and enabled category slugs.
- Produces: inline `<style id="riyi-theme-tokens">` in every build.
- Changes: `VerifyBuildOptions.siteManifestPath: string`.
- Changes: production smoke paths include `/category/<slug>/` for enabled categories.

- [ ] **Step 1: Write failing theme-style and deploy-gate tests**

Extend CSS and build verifier tests:

```ts
expect(css).toContain("var(--riyi-brand-text, #1f6658)");
expect(css).toContain("var(--riyi-secondary, #17352f)");
```

In `tests/verify-build.test.ts`, write a site manifest fixture and require verifier errors for a missing enabled category page, absent `#riyi-theme-tokens`, and a homepage missing the current CMS site name.

In workflow tests, assert the artifact contains `.generated/site.json` and the deploy job still depends on the successful build job.

- [ ] **Step 2: Run focused tests and verify the red state**

Run: `pnpm exec vitest run tests/official-css.test.ts tests/verify-build.test.ts tests/deploy.test.ts tests/workflows.test.ts`

Expected: FAIL because dynamic tokens and site-manifest deployment checks are absent.

- [ ] **Step 3: Inject derived tokens and consume CSS fallbacks**

Create the inline CSS from `themeTokens` in `site/.vitepress/config.ts`:

```ts
const themeCss = `:root{--riyi-primary:${tokens.primary};--riyi-secondary:${tokens.secondary};--riyi-brand-text:${tokens.brandText};--riyi-brand-hover:${tokens.brandHover};--riyi-brand-strong:${tokens.brandStrong};--riyi-brand-soft:${tokens.brandSoft};--riyi-secondary-strong:${tokens.secondaryStrong};--riyi-secondary-muted:${tokens.secondaryMuted};--riyi-on-secondary:${tokens.onSecondary}}.dark{--riyi-brand-text:${tokens.darkBrandText};--riyi-secondary:${tokens.darkSecondary};--riyi-secondary-strong:${tokens.darkSecondaryStrong};--riyi-secondary-muted:${tokens.darkSecondaryMuted}}`;
```

Append `['style', { id: 'riyi-theme-tokens' }, themeCss]` to `head`. Change hardcoded official color declarations in `custom.css` to these variables with the current colors as fallbacks. Use `--riyi-on-secondary` instead of unconditional white for secondary-color panels.

- [ ] **Step 4: Extend build and production verification**

`verifyBuild` must load and parse `SiteManifest`, then check:

- `index.html` contains `content.settings.siteName`.
- `index.html` contains `id="riyi-theme-tokens"`.
- every enabled navigation internal href resolves.
- every enabled category has `dist/category/<slug>/index.html`.
- every non-empty official image path resolves under dist.

Add `.generated/site.json` to the production artifact. In `runDeployment`, read it and append every enabled category landing path to canonical smoke paths, while retaining Home and the latest three articles.

- [ ] **Step 5: Run focused tests and the full release gate**

Run: `pnpm exec vitest run tests/official-css.test.ts tests/verify-build.test.ts tests/deploy.test.ts tests/workflows.test.ts`

Expected: PASS.

Run: `pnpm exec tsc --noEmit && pnpm check`

Expected: all tests, VitePress build, build verification, and type checking PASS.

- [ ] **Step 6: Commit brand integration and deployment verification**

```bash
git add site/.vitepress/config.ts site/.vitepress/theme/custom.css scripts/verify-build.ts scripts/deploy/run.ts .github/workflows/deploy.yml tests/official-css.test.ts tests/verify-build.test.ts tests/deploy.test.ts tests/workflows.test.ts
git commit -m "feat: enforce editable site release gates"
```

---

### Task 9: Complete customer documentation and end-to-end acceptance

**Files:**
- Modify: `README.md`
- Modify: `docs/customer/publishing.md`
- Modify: `docs/operations/acceptance.md`
- Modify: `docs/operations/deployment.md`
- Modify: `tests/operations-docs.test.ts`

**Interfaces:**
- Consumes: all customer-visible fields and failure messages from Tasks 1–8.
- Produces: the handoff workflow for article writing, official-site editing, images, colors, navigation, categories, and recovery.

- [ ] **Step 1: Write the failing documentation contract**

Extend `tests/operations-docs.test.ts`:

```ts
for (const required of [
  "官网管理",
  "品牌与外观",
  "首页内容",
  "导航菜单",
  "文章分类",
  "官网图片",
  "主品牌色",
  "辅助品牌色",
  "10 MB",
  "停用分类",
  "线上旧版本不受影响",
]) {
  expect(text).toContain(required);
}
```

- [ ] **Step 2: Run the documentation test and verify the red state**

Run: `pnpm exec vitest run tests/operations-docs.test.ts`

Expected: FAIL because the handoff still documents only article writing.

- [ ] **Step 3: Write the complete Chinese customer workflow**

Update `docs/customer/publishing.md` with separate sections for:

- GitHub login and the “官网管理” group.
- Site name, Logo, six-digit brand colors, and fixed layout version.
- Banner, App links, three services, four advantages, three actions, and article heading.
- Recommended dimensions: Logo 512×512 transparent PNG/WebP, Banner 1920×800, service image 1200×675.
- Navigation target types, ordinary item deletion, and protected Home.
- Category creation, renaming, disabling, article migration, and maintenance-only hard deletion.
- Article cover/body images versus official-site images.
- Automatic deployment, clear failure examples, unchanged production on failure, and maintenance contact.

Update acceptance and deployment docs to include `.generated/site.json`, stable category pages, dynamic brand style, and category smoke paths. Update README content paths.

- [ ] **Step 4: Run documentation and full repository gates**

Run: `pnpm exec vitest run tests/operations-docs.test.ts`

Expected: PASS.

Run: `pnpm exec tsc --noEmit && pnpm check && git diff --check`

Expected: PASS with no TypeScript errors, test failures, build errors, verifier errors, or whitespace errors.

- [ ] **Step 5: Perform browser acceptance before commit**

Run `pnpm preview` after `pnpm build`. Check 1440×1000, 768×1024, and 390×844 viewports in light and dark modes. Verify:

- Banner pure-color fallback and an image-backed fixture build.
- Current navigation plus overflow “更多”.
- Mobile folded navigation.
- App download links and mini-program copy fallback.
- Optional service images and alt text.
- Hidden modules leave no empty spacing.
- Two alternate color fixtures remain readable.
- `/category/company-news/` lists the welcome article.
- The article permalink remains `/posts/79f45644-f457-4b94-a288-44780fd8f199/`.
- Browser console has no new errors attributable to this feature.

- [ ] **Step 6: Commit customer handoff documentation**

```bash
git add README.md docs/customer/publishing.md docs/operations/acceptance.md docs/operations/deployment.md tests/operations-docs.test.ts
git commit -m "docs: hand off official site content management"
```

---

### Task 10: Final verification and production release

**Files:**
- Verify only; modify files only if a failing gate identifies a concrete defect, using a separate focused fix commit.

**Interfaces:**
- Consumes: all prior task commits.
- Produces: a synchronized `main`, successful GitHub Actions deployment, and production acceptance evidence.

- [ ] **Step 1: Run the fresh local release gate**

Run:

```bash
pnpm exec tsc --noEmit
pnpm check
git diff --check
test -z "$(git status --porcelain)"
```

Expected: all commands exit 0; Vitest reports zero failed tests; VitePress build and verifier complete.

- [ ] **Step 2: Inspect the final commit range and remote state**

Run:

```bash
git fetch origin main
git status -sb
git log --oneline origin/main..HEAD
```

Expected: the branch contains only the approved specification, plan, implementation, tests, migration, and documentation commits; no unrelated files are modified.

- [ ] **Step 3: Push the approved `main` history**

Run: `git push origin main`

Expected: normal fast-forward push; never force push.

- [ ] **Step 4: Monitor the matching production workflow**

Find the `Deploy production` run whose `headSha` equals `git rev-parse HEAD`, then run:

```bash
release_sha="$(git rev-parse HEAD)"
release_run_id="$(gh run list --workflow deploy.yml --branch main --limit 10 --json databaseId,headSha | jq -r --arg sha "$release_sha" '.[] | select(.headSha == $sha) | .databaseId' | head -n 1)"
test -n "$release_run_id"
gh run watch "$release_run_id" --exit-status
```

Expected: both `build` and `deploy` jobs succeed. If either job fails, stop release claims, inspect that job, and use systematic debugging before editing.

- [ ] **Step 5: Verify production content and stable routes**

Run:

```bash
pnpm smoke --base-url https://www.riyihome.com --path / --path /category/company-news/ --path /posts/79f45644-f457-4b94-a288-44780fd8f199/
```

Fetch the production homepage with a cache-busting query and assert status 200 plus the current site name, download section, navigation labels, and `riyi-theme-tokens`. Verify the two store URLs, mini-program label, and consultation links. Verify `git rev-parse HEAD` equals `git rev-parse origin/main`.

Expected: all production checks pass against the deployed commit.

---

## Plan Self-Review Checklist

- [x] Every approved spec section maps to at least one task.
- [x] The Pages CMS field names match the Zod source field names exactly.
- [x] Category UUIDs in seed data, navigation, homepage targets, article migration, and tests match exactly.
- [x] `SiteManifest`, `ResolvedSiteContent`, `ThemeTokens`, and `PrepareOptions.siteManifestPath` signatures remain consistent across tasks.
- [x] No task introduces a second CMS, database, preview environment, free-form layout, or per-section color controls.
- [x] No task allows Pages CMS to hard-delete categories or system Home.
- [x] Full release gate and production smoke checks occur only after all implementation tasks.

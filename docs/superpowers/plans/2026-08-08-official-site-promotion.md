# 日宜新官网宣传内容整合 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `riyi-blog` 中加入正式官网宣传结构，同时保留 Teek 文章系统、Pages CMS 和独立部署架构。

**Architecture:** 使用 Teek 已公开的首页与正文插槽挂载三个小型 Vue 组件，外部业务链接由独立 TypeScript 模块集中管理。固定官网内容保留在版本库中，客户文章仍通过 Pages CMS 写入 Markdown，两条内容流互不耦合。

**Tech Stack:** VitePress 1.6.4、Vue 3.5、vitepress-theme-teek 1.6.2、TypeScript、Vitest、CSS。

## Global Constraints

- `https://www.riyihome.com` 是新官网与内容中心，`https://riyihome.com` 是房源业务平台。
- 不新增项目、后台、数据库、uniCloud 依赖或运行时服务。
- 不复制旧 React 官网，不使用 iframe、房源假搜索、未验证数字、无效二维码或 HTTP 业务链接。
- 延续现有深绿色品牌色与简体中文字体栈，兼容桌面、移动、浅色和深色模式。
- Pages CMS 与 Markdown 文章发布结构保持不变。

---

### Task 1: 外部业务链接契约

**Files:**
- Create: `src/platform-links.ts`
- Modify: `src/site.ts`
- Modify: `src/navigation.ts`
- Modify: `tests/site.test.ts`

**Interfaces:**
- Produces: `PLATFORM_LINKS`，包含 `home`、`submitDemand`、`wechatConsult` 三个 HTTPS 字符串。
- Produces: 面向正式官网的 `SITE_DESCRIPTION`。
- Consumes: `NAV_ITEMS` 使用 `PLATFORM_LINKS.home`。

- [ ] **Step 1: 写失败测试**

在 `tests/site.test.ts` 中断言三个外部 URL 均使用 `https:`，且导航的“查看房源”指向 `PLATFORM_LINKS.home`；同时断言站点描述同时包含“日本房产”和“实用内容”。

- [ ] **Step 2: 运行测试并确认 RED**

Run: `pnpm vitest run tests/site.test.ts`

Expected: FAIL，因为 `src/platform-links.ts` 尚不存在，且导航与描述仍是博客定位。

- [ ] **Step 3: 最小实现**

创建：

```ts
export const PLATFORM_LINKS = {
  home: "https://riyihome.com/",
  submitDemand: "https://riyihome.com/index.html#/pages/project/advisory",
  wechatConsult: "https://work.weixin.qq.com/kfid/kfcc5d6c8170e5733d0",
} as const;
```

让 `PLATFORM_URL` 兼容导出 `PLATFORM_LINKS.home`，更新官网描述，并将导航末项命名为“查看房源”。

- [ ] **Step 4: 运行测试并确认 GREEN**

Run: `pnpm vitest run tests/site.test.ts`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/platform-links.ts src/site.ts src/navigation.ts tests/site.test.ts
git commit -m "feat: define official site platform links"
```

### Task 2: Teek 官网组件与插槽

**Files:**
- Create: `site/.vitepress/theme/components/HomePromotion.vue`
- Create: `site/.vitepress/theme/components/LatestArticlesHeading.vue`
- Create: `site/.vitepress/theme/components/ArticlePlatformCta.vue`
- Create: `tests/official-components.test.ts`
- Modify: `site/.vitepress/theme/index.ts`
- Modify: `site/.vitepress/teek-config.ts`

**Interfaces:**
- Consumes: `PLATFORM_LINKS`。
- Produces: `HomePromotion` 挂载到 `teek-home-banner-after`。
- Produces: `LatestArticlesHeading` 挂载到 `teek-home-post-before`。
- Produces: `ArticlePlatformCta` 挂载到 `doc-after`，仅当 `frontmatter.article === true` 时渲染。

- [ ] **Step 1: 写失败测试**

在 `tests/official-components.test.ts` 中用 Vue 服务端渲染真实组件，断言首页宣传区包含三类服务、四项服务方式和三个可点击入口；分别以文章与非文章 frontmatter 渲染正文 CTA，断言它只在文章页面输出。

- [ ] **Step 2: 运行测试并确认 RED**

Run: `pnpm vitest run tests/official-components.test.ts`

Expected: FAIL，因为三个组件尚不存在。

- [ ] **Step 3: 最小实现**

创建三个语义化组件，按钮使用普通 `<a>`，外部链接添加 `target="_blank" rel="noreferrer"`，装饰图形添加 `aria-hidden="true"`。在 `theme/index.ts` 中用 Vue `h` 与 `Teek.Layout` 透传插槽；将 Banner 改为“日宜房产 / 日本找房，就上日宜”，关闭 `docAnalysis`。

- [ ] **Step 4: 运行测试并确认 GREEN**

Run: `pnpm vitest run tests/official-components.test.ts tests/site.test.ts`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add site/.vitepress/theme/components site/.vitepress/theme/index.ts site/.vitepress/teek-config.ts tests/official-components.test.ts
git commit -m "feat: add official site promotion sections"
```

### Task 3: 品牌样式与响应式适配

**Files:**
- Modify: `site/.vitepress/theme/custom.css`
- Modify: `tests/site.test.ts`

**Interfaces:**
- Consumes: Task 2 的 `riyi-*` 组件类名。
- Produces: 首页宣传区、文章标题区与文章 CTA 的浅色、深色、桌面和移动样式。

- [ ] **Step 1: 写失败测试**

扩充站点构建测试，在构建后的首页 HTML 中断言语义区块和 CTA 均存在，并在 CSS 合同测试中确认简体中文字体仍优先于日文字体回退。

- [ ] **Step 2: 运行测试并确认 RED**

Run: `pnpm vitest run tests/site.test.ts tests/official-components.test.ts`

Expected: FAIL，因为构建产物和新组件样式合同尚未满足。

- [ ] **Step 3: 最小实现**

为 `riyi-home-promotion`、`riyi-service-grid`、`riyi-advantage-grid`、`riyi-action-panel`、`riyi-section-heading` 和 `riyi-article-cta` 添加品牌 CSS。交互态覆盖 `hover`、`focus-visible`，移动断点为 `768px`，并在 `prefers-reduced-motion` 下禁用位移动画。

- [ ] **Step 4: 运行测试并确认 GREEN**

Run: `pnpm vitest run tests/site.test.ts tests/official-components.test.ts tests/teek-css.test.ts`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add site/.vitepress/theme/custom.css tests/site.test.ts tests/official-components.test.ts
git commit -m "style: align official sections with riyi brand"
```

### Task 4: 关于页与官网 SEO

**Files:**
- Modify: `site/about/index.md`
- Modify: `site/index.md`
- Modify: `tests/seo.test.ts`
- Modify: `tests/site.test.ts`

**Interfaces:**
- Consumes: `PLATFORM_LINKS` 对应的三个公开 URL。
- Produces: 正式官网首页元数据和完整“关于日宜”内容。

- [ ] **Step 1: 写失败测试**

在 `tests/site.test.ts` 读取首页与关于页源文件，断言首页标题为“日宜房产”，关于页包含“我们是谁”“解决什么问题”“我们怎么做”“我们相信”以及三个 HTTPS 行动入口。

- [ ] **Step 2: 运行测试并确认 RED**

Run: `pnpm vitest run tests/site.test.ts tests/seo.test.ts`

Expected: FAIL，因为首页与关于页仍保留博客定位，且关于页缺少完整结构。

- [ ] **Step 3: 最小实现**

更新 `site/index.md` 的 title 与 description；重写 `site/about/index.md`，使用简洁 Markdown 标题、段落、列表与 CTA 链接，不添加未经验证的公司规模、统计数字或资质结论。

- [ ] **Step 4: 运行测试并确认 GREEN**

Run: `pnpm vitest run tests/site.test.ts tests/seo.test.ts`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add site/index.md site/about/index.md tests/site.test.ts tests/seo.test.ts
git commit -m "content: present riyi as the official website"
```

### Task 5: 全量验证与浏览器验收

**Files:**
- Modify only if verification reveals an in-scope defect.

**Interfaces:**
- Consumes: Tasks 1-4 的完整站点。
- Produces: 可构建、可部署、视觉与交互验收通过的官网版本。

- [ ] **Step 1: 运行静态与自动化验证**

Run: `pnpm exec tsc --noEmit`

Run: `pnpm check`

Run: `git diff --check`

Expected: 全部以退出码 0 完成；Node 版本提示可记录，但不得出现测试、类型、构建或产物错误。

- [ ] **Step 2: 启动本地预览并浏览器验收**

Run: `pnpm preview --host 127.0.0.1`

检查桌面首页、移动首页、文章页和关于页；确认导航、三个 CTA、深浅色、文章列表与文章末尾 CTA 正常，控制台无错误。

- [ ] **Step 3: 检查仓库状态**

Run: `git status --short`

Expected: 仅包含本计划要求的文件，或在完成提交后为空。

- [ ] **Step 4: 最终提交**

```bash
git add docs/superpowers site src tests
git commit -m "feat: integrate official site promotion"
```

# riyi-blog

日宜房产独立博客

- 前台：VitePress + vitepress-theme-teek
- 写作：Pages CMS 托管版
- 文章：`content/posts/`，文章图片：`content/media/`
- 官网设置：`content/site/`，文章分类：`content/categories/`
- 官网图片：`content/site-media/`
- 托管：阿里云 OSS + CDN

Pages CMS 同时提供“文章”和“官网管理”入口。官网使用固定布局
`official-v1`；客户可以维护站名、Logo、两种品牌色、首页内容、导航和
文章分类，但不能自由拖拽页面或写入自定义 HTML/CSS。

## 本地开发

要求 Node 22 和 pnpm 10.34.5。

```bash
export PATH="/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:$PATH"
pnpm install --frozen-lockfile
pnpm dev
```

提交前运行：

```bash
pnpm check
pnpm exec tsc --noEmit
git diff --check
```

客户说明见 `docs/customer/publishing.md`；阿里云、发布和 Git revert 回滚说明见 `docs/operations/`。

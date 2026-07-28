# riyi-blog

日宜房产独立博客，公开地址为 https://www.riyihome.com。

- 前台：VitePress + vitepress-theme-teek
- 写作：Pages CMS 托管版
- 内容：`content/posts/` 和 `content/media/`
- 托管：阿里云 OSS + CDN

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

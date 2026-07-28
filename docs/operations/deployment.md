# 发布与监控

`main` 每次 push 都会运行 Deploy production。构建阶段执行 `pnpm check`；只有测试、VitePress 构建、内部链接、SEO、草稿隔离和泄密检查全部通过，才会进入 `production` 环境。

部署先写 CSS、JavaScript、字体和图片，再写 HTML、RSS、sitemap 和 robots；全部上传成功后只删除当前构建已不存在的 HTML。部署不删除哈希资源和普通静态资源。CDN 刷新完成后探测首页和最近三篇文章，最多等待约六分钟；探测失败会让 workflow 失败，但不会回删刚上传的文件。

客户可在 Pages CMS 点击“重新部署博客”。该按钮触发同一个 `deploy.yml`，不建立另一套发布逻辑。

生产上传通过 `riyi-blog-production` 并发组串行执行。新版本上传成功后，发布身份只删除当前构建已不存在的 HTML，以确保归档文章返回 404；它不能删除哈希资源。独立清理身份每月只处理 180 天以前、不在当前构建中、且文件名带内容哈希的对象。

排错顺序：

1. 查看 build job 的第一条失败测试或构建错误。
2. build 成功而 deploy 失败时，检查 OSS PutObject、CDN RefreshObjectCaches 和 HTTP smoke 三段日志。
3. 修复内容后保存会自动触发新发布；基础设施瞬时错误可从 Pages CMS 点击“重新部署博客”。
4. 不直接在 OSS 控制台手工覆盖 HTML，以免 Git 与线上状态分叉。

## DNS 切换前发布

配置 GitHub Environment 后运行：

```bash
SMOKE_BASE_URL=$(gh variable get SMOKE_BASE_URL --env production)
test -n "$SMOKE_BASE_URL"
test "$(gh variable get SMOKE_OBJECT_PATHS --env production)" = "true"
gh workflow run deploy.yml --ref main \
  -f payload='{"source":"operator","reason":"initial deployment"}'
gh run watch --exit-status
```

临时验收：

```bash
curl -I "$SMOKE_BASE_URL/index.html"
curl -I "$SMOKE_BASE_URL/posts/79f45644-f457-4b94-a288-44780fd8f199/index.html"
curl -fsS "$SMOKE_BASE_URL/rss.xml"
curl -fsS "$SMOKE_BASE_URL/sitemap.xml"
```

## DNS 切换后发布

```bash
gh variable set SMOKE_BASE_URL \
  --env production \
  --body https://www.riyihome.com
gh variable set SMOKE_OBJECT_PATHS --env production --body false
gh workflow run deploy.yml --ref main \
  -f payload='{"source":"operator","reason":"dns cutover"}'
gh run watch --exit-status
dig +short CNAME www.riyihome.com
curl -fsSIL http://www.riyihome.com/
pnpm smoke -- --base-url=https://www.riyihome.com \
  --path=/ \
  --path=/posts/79f45644-f457-4b94-a288-44780fd8f199/
```

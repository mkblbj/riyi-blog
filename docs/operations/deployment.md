# 发布与监控

`main` 每次 push 都会运行 Deploy production。构建阶段执行 `pnpm check`；只有内容关系、图片、测试、VitePress 构建、内部链接、SEO、草稿隔离和泄密检查全部通过，才会进入 `production` 环境。

内容准备会把 Pages CMS 保存的 YAML/Markdown 解析成两个生成清单：`.generated/posts.json` 保存公开文章，`.generated/site.json` 保存已解析的站名、首页、导航、稳定分类、官网图片路径和动态品牌 token。分类页生成在 `/category/<slug>/`；中文分类名可改，slug 与文章 `/posts/<uuid>/` 地址保持稳定。官网原图经过优化后发布到 `/site-media/`，清单引用带内容哈希的 WebP。

## 内容准备的 staging 与恢复

`scripts/content/prepare.ts` 不会边解析边覆盖现有生成目录。它先在目标目录旁创建 `.content-prepare-*` staging workspace，在其中准备文章页、分类页、两类优化图片、RSS 和两个 manifest；本阶段全部生成与 schema 校验完成后，才开始发布生成输出。

发布时按目标逐项处理：先用同文件系统的 `rename` 把旧目标移入 staging workspace 的 `backups/`，再把对应 staged 输出 `rename` 到正式生成路径。单次 rename 是原子替换步骤，但整组目标不是单一文件系统事务；因此中途失败时，程序会按已处理目标的逆序尽力删除新输出并恢复旧备份。

- 普通发布失败且逆序恢复全部成功时，旧生成输出会保持可用，程序抛出原始错误，并自动清理 staging workspace。修正原始内容或文件系统问题后可以重新运行。
- 如果删除新输出或恢复旧备份也失败，错误会明确包含 `recovery required`、保留的 recovery workspace 路径和 `failing targets`。此时 `.content-prepare-*` 会被故意保留，作为人工恢复所需的 staged 输出和 `backups/` 现场。

遇到 `recovery required` 必须停止当前部署：不要删除 `.content-prepare-*`，不要盲目重跑内容准备，也不要覆盖错误列出的目标。先保存完整错误日志，再备份 recovery workspace 和所有 failing targets 的当前状态；由维护人员对照错误中的 targets、workspace 内的 staged 树和 `backups/`，逐项恢复旧生成输出并核对文章、分类、媒体、RSS 和两个 manifest 的一致性。确认恢复完成后才能清理该 workspace，并从干净状态重新构建。客户或无现场上下文的值班人员不要自行猜测 `backups/` 编号与目标的对应关系。

构建产物校验要求首页包含当前 CMS 站名和唯一的 `riyi-theme-tokens` 动态样式，要求每个站内导航、已启用分类页和官网图片都存在。production artifact 必须同时包含 `site/.vitepress/dist`、`.generated/posts.json` 和 `.generated/site.json`，deploy job 只使用 build job 已通过的这一份 artifact。

部署先写 CSS、JavaScript、字体和图片，再写 HTML、RSS、sitemap 和 robots；全部上传成功后只删除当前构建已不存在的 HTML。部署不删除哈希资源和普通静态资源。CDN 刷新完成后探测首页、最近三篇文章和 `.generated/site.json` 中所有已启用分类路径，最多等待约六分钟；探测失败会让 workflow 失败，但不会回删刚上传的文件。

客户可在 Pages CMS 点击“重新部署官网”。该按钮触发同一个 `deploy.yml`，不建立另一套发布逻辑。

生产上传通过 `riyi-blog-production` 并发组串行执行。新版本上传成功后，发布身份只删除当前构建已不存在的 HTML，以确保归档文章返回 404；它不能删除哈希资源。独立清理身份每月只处理 180 天以前、不在当前构建中、且文件名带内容哈希的对象。

排错顺序：

1. 查看 build job 的第一条失败测试或构建错误。内容错误通常带 `content/site/*.yml`、`content/categories/*.yml` 或 `content/posts/*.md` 路径；先修正六位颜色、HTTPS 地址、图片说明、分类引用或重复顺序。若出现 `recovery required`，先按上一节人工恢复，禁止直接重跑。
2. build 成功而 deploy 失败时，检查 OSS PutObject、CDN RefreshObjectCaches 和 HTTP smoke 三段日志。
3. 内容校验、测试或构建失败不会下载 production artifact，线上旧版本不受影响。修复内容后保存会自动触发新发布。
4. OSS、CDN 或 smoke 阶段失败时，新文件可能已经部分或全部上传；smoke 失败不会自动回删。先检查正式首页、受影响分类和文章，再由维护人员重跑同一 commit 或执行 Git revert。
5. 基础设施瞬时错误可从 Pages CMS 点击“重新部署官网”。同一提交重跑仍使用完整构建、上传和 smoke 流程。
6. 不直接在 OSS 控制台手工覆盖 HTML，以免 Git 与线上状态分叉。

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

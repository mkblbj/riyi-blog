# 阿里云资源配置

## 固定资源名称

地域固定为日本（东京）。阿里云地域 ID 为 `ap-northeast-1`，`ali-oss` SDK 地域值固定为 `oss-ap-northeast-1`。登录阿里云 CLI 后执行：

```bash
ACCOUNT_ID=$(aliyun sts GetCallerIdentity | jq -r .AccountId)
test -n "$ACCOUNT_ID"
BUCKET="riyi-blog-${ACCOUNT_ID}-tokyo"
printf '%s\n' "$BUCKET"
```

后续所有 OSS、RAM 和 GitHub 配置都使用命令输出的同一个 `$BUCKET`；账号 ID 全局唯一，因此该名称不依赖人工猜测后缀。

## OSS

1. 在对象存储 OSS 创建 Standard、LRS、非版本控制 Bucket。
2. Bucket 名称使用上一步打印的 `$BUCKET`，地域选择日本（东京）。
3. 读权限设为公共读，写权限保持私有；内容本来就是公开博客，但任何匿名用户都不能写入。
4. 静态网站首页设为 `index.html`，默认 404 页面设为 `404.html`。
5. 不开启 OSS 版本控制。恢复以 Git commit 重新构建为准。
6. 不配置按年龄直接删除全部对象的生命周期规则；当前仍被引用的老资源不能仅因年龄被删。

## CDN 和 HTTPS

1. 添加加速域名 `www.riyihome.com`，源站选择上一步 OSS Bucket 的外网域名。
2. CDN 缓存遵循源站 `Cache-Control`。HTML 为 60 秒，RSS、sitemap 和 robots 为 300 秒，带哈希资源为一年 immutable。
3. URL 参数保留；发布后探测使用 `_deploy_check` 参数绕过旧浏览器缓存。
4. 在数字证书管理服务申请或上传覆盖 `www.riyihome.com` 的证书，在 CDN 启用 HTTPS 和 HTTP 自动跳转 HTTPS。
5. 未完成临时 CNAME/源站验收前，不修改正式 DNS。

## 发布 RAM 身份

建立只供 GitHub Actions 发布使用的 RAM 用户。策略允许目标 Bucket 的 `oss:PutObject`、列举对象、仅删除 `.html`，以及日宜博客域名的 `cdn:RefreshObjectCaches`；不允许删除哈希资源或管理 Bucket、证书、域名和其他项目。

用当前 shell 中的真实 `$BUCKET` 和 `$ACCOUNT_ID` 生成策略，再把输出粘贴到阿里云 RAM 控制台；策略 JSON 不进入 Git 仓库：

```bash
jq -n --arg bucket "$BUCKET" --arg account "$ACCOUNT_ID" '{
  Version: "1",
  Statement: [
    {
      Effect: "Allow",
      Action: ["oss:PutObject"],
      Resource: ["acs:oss:*:*:\($bucket)/*"]
    },
    {
      Effect: "Allow",
      Action: ["oss:ListObjects"],
      Resource: ["acs:oss:*:*:\($bucket)"]
    },
    {
      Effect: "Allow",
      Action: ["oss:DeleteObject"],
      Resource: ["acs:oss:*:*:\($bucket)/*.html"]
    },
    {
      Effect: "Allow",
      Action: ["cdn:RefreshObjectCaches"],
      Resource: ["acs:cdn:*:\($account):domain/www.riyihome.com"]
    }
  ]
}'
```

`DeleteMultipleObjects` 同样使用 `oss:DeleteObject` 权限；代码会在上传全部新文件后，只把不在当前构建中的 `.html` 交给删除 API。

## 清理 RAM 身份

另建清理专用 RAM 用户，只允许目标 Bucket 的 `oss:ListObjects` 和目标对象的 `oss:DeleteObject`。`ListObjectsV2` API 使用的 RAM Action 仍是 `oss:ListObjects`。该身份没有 `oss:PutObject`、CDN、证书或域名权限，只放入 GitHub Environment `production-cleanup`。

```bash
jq -n --arg bucket "$BUCKET" '{
  Version: "1",
  Statement: [
    {
      Effect: "Allow",
      Action: ["oss:ListObjects"],
      Resource: ["acs:oss:*:*:\($bucket)"]
    },
    {
      Effect: "Allow",
      Action: ["oss:DeleteObject"],
      Resource: ["acs:oss:*:*:\($bucket)/*"]
    }
  ]
}'
```

## GitHub Environments

Environment `production`：

- Secret `ALIYUN_ACCESS_KEY_ID`
- Secret `ALIYUN_ACCESS_KEY_SECRET`
- Variable `ALIYUN_OSS_REGION` = `oss-ap-northeast-1`
- Variable `ALIYUN_OSS_BUCKET` = 本页生成的 Bucket 名称
- Variable `SMOKE_BASE_URL` = DNS 切换前使用 OSS Bucket HTTPS Endpoint；切换后改为 `https://www.riyihome.com`
- Variable `SMOKE_OBJECT_PATHS` = DNS 切换前为 `true`，让探测请求显式的 `index.html`；切换后改为 `false`
- Optional Variable `GOOGLE_SITE_VERIFICATION`
- Optional Variable `BAIDU_SITE_VERIFICATION`
- Optional Variable `GOOGLE_ANALYTICS_ID`
- Optional Variable `BAIDU_ANALYTICS_ID`
- Optional Variable `UMAMI_SCRIPT_URL` 与 `UMAMI_WEBSITE_ID`（必须成对设置）

Environment `production-cleanup`：

- Secret `ALIYUN_CLEANUP_ACCESS_KEY_ID`
- Secret `ALIYUN_CLEANUP_ACCESS_KEY_SECRET`
- Variable `ALIYUN_OSS_REGION` = `oss-ap-northeast-1`
- Variable `ALIYUN_OSS_BUCKET` = 同一 Bucket 名称

Secrets 只在 GitHub UI 输入一次，不粘贴到 Issue、日志、Pages CMS、README 或本地 `.env`。

## Pages CMS 与仓库保护

1. 打开 https://app.pagescms.org/，使用客户 GitHub 账号登录。
2. 安装 Pages CMS GitHub App 时选择 “Only select repositories”，只勾选 Private 仓库 `riyi-blog`。
3. 在 Pages CMS 打开 `main`，确认能读取 `.pages.yml`，新文章默认显示为“草稿”。
4. GitHub 仓库 Settings → Rules → Rulesets：保护 `main`，禁止 force push 和 branch deletion。当前账号套餐对 Private 仓库 Rulesets API 返回 403；在升级 GitHub Pro 前保持仓库 Private，不启用 force push，并以 Git revert 回滚。升级后再补上这两条规则，不添加强制 PR，以免阻止 Pages CMS 保存文章。
5. GitHub Actions 权限保持只读默认权限；workflow 只声明 `contents: read`。

## DNS 切换

阿里云 CDN 会给 `www.riyihome.com` 返回一个 CNAME 目标。先通过 CDN 的域名检查和临时源站地址完成首页、文章、RSS 和 HTTPS 验收。通过后，在域名 DNS 中只新增或修改主机记录 `www`：

- 记录类型：CNAME
- 主机记录：www
- 记录值：阿里云 CDN 控制台实际返回的 CNAME
- TTL：切换阶段 600 秒

根域 `riyihome.com` 的现有记录不得修改。

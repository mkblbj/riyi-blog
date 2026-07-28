# 上线验收记录

状态：基础代码完成，云资源尚未配置

记录创建日期：2026-07-28

## 基础设施

- [ ] 东京 OSS Bucket 已创建，未启用版本控制
- [ ] CDN 已绑定 `www.riyihome.com`
- [ ] HTTPS 证书有效且 HTTP 自动跳转 HTTPS
- [ ] `www` CNAME 已生效，根域记录未修改
- [ ] 发布 RAM 的删除权限只覆盖目标 Bucket 的 `*.html`
- [ ] 清理 RAM 无上传和 CDN 权限
- [ ] Private 仓库 `main` 已禁止 force push 和删除（当前套餐需升级 GitHub Pro）

## 自动验证

- [ ] GitHub Actions build 和 deploy 成功
- [ ] 首页和最新三篇文章 smoke check 成功
- [ ] Performance 不低于 90
- [ ] Accessibility 不低于 90
- [ ] SEO 不低于 90

## 客户流程

- [ ] GitHub 登录 Pages CMS 成功
- [ ] 草稿不公开
- [ ] 发布后自动上线
- [ ] 修改标题后 URL 不变
- [ ] 归档后从 HTML、搜索、RSS 和 sitemap 移除
- [ ] “重新部署博客”动作成功

所有项目勾选后，将状态改为“通过”，并补充验收日期、Git commit SHA、Actions run URL、OSS Bucket 名称、CDN CNAME、证书到期日和三项 Lighthouse 实测分数。不得记录任何 AccessKey、Secret、token 或证书私钥。

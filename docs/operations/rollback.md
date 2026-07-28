# Git revert 回滚

Git 是内容和配置正本。严重内容或代码错误使用 Git revert，不在 OSS 中手工恢复对象，也不启用 OSS 版本控制。

1. 在 GitHub 找到最后一个正常生产部署对应的 commit。
2. 对引入问题的 commit 执行 GitHub “Revert”，或在本地运行 `git revert 问题commit`。
3. 把 revert commit 推送到 `main`。
4. 等待 Deploy production 完成。
5. 验证首页、受影响文章、RSS 和 sitemap。

若阿里云暂时不可用，停止继续保存内容并保留线上旧缓存；恢复后对同一 Git commit 运行 Pages CMS“重新部署博客”。禁止 force push `main`。

运维交付时会用只涉及文档的 commit 做一次正向 Git revert 和反向 Git revert 演练；不得用客户文章 commit 练习回滚。

# PokéSurvivor 开发与版本记录

## 仓库工作流

基于 JPTER78/pokesurvivor 开发，保留上游提交历史。`upstream` 用于获取原版更新，`origin` 用于保存我们的开发版本。后续每次完成版本迭代，都提交、创建版本标签并推送，确认远程同步成功。

版本号采用 `vMAJOR.MINOR.PATCH`：小修复递增 PATCH，兼容的新功能递增 MINOR，重大不兼容变更递增 MAJOR。标签与 `version.json` 的构建指纹用途不同：前者记录开发发布版本，后者驱动网页自动更新。

本地启动：

```powershell
Set-Location 'D:\GuguFiles\AIWorkspace\PokeSurvivor'
python -m http.server 8000 --bind 127.0.0.1
```

游戏入口：http://127.0.0.1:8000/ 。源码调试入口：http://127.0.0.1:8000/dev.html 。

完成版本后执行：

```powershell
git status --short
git diff --check
# 核对并明确暂存本版本文件，再提交；不要包含其他工作或敏感数据。
git commit -m '描述本版本的具体改动'
git tag -a vX.Y.Z -m '版本改动与验证摘要'
git push --atomic origin main vX.Y.Z
git ls-remote origin refs/heads/main refs/tags/vX.Y.Z 'refs/tags/vX.Y.Z^{}'
```

`main` 与标签解引用后的提交 SHA 应与本地本版本提交一致。若推送失败，处理原因后重试，不重写已推送历史。

## 版本记录

### v0.1.0 — 2026-10-14

- 开发起点：上游 `b297089`，保留源码、素材与 Git 历史。
- 建立独立开发仓库的 Git 工作流，记录每版本提交、标签、推送和验证要求。
- 增加 `AGENTS.md`，使后续开发遵循用户的持续推送要求。
- 验证：本地 HTTP 服务启动成功；游客模式进入战斗；地图、精灵、自动攻击、移动、暂停与继续正常；检查时没有浏览器 error 日志。
- 限制：尚未验证云存档和联机；本版本只建立开发基线和流程，没有改变游戏功能。

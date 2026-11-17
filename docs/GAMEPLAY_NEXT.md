# 玩法迭代维护线

## 维护目标

根据 2026-11-16 的开发安排，从已发布的 v0.42.0 提取独立维护线，用于后续原有玩法的迭代。

| 维护线 | 分支 | 本地目录 | 起点 |
| --- | --- | --- | --- |
| 稳定版 | `main` | `D:\GuguFiles\AIWorkspace\PokeSurvivor` | `v0.42.0` |
| 玩法迭代版 | `codex/gameplay-next` | `D:\GuguFiles\AIWorkspace\PokeSurvivor-Next` | `v0.42.0` / `d4fab1e` |

两个目录是同一仓库的 Git worktree，共享历史与远程，各自保留独立的工作文件和分支。无需复制仓库或覆盖稳定版目录。

## 版本与发布

- `v0.43.0-alpha.1` 标记维护线建立，仅包含开发文档；游戏运行时版本仍为 v0.42.0，尚无新增玩法。
- `v0.43.0-alpha.2` 为首个小队远征试玩版，玩法与兼容边界见 [EXPEDITION.md](EXPEDITION.md)。本地独立试玩端口为 8002。
- `v0.43.0-alpha.3` 修复队员动画与计时宝箱，新增独立拖拽编队/弹窗详情及战斗查看入口，并调整敌人生命和刷新量。
- `v0.43.0-alpha.4` 将伙伴领取和升级选择移至战后，加入四格候补/放生、队员阶级技能、可预览技能与阶级的商店、相邻支援技能及停步聚拢。
- 后续玩法开发在 `codex/gameplay-next` 提交，完成迭代后按语义化版本创建标签并推送该分支及标签，核对远程 SHA。
- 稳定维护仍在 `main`；仅将需要的修复经差异检查和验证后同步到另一条线，不自动合并整条玩法开发分支。
- 发布稳定版前需完成相应验证与兼容性说明；不得将开发分支直接部署到生产服务。
- 原版许可证、作者与素材署名，以及根目录 `AGENTS.md` 中的构建、测试、账号和安全约定继续适用。

玩法迭代线的推送示例：

```powershell
Set-Location 'D:\GuguFiles\AIWorkspace\PokeSurvivor-Next'
git branch --show-current
git diff --check
git push --atomic origin codex/gameplay-next vX.Y.Z-alpha.N
git ls-remote origin refs/heads/codex/gameplay-next refs/tags/vX.Y.Z-alpha.N 'refs/tags/vX.Y.Z-alpha.N^{}'
```

## 本地测试隔离

- 不复用稳定试玩服务的数据库、端口或浏览器存储；后续玩法试玩使用独立数据库、独立端口和独立浏览器配置。
- 不复制 `server/data/`、账号凭据或个人存档到新目录，不访问生产玩家存档。
- 新 worktree 不包含被忽略的依赖及测试缓存；需要启动自建服务时，在新目录执行 `npm --prefix server ci`。
- alpha.1 初始化时只建立维护线；alpha.2 使用独立 8002 试玩服务，不修改稳定版目录或稳定版存档。

后续玩法设计及兼容/迁移需求继续在本维护线的版本记录中说明。

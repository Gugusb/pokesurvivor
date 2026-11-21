# 远征主页设计与维护

本设计仅维护在 `codex/expedition-homepage` 分支，基于 `v0.43.0-alpha.47`，不合并到当前远征开发线。使用独立 worktree，原开发目录的未提交标题界面不纳入本版。

## 设计范围

按用户确认将 SELENE 参考提示词改为宝可梦主题：保留分层视差、先散尘后揭幕、横向档案卡、随滚动绘制的旅途轨迹。首屏直接提供开始与继续远征，向下探索为可选内容。没有照搬月球公司的介绍或预约表单。

首屏显示玩家实际选定的领队及联盟段位；伙伴档案提供图鉴、卡包、宝可梦招募和特性勋章入口；营地保留成长、孵蛋、补给、好友、排行榜、设置及交流群信息。全部功能抽屉提供快捷跳转，移动端声音、全屏与退出账号仍有入口。中、英、西三种界面文案均保留。

## 源码与构建

- `homepage/src/main.tsx`：React 19 / TypeScript 界面，沿用原有控件节点、ID 和事件。
- `homepage/src/scroll.ts`：Lenis 及滚动帧订阅，复用 `G.Game.frame`，不创建第二个动画主循环。滚动值写入 DOM/CSS，不逐帧触发 React 渲染。
- `homepage/src/style.css`：局部样式与 Tailwind 4 主题；不引入全局 preflight，不改战斗界面布局。
- `js/ui/homepage.js`：主菜单桥接和实际账号数据快照。覆盖式子页面打开后，将账号栏归还原层级。
- `js/ui/homepage-lib/`：Vite 6 构建产物，由正常游戏构建重新生成。正式游戏依然封装 G，开发模块仍排除。

初次检出需要 `npm --prefix homepage ci`。之后按项目原有顺序运行：

```powershell
node tools/build.js
node tools/export_data.js
py -3.14 tools/make_seo_pages.py
```

支持系统减少动态效果偏好及游戏原有减弱动画设置：取消固定滚动段和视差，卡片改为可水平滚动的普通栏目。抽屉支持键盘循环焦点及 Escape 关闭。图片、字体全部本地加载，不依赖在线字体服务。

## 美术素材

背景成品：`assets/homepage/expedition-dawn.png`，由内置 ImageGen 直接生成。首轮人物合成未产出素材；最终使用无角色的独立自然场景，宝可梦形象沿用项目原有 SpriteCollab 精灵。没有使用外部图像修改脚本；景深由网页 CSS 图层呈现。

最终生成提示词原文：

> Cinematic ultra-wide 16:9 landscape background plate for a fantasy exploration game's homepage. No characters, no animals, no logos, no typography, no UI. An immense mountain wilderness in the last moments before sunrise: layered indigo and slate-blue ridgelines, a pale winding river drawing a graceful curve from the lower center toward the distant horizon, thin mineral-teal mist pooled in the valleys, a quiet starry sky, soft moon in upper-right, thin muted warm amber light at the horizon. Rocky foreground ledge with a few dark grasses in the lower-right. Keep the horizon at 58 percent from the top. Keep the left 60 percent and the upper center as dark, uncluttered atmospheric negative space for large white website lettering. Elegant, rich painterly game environment key art with filmic atmospheric perspective, nuanced rock surfaces and soft edges in distant mountains. Deep blue-black and restrained silver-teal palette, very subtle gold. A sense of scale, quiet wonder, and a journey about to begin. No structures, no spacecraft, no people, no text, no border, no watermark.

本地字体位于 `assets/homepage/fonts/`：Manrope、Michroma、IBM Plex Mono，字体原文件来自 Google Fonts，目录包含各自 OFL 许可证。页脚保留原作者 JPTER78、改版开发署名及宝可梦/SpriteCollab 素材说明，法律声明沿用原入口。

## 验证边界

仅对本轮主页进行必要验证：严格 TypeScript 编译、正常游戏构建、隔离内存账号的实际网页跳转、开始/保存/继续流程、390/768/1280/1920 宽度无横向溢出及首屏出发可见、横向卡片焦点、减少动态效果。无需为纯视觉变更重跑战斗、服务端整套用例。本轮不部署站点，不重新打 APK；手机浏览器验证不能代替真机性能与 APK 安装验证。

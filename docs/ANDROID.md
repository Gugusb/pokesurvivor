# Android 客户端

客户端 1.0.0，包名 `cn.gugusb.pokesurvivor`。默认入口 `https://pokesurvivor.cn/`；这是用户指定 `http://43.108.85.216/` 在打包时实际跳转的 HTTPS 地址。APK 内不含账号、存档、服务器密码或开发者模式。

## 安装与使用

- 安装 `PokeSurvivor-Android-1.0.0.apk`，允许对应文件管理器安装此应用即可。只要求网络权限，不申请相册、通讯录、存储或定位权限。
- 最低 Android 7.0（API 24），目标 Android 16（API 36）。没有本机 `.so`，同一 APK 可用于 ARM、ARM64、x86 和 x86_64。系统 WebView 需要 Chromium 100+；旧组件会显示更新提示。最低系统版本不表示其出厂 WebView 可以直接运行游戏。
- 横竖屏、平板及屏幕缺口均由系统布局处理，不锁定横屏。返回键打开客户端菜单，可以继续、查看作者／素材署名、更改服务器或退出。
- 与网页使用同一账号服务，但 APK 与外部浏览器的 Cookie、设备设置、本机游客记录彼此独立。注册账号登录后由原服务器读取云存档。更换服务器地址会使用另一来源的独立登录和本机记录，不自动合并游客数据。
- 保留应用数据可保留登录和待同步记录。不要在未同步前清理应用数据或卸载；正在进行的战斗不能通过关闭客户端恢复。

## 网页更新与内置资源

内置全部现有宝可梦普通／闪光动作图、Mega 动作图、游戏图标和字体：14,011 个文件，81,438,637 字节（77.7 MiB）。源码、HTML、CSS、JS、API 和玩家数据不打包为旧离线版本。首次启动仍须连接服务器下载当前页面和脚本，之后按网页原有更新流程在安全时机更新；原有在线接口和存档队列不变。

每次导航先读取不缓存的 `version.json`。若匹配 APK 编译时记录的素材基线，直接使用包内资源。v0.44.0 构建 `81a70fdd6a` 也已核对为相同素材，可直接使用，不必先部署新服务。

遇到其他构建时，读取 `/mobile-assets.json?v=<构建指纹>`，其中记录各素材 SHA-256（gzip + base64 包装，约 643 KiB）。与内置哈希相同的文件本机读取；新增或改过的文件在线加载，核对哈希后缓存于 Android 可回收缓存目录。清单与网页版本不符、缺失或获取失败时退回普通在线加载，不固守旧内置图片。代码与账号接口不进入这套缓存。普通导航会重新核对，更新中的资源与清单应和代码一起上传。

`node tools/build.js` 已自动生成清单。**之后正常更新网页时同时发布 `mobile-assets.json` 即可，无须重新打 APK。** APK 1.0.0 也能玩未来兼容的网页版本。更换原生壳功能、提高系统／WebView要求或调整 Android 权限时才需要新的 APK，不能承诺原生层永不升级。

Android UA 标记 `PokeSurvivorAndroid/1.0.0` 使新版网页不注册 PWA 缓存；对于旧网页，客户端也拦截同源 `sw.js`，卸载旧游戏缓存，避免 PWA 的旧图片覆盖资源更新。未知外部来源不走本机素材拦截。

## 构建

本项目使用系统 Java 和官方 SDK 命令行工具直接编译，不依赖 Gradle、Node 原生插件或第三方套壳服务。

1. 安装 JDK 17+、Node.js 24 和 Android SDK。通过官方 SDK Manager 安装 `platforms;android-36`、`build-tools;36.0.0`；真机／模拟器调试另需 `platform-tools`。
2. 设置 `JAVA_HOME` 和 `ANDROID_HOME`，或给脚本传 `-SdkRoot`。本机隔离 SDK 默认放 `tools/cache/android-sdk/sdk`（忽略提交）。
3. 在仓库根目录按顺序执行：

```powershell
node tools/build.js
node tools/export_data.js
py -3.14 tools/make_seo_pages.py
& tools/build_android.ps1
```

产物在被 Git 忽略的 `outputs/android/`，包含 APK、SHA-256 和素材统计。脚本校验签名和 ZIP 对齐；正式 APK 不可调试，没有源码调试入口。`android/client.json` 管理壳版本、最低 SDK、目标 SDK 和默认地址；游戏版本与壳版本独立。

首次构建在 `%LOCALAPPDATA%\PokeSurvivor\android-signing\` 生成私有签名密钥和密码文件。**请在仓库之外备份这个文件夹**，之后客户端覆盖安装必须保留同一签名，增加 `versionCode`。不要上传密钥／密码、不要把它们放进 APK。丢失密钥时旧应用不能被新签名覆盖安装。

## 验证

```powershell
node --test tools/test_android.cjs
node tools/qa_release_mode.cjs
& tools/build_android.ps1 -Qa
# 仅供隔离模拟器测试；不能发布 QA APK。
$env:ANDROID_QA_SERIAL='emulator-5580'
node tools/qa_android.cjs
```

Android 集成脚本使用内存数据库、随机本地端口和独立 QA 包，验证本机素材命中、网页游戏、素材变更、缺失清单回退及本机存储保留，不操作真实玩家数据。QA 包可接受测试服务器启动参数并开放 WebView 检查；正式包禁用这些能力。

安全边界：仅同源、白名单路径的公开图片／字体可拦截；不提供 JavaScript 原生桥、不访问任意本地文件、不忽略 TLS 错误。自定义 HTTP 服务器需在原生界面确认，默认 HTTPS；HTTP 登录本身不加密。外部链接交给浏览器。默认服务器发生域名迁移时可在返回菜单修改地址。

保留 JPTER78 原版许可证、SpriteCollab 普通／Mega 逐作者署名和 Pixelify 字体 OFL；APK 内可离线查看，游戏原支持页及赞助链接保留。此包装不改变原有素材使用许可。

参考：[Android WebView 请求拦截](https://developer.android.com/reference/android/webkit/WebViewClient)、[WebView 本地文件安全](https://developer.android.com/privacy-and-security/risks/webview-unsafe-file-inclusion)、[官方 SDK 命令行工具](https://developer.android.com/tools)。

# 远征单机测试 APK

独立包名 `com.gugusb.pokesurvivor.offlinetest`，Android 8.0 及以上，横屏。
所有网页、图像、字体与音效随包提供；不申请 INTERNET 权限，不连接账号、排行榜或联机服务。

首次启动自动建立本机测试档，发放 **100,000,000 宝可梦币和 10,000 张单抽券**。
它们属于账号资源，不是远征内金币。后续启动保留实际消耗，不重复补满。
远征沿用每五天自动保存和设置内手动保存；战斗中退出保存开战节点。
清除应用数据或卸载会删除本机进度。应用使用独立测试签名，不用于正式发行。

构建需要 Java 17+、Android SDK platform 35、build-tools 35.0.0，以及已缓存的 Terser 5.51.2：

```powershell
node tools/build_android_offline.cjs --sdk $env:ANDROID_HOME --java $env:JAVA_HOME
```

可用 `--terser <terser/bin/terser 的绝对路径>` 指定现有 Terser CLI。
`--web-only` 仅生成封装后的离线网页，供浏览器验证。
输出、临时测试签名及口令均位于 Git 忽略的 `tools/cache/android-offline/`，不提交凭据或签名私钥。
脚本只在离线副本中修改登录与初始赠送，不修改正式网页构建，不包含调试模块，不暴露 `G`。

安装文件为 `PokeSurvivor-Next-alpha.55-offline.apk`，旁边提供 SHA-256 校验文件。
代码与资源继续保留项目 LICENSE、CREDITS 和素材署名。

打包后必须通过签名校验和 `node tools/check_android_apk.cjs <APK路径>`：
`resources.arsc` 保持未压缩并按4字节对齐，包内路径统一使用正斜杠。
任何一项失败，构建脚本不得将安装包报告为成功。

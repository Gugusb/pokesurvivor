param([switch]$Qa,[string]$SdkRoot=$env:ANDROID_HOME)
$ErrorActionPreference='Stop'
$taskRoot=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $taskRoot
if(-not $SdkRoot){$SdkRoot=Join-Path $taskRoot 'tools/cache/android-sdk/sdk'}
$taskSdk=[IO.Path]::GetFullPath($SdkRoot)
$taskTools=Join-Path $taskSdk 'build-tools/36.0.0'
$taskJar=Join-Path $taskSdk 'platforms/android-36/android.jar'
foreach($taskNeed in @($taskJar,(Join-Path $taskTools 'aapt2.exe'),(Join-Path $taskTools 'lib/d8.jar'))){if(-not(Test-Path -LiteralPath $taskNeed)){throw "Missing Android SDK component: $taskNeed. Install platforms;android-36 and build-tools;36.0.0 (docs/ANDROID.md)."}}
function Invoke-TaskTool([string]$Exe,[string[]]$Arguments){& $Exe @Arguments;if($LASTEXITCODE -ne 0){throw "Build failed: $Exe ($LASTEXITCODE)"}}
$taskJava=if($env:JAVA_HOME){Join-Path $env:JAVA_HOME 'bin/java.exe'}else{(Get-Command java).Source}
$taskJavaBin=Split-Path -Parent $taskJava
$taskMode=if($Qa){'qa'}else{'release'}
$taskOut=Join-Path $taskRoot "android/build/$taskMode"
# A fresh staging tree prevents deleted art or stale dex files surviving a rebuild.
$taskStage=[IO.Path]::GetFullPath($taskOut)
$taskAllowed=[IO.Path]::GetFullPath((Join-Path $taskRoot 'android/build'))+[IO.Path]::DirectorySeparatorChar
if(-not $taskStage.StartsWith($taskAllowed,[StringComparison]::OrdinalIgnoreCase)){throw 'Invalid build directory'}
if(Test-Path -LiteralPath $taskStage){Remove-Item -LiteralPath $taskStage -Recurse -Force}
$taskPrepare=@('tools/prepare_android.cjs');if($Qa){$taskPrepare+='--qa'}
Invoke-TaskTool 'node' $taskPrepare
$taskClient=Get-Content android/client.json -Raw | ConvertFrom-Json
New-Item -ItemType Directory -Force -Path "$taskOut/classes","$taskOut/dex" | Out-Null
Invoke-TaskTool (Join-Path $taskTools 'aapt2.exe') @('compile','--dir',"$taskOut/res",'-o',"$taskOut/res.zip")
Invoke-TaskTool (Join-Path $taskTools 'aapt2.exe') @('link','-I',$taskJar,'--manifest',"$taskOut/AndroidManifest.xml",'-o',"$taskOut/base.apk",'-A',"$taskOut/assets",'--min-sdk-version',"$($taskClient.minSdk)",'--target-sdk-version',"$($taskClient.targetSdk)",'--version-code',"$($taskClient.versionCode)",'--version-name',"$($taskClient.versionName)","$taskOut/res.zip")
$taskSources=@(Get-ChildItem android/src,"$taskOut/generated" -Recurse -Filter '*.java' | ForEach-Object FullName)
Invoke-TaskTool (Join-Path $taskJavaBin 'javac.exe') (@('--release','8','-encoding','UTF-8','-classpath',$taskJar,'-d',"$taskOut/classes")+$taskSources)
$taskClasses=@(Get-ChildItem "$taskOut/classes" -Recurse -Filter '*.class' | ForEach-Object FullName)
Invoke-TaskTool $taskJava (@('-cp',"$taskTools/lib/d8.jar",'com.android.tools.r8.D8','--release','--min-api',"$($taskClient.minSdk)",'--lib',$taskJar,'--output',"$taskOut/dex")+$taskClasses)
Copy-Item -LiteralPath "$taskOut/base.apk" -Destination "$taskOut/unsigned.apk" -Force
# jar updates the ZIP; zipalign runs afterwards, before signing.
Invoke-TaskTool (Join-Path $taskJavaBin 'jar.exe') @('uf',"$taskOut/unsigned.apk",'-C',"$taskOut/dex",'classes.dex')
Invoke-TaskTool (Join-Path $taskTools 'zipalign.exe') @('-f','4',"$taskOut/unsigned.apk","$taskOut/aligned.apk")
# Private signing key is deliberately outside the repository and APK.
$taskSigning=Join-Path $env:LOCALAPPDATA 'PokeSurvivor/android-signing'
New-Item -ItemType Directory -Force -Path $taskSigning | Out-Null
$taskKey=Join-Path $taskSigning "$taskMode.p12"
$taskPassword=Join-Path $taskSigning "$taskMode.password"
if(-not(Test-Path -LiteralPath $taskKey)){
  if(Test-Path -LiteralPath $taskPassword){throw 'Password exists but signing key is missing; restore the key before building.'}
  $taskRandom=[byte[]]::new(32);[Security.Cryptography.RandomNumberGenerator]::Fill($taskRandom)
  [IO.File]::WriteAllText($taskPassword,[Convert]::ToBase64String($taskRandom),[Text.UTF8Encoding]::new($false))
  Invoke-TaskTool (Join-Path $taskJavaBin 'keytool.exe') @('-genkeypair','-keystore',$taskKey,'-storetype','PKCS12','-storepass:file',$taskPassword,'-alias','pokesurvivor','-keyalg','RSA','-keysize','3072','-validity','10000','-dname','CN=Gugusb, OU=PokeSurvivor, O=Gugusb')
}
$taskDest=Join-Path $taskRoot 'outputs/android';New-Item -ItemType Directory -Force -Path $taskDest | Out-Null
$taskApk=Join-Path $taskDest "PokeSurvivor-Android-$($taskClient.versionName)$(if($Qa){'-QA'}).apk"
Invoke-TaskTool $taskJava @('-jar',"$taskTools/lib/apksigner.jar",'sign','--ks',$taskKey,'--ks-key-alias','pokesurvivor','--ks-pass',"file:$taskPassword",'--out',$taskApk,"$taskOut/aligned.apk")
Invoke-TaskTool $taskJava @('-jar',"$taskTools/lib/apksigner.jar",'verify','--verbose','--print-certs',$taskApk)
Invoke-TaskTool (Join-Path $taskTools 'zipalign.exe') @('-c','4',$taskApk)
$taskHash=(Get-FileHash -LiteralPath $taskApk -Algorithm SHA256).Hash.ToLowerInvariant()
[IO.File]::WriteAllText("$taskApk.sha256","$taskHash  $([IO.Path]::GetFileName($taskApk))`n",[Text.UTF8Encoding]::new($false))
Copy-Item -LiteralPath "$taskOut/bundle-info.json" -Destination (Join-Path $taskDest "bundle-info-$taskMode.json") -Force
Write-Output "APK: $taskApk ($([math]::Round((Get-Item -LiteralPath $taskApk).Length/1MB,1)) MiB)"

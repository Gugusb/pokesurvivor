package cn.gugusb.pokesurvivor;

import android.app.*;
import android.content.*;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.*;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import java.util.regex.*;

public final class MainActivity extends Activity {
    private WebView web;
    private AssetStore assets;
    private FrameLayout root;
    private LinearLayout error;
    private ProgressBar progress;
    private String server;
    private ValueCallback<Uri[]> fileCallback;
    private View fullscreenView;
    private WebChromeClient.CustomViewCallback fullscreenCallback;
    private boolean menuOpen, destroyed;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        server=getPreferences(0).getString("server",ClientConfig.DEFAULT_URL);
        if(ClientConfig.DEBUG&&getIntent().hasExtra("server"))server=AssetPolicy.server(getIntent().getStringExtra("server"));
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        root=new FrameLayout(this); root.setBackgroundColor(Color.rgb(10,20,48));setContentView(root);
        root.setOnApplyWindowInsetsListener((v,insets)->{
            if(Build.VERSION.SDK_INT>=30){android.graphics.Insets safe=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());v.setPadding(safe.left,safe.top,safe.right,safe.bottom);}
            else v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            return insets;
        });
        try { assets=new AssetStore(this); } catch(Exception e){showError("内置素材读取失败，请重新安装客户端。");return;}
        WebView.setWebContentsDebuggingEnabled(ClientConfig.DEBUG);
        try{web=new WebView(this);}catch(Exception e){showError("无法启动系统 WebView。请安装或更新 Android System WebView 后重试。");return;}
        WebSettings settings=web.getSettings();
        String ua=settings.getUserAgentString();
        settings.setUserAgentString(ua+" PokeSurvivorAndroid/"+ClientConfig.VERSION);
        Matcher m=Pattern.compile("Chrome/(\\d+)").matcher(ua);
        if(!m.find()||Integer.parseInt(m.group(1))<ClientConfig.MIN_CHROMIUM){
            web.destroy();web=null;showError("系统网页组件版本较旧，请先更新 Android System WebView 或 Chrome（需要 Chromium "+ClientConfig.MIN_CHROMIUM+" 或更新版本）。");return;
        }
        settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(false);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportMultipleWindows(true);
        CookieManager.getInstance().setAcceptCookie(true);CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        web.setBackgroundColor(Color.rgb(10,20,48));
        root.addView(web,new FrameLayout.LayoutParams(-1,-1));
        progress=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);
        FrameLayout.LayoutParams pp=new FrameLayout.LayoutParams(-1,dp(3),Gravity.TOP);root.addView(progress,pp);
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){
                if(!r.isForMainFrame())return false;
                String url=r.getUrl().toString();
                if(AssetPolicy.sameOrigin(server,url))return false;
                external(url);return true;
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){
                if(!"GET".equals(r.getMethod()))return null;
                return assets.intercept(r.getUrl().toString());
            }
            @Override public void onPageStarted(WebView v,String url,android.graphics.Bitmap icon){
                if(AssetPolicy.sameOrigin(server,url))assets.prepare(server);
                progress.setVisibility(View.VISIBLE);
            }
            @Override public void onPageFinished(WebView v,String url){CookieManager.getInstance().flush();progress.setVisibility(View.GONE);}
            @Override public void onReceivedError(WebView v,WebResourceRequest r,WebResourceError e){if(r.isForMainFrame())showError("暂时连不上游戏服务器。请检查网络后重试，已有本机记录会保留。");}
            @Override public void onReceivedHttpError(WebView v,WebResourceRequest r,WebResourceResponse e){if(r.isForMainFrame())showError("游戏服务器暂时不可用（"+e.getStatusCode()+"）。请稍后重试。");}
            @Override public void onReceivedSslError(WebView v,SslErrorHandler h,SslError e){h.cancel();showError("服务器证书校验未通过。请检查手机时间或联系服务器维护者。");}
            @Override public boolean onRenderProcessGone(WebView v,RenderProcessGoneDetail detail){
                root.removeView(v);v.destroy();web=null;showError("网页组件已停止运行。重新打开客户端后可读取本机记录。");return true;
            }
        });
        if(Build.VERSION.SDK_INT>=24)ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebResourceRequest r){return "GET".equals(r.getMethod())?assets.intercept(r.getUrl().toString()):null;}
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public void onShowCustomView(View view,CustomViewCallback callback){
                if(fullscreenView!=null){callback.onCustomViewHidden();return;}
                fullscreenView=view;fullscreenCallback=callback;root.addView(view,new FrameLayout.LayoutParams(-1,-1));
            }
            @Override public void onHideCustomView(){leaveFullscreen();}
            @Override public void onProgressChanged(WebView v,int p){progress.setProgress(p);}
            @Override public boolean onCreateWindow(WebView v,boolean dialog,boolean gesture,Message message){
                if(!gesture)return false;
                WebView popup=new WebView(MainActivity.this);
                popup.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView p,WebResourceRequest r){external(r.getUrl().toString());p.destroy();return true;}});
                ((WebView.WebViewTransport)message.obj).setWebView(popup);message.sendToTarget();return true;
            }
            @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> callback,FileChooserParams params){
                if(fileCallback!=null)fileCallback.onReceiveValue(null);fileCallback=callback;
                Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("application/json");
                try{startActivityForResult(intent,41);}catch(Exception e){callback.onReceiveValue(null);fileCallback=null;}return true;
            }
        });
        load();
    }
    private void load(){
        if(web==null){recreate();return;}
        if(error!=null){root.removeView(error);error=null;}
        web.setVisibility(View.VISIBLE);web.loadUrl(server);
    }
    private int dp(int p){return Math.round(p*getResources().getDisplayMetrics().density);}
    private Button button(String text,Runnable run){Button b=new Button(this);b.setText(text);b.setOnClickListener(v->run.run());return b;}
    private void showError(String text){
        if(destroyed)return;
        if(error!=null)root.removeView(error);
        if(web!=null)web.setVisibility(View.INVISIBLE);
        error=new LinearLayout(this);error.setOrientation(LinearLayout.VERTICAL);error.setGravity(Gravity.CENTER);error.setPadding(dp(28),dp(20),dp(28),dp(20));error.setBackgroundColor(Color.rgb(10,20,48));
        TextView title=new TextView(this);title.setText("PokéSurvivor");title.setTextSize(28);title.setTextColor(Color.WHITE);error.addView(title);
        TextView body=new TextView(this);body.setText(text+"\n\n"+server);body.setTextColor(Color.LTGRAY);body.setTextSize(16);body.setPadding(0,dp(20),0,dp(20));error.addView(body);
        error.addView(button("重试",()->load()));error.addView(button("服务器设置",()->editServer()));error.addView(button("在浏览器中打开",()->external(server)));
        root.addView(error,new FrameLayout.LayoutParams(-1,-1));
    }
    private void external(String address){
        try{Uri u=Uri.parse(address);if("http".equals(u.getScheme())||"https".equals(u.getScheme()))startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception ignored){}
    }
    private void editServer(){
        EditText input=new EditText(this);input.setSingleLine(true);input.setInputType(android.text.InputType.TYPE_CLASS_TEXT|android.text.InputType.TYPE_TEXT_VARIATION_URI);input.setText(server);
        AlertDialog d=new AlertDialog.Builder(this).setTitle("游戏服务器").setMessage("更换地址后会使用该服务器独立的登录和本机记录。建议使用 HTTPS。")
            .setView(input).setNegativeButton("取消",null).setPositiveButton("保存",null).create();
        d.setOnShowListener(v->d.getButton(-1).setOnClickListener(w->{
            try{String next=AssetPolicy.server(input.getText().toString());
                Runnable use=()->{server=next;getPreferences(0).edit().putString("server",server).apply();d.dismiss();if(web!=null)web.clearHistory();load();};
                if(next.startsWith("http://"))new AlertDialog.Builder(this).setTitle("使用 HTTP 地址？").setMessage("该连接不加密。只有信任这个网络与服务器时才继续。 ").setNegativeButton("取消",null).setPositiveButton("继续",(a,b)->use.run()).show();else use.run();
            }catch(IllegalArgumentException e){input.setError(e.getMessage());}
        }));d.show();
    }
    private void leaveFullscreen(){if(fullscreenView!=null){root.removeView(fullscreenView);fullscreenView=null;WebChromeClient.CustomViewCallback c=fullscreenCallback;fullscreenCallback=null;if(c!=null)c.onCustomViewHidden();}}
    private void credits(){
        StringBuilder text=new StringBuilder("原版作者 JPTER78\n改版策划 Gugusb · 共同开发 大肥鱼\n\n");
        for(String p:new String[]{"LICENSE","CREDITS.md","docs/MEGA_ASSET_CREDITS.md","assets/fonts/OFL.txt"}){
            text.append("\n—— ").append(p).append(" ——\n");
            try(java.io.InputStream in=getAssets().open("credits/"+p);java.io.ByteArrayOutputStream out=new java.io.ByteArrayOutputStream()){
                byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1)out.write(b,0,n);text.append(new String(out.toByteArray(),"UTF-8"));
            }catch(Exception e){text.append("请在游戏支持页查看署名。");}
        }
        ScrollView scroll=new ScrollView(this);TextView body=new TextView(this);body.setText(text);body.setTextIsSelectable(true);body.setPadding(dp(18),dp(12),dp(18),dp(12));scroll.addView(body);
        new AlertDialog.Builder(this).setTitle("作者与素材署名").setView(scroll).setPositiveButton("返回",null).show();
    }
    @Override public void onBackPressed(){
        if(fullscreenView!=null){leaveFullscreen();return;}
        if(menuOpen)return;menuOpen=true;if(web!=null){web.onPause();web.pauseTimers();}
        String info="客户端 "+ClientConfig.VERSION+" · Android "+Build.VERSION.RELEASE+"\n网页随服务器更新\n"+(assets==null?"":assets.status+" · 本次命中 "+assets.localHits.get()+" 次");
        AlertDialog dialog=new AlertDialog.Builder(this).setTitle("PokéSurvivor").setMessage(info).setView(button("作者与素材署名",()->credits()))
            .setPositiveButton("继续游戏",null).setNeutralButton("服务器设置",(d,w)->editServer())
            .setNegativeButton("关闭客户端",(d,w)->new AlertDialog.Builder(this).setTitle("关闭客户端？").setMessage("正在进行的战斗不能恢复，请先在游戏内结束本局。").setNegativeButton("返回",null).setPositiveButton("关闭",(a,b)->finish()).show()).create();
        dialog.setOnDismissListener(d->{menuOpen=false;if(web!=null){web.onResume();web.resumeTimers();}});dialog.show();
    }
    @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==41&&fileCallback!=null){fileCallback.onReceiveValue(result==RESULT_OK&&data!=null?new Uri[]{data.getData()}:null);fileCallback=null;}}
    @Override protected void onPause(){super.onPause();CookieManager.getInstance().flush();if(web!=null){web.onPause();web.pauseTimers();}}
    @Override protected void onResume(){super.onResume();if(web!=null&&!menuOpen){web.onResume();web.resumeTimers();}}
    @Override public void onWindowFocusChanged(boolean focus){super.onWindowFocusChanged(focus);if(focus)getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY|View.SYSTEM_UI_FLAG_LAYOUT_STABLE);}
    @Override protected void onDestroy(){destroyed=true;if(assets!=null)assets.close();if(fileCallback!=null)fileCallback.onReceiveValue(null);if(web!=null){web.resumeTimers();root.removeView(web);web.destroy();}super.onDestroy();}
}

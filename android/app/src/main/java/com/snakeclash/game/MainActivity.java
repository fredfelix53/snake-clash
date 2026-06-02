package com.snakeclash.game;

import android.annotation.SuppressLint;
import android.os.Bundle;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.initialization.InitializationStatus;
import com.google.android.gms.ads.initialization.OnInitializationCompleteListener;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import com.google.android.gms.ads.OnUserEarnedRewardListener;
import com.google.android.gms.ads.rewarded.RewardItem;
import com.google.android.gms.ads.LoadAdError;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private AdView bannerAdView;
    private RewardedAd rewardedAd;
    private static final String TAG = "SnakeClash";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Setup WebView FIRST - before AdMob - so game loads even if ads fail
        setupWebView();

        // Initialize AdMob (wrapped to prevent crash)
        try {
            MobileAds.initialize(this, new OnInitializationCompleteListener() {
                @Override
                public void onInitializationComplete(InitializationStatus initializationStatus) {
                    loadBannerAd();
                    loadRewardedAd();
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "AdMob init failed: " + e.getMessage());
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        try {
            webView = findViewById(R.id.webView);
            if (webView == null) {
                Log.e(TAG, "WebView not found in layout!");
                return;
            }

            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
            settings.setLayoutAlgorithm(WebSettings.LayoutAlgorithm.NARROW_COLUMNS);
            settings.setLoadWithOverviewMode(true);
            settings.setUseWideViewPort(true);
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);

            webView.setWebChromeClient(new WebChromeClient());
            webView.setWebViewClient(new WebViewClient() {
                @Override
                public void onPageFinished(WebView view, String url) {
                    super.onPageFinished(view, url);
                    Log.d(TAG, "Game loaded: " + url);
                    view.evaluateJavascript(
                        "window.AndroidAds = {};", null);
                    view.evaluateJavascript(
                        "if(typeof window.onAndroidReady === 'function') window.onAndroidReady();", null);
                }

                @Override
                public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                    Log.e(TAG, "WebView error " + errorCode + ": " + description);
                }
            });

            webView.addJavascriptInterface(new Object() {
                @JavascriptInterface
                public void onAdWatched() {
                    runOnUiThread(() -> {
                        Log.d(TAG, "Ad watched callback");
                        loadRewardedAd();
                    });
                }
                @JavascriptInterface
                public void logMessage(String message) {
                    Log.d(TAG, "JS: " + message);
                }
            }, "AdBridge");

            webView.loadUrl("file:///android_asset/game/index.html");
        } catch (Exception e) {
            Log.e(TAG, "WebView setup failed: " + e.getMessage());
        }
    }

    private void loadBannerAd() {
        try {
            FrameLayout adContainer = findViewById(R.id.bannerContainer);
            if (adContainer == null) return;

            bannerAdView = new AdView(this);
            bannerAdView.setAdUnitId("ca-app-pub-3940256099942544/6300978111");
            bannerAdView.setAdSize(AdSize.SMART_BANNER);
            adContainer.addView(bannerAdView);
            bannerAdView.loadAd(new AdRequest.Builder().build());
        } catch (Exception e) {
            Log.e(TAG, "Banner ad failed: " + e.getMessage());
        }
    }

    private void loadRewardedAd() {
        try {
            AdRequest request = new AdRequest.Builder().build();
            RewardedAd.load(this, "ca-app-pub-3940256099942544/5224354917",
                request, new RewardedAdLoadCallback() {
                    @Override
                    public void onAdLoaded(RewardedAd ad) {
                        rewardedAd = ad;
                        if (webView != null) {
                            webView.evaluateJavascript(
                                "if(typeof window.onRewardedReady === 'function') window.onRewardedReady();", null);
                        }
                    }
                    @Override
                    public void onAdFailedToLoad(LoadAdError loadAdError) {
                        Log.w(TAG, "Rewarded ad failed: " + loadAdError.getMessage());
                    }
                });
        } catch (Exception e) {
            Log.e(TAG, "Rewarded ad load failed: " + e.getMessage());
        }
    }

    @android.webkit.JavascriptInterface
    public void showRewardedAd() {
        runOnUiThread(() -> {
            if (rewardedAd != null) {
                rewardedAd.show(MainActivity.this, rewardItem -> {
                    if (webView != null) {
                        webView.evaluateJavascript(
                            "if(typeof window.onAdReward === 'function') window.onAdReward();", null);
                    }
                });
            }
        });
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}

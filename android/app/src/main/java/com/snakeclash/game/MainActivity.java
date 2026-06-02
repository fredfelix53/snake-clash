package com.snakeclash.game;

import android.annotation.SuppressLint;
import android.os.Bundle;
import android.view.View;
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
    private boolean adLoaded = false;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Initialize AdMob
        MobileAds.initialize(this, new OnInitializationCompleteListener() {
            @Override
            public void onInitializationComplete(InitializationStatus initializationStatus) {
                loadBannerAd();
                loadRewardedAd();
            }
        });

        // Setup WebView
        webView = findViewById(R.id.webView);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setRenderPriority(WebSettings.RenderPriority.HIGH);
        settings.setLayoutAlgorithm(WebSettings.LayoutAlgorithm.SINGLE_COLUMN);

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // Inject the Android ad interface
                view.evaluateJavascript(
                    "window.AndroidAds = {" +
                    "  showRewarded: function(callback) {" +
                    "    document.AD_PENDING = callback;" +
                    "    document.AD_TRIGGER = Date.now();" +
                    "  }" +
                    "};", null);
            }
        });

        // JavaScript interface for ad callbacks
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void onAdWatched() {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        loadRewardedAd(); // preload next
                    }
                });
            }
        }, "AdBridge");

        // Load game
        webView.loadUrl("file:///android_asset/game/index.html");
    }

    private void loadBannerAd() {
        FrameLayout adContainer = findViewById(R.id.bannerContainer);
        bannerAdView = new AdView(this);
        bannerAdView.setAdUnitId("ca-app-pub-3940256099942544/6300978111"); // Test banner ad unit
        bannerAdView.setAdSize(AdSize.BANNER);
        adContainer.addView(bannerAdView);

        AdRequest request = new AdRequest.Builder().build();
        bannerAdView.loadAd(request);
    }

    private void loadRewardedAd() {
        AdRequest request = new AdRequest.Builder().build();
        RewardedAd.load(this, "ca-app-pub-3940256099942544/5224354917", // Test rewarded ad unit
            request, new RewardedAdLoadCallback() {
                @Override
                public void onAdLoaded(RewardedAd ad) {
                    rewardedAd = ad;
                    adLoaded = true;
                    webView.evaluateJavascript(
                        "if(typeof window.onRewardedReady === 'function') window.onRewardedReady();", null);
                }

                @Override
                public void onAdFailedToLoad(LoadAdError loadAdError) {
                    adLoaded = false;
                    webView.evaluateJavascript(
                        "console.log('Rewarded ad failed to load');", null);
                }
            });
    }

    public void showRewardedAd() {
        if (rewardedAd != null) {
            rewardedAd.show(this, new OnUserEarnedRewardListener() {
                @Override
                public void onUserEarnedReward(RewardItem rewardItem) {
                    webView.evaluateJavascript(
                        "if(typeof window.onAdReward === 'function') window.onAdReward();", null);
                }
            });
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}

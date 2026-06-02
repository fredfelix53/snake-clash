# Snake Clash ProGuard rules
-keepattributes *Annotation*
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-dontwarn com.google.android.gms.**
-keep class com.google.android.gms.** { *; }

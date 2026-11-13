# Add project specific ProGuard rules here.
# Preserve source locations for release crash reports. Capacitor and Firebase
# supply their own consumer rules for reflection and JavaScript bridge methods.
-keepattributes SourceFile,LineNumberTable

# Firebase Authentication compiles optional Facebook support against compileOnly
# dependencies. FoodGaon enables phone/google.com only; no Facebook SDK is shipped.
# Suppress only the absent optional types reported by R8, not other missing classes.
-dontwarn com.facebook.CallbackManager
-dontwarn com.facebook.CallbackManager$Factory
-dontwarn com.facebook.FacebookCallback
-dontwarn com.facebook.login.LoginManager
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

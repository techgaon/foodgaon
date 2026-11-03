package in.pandeytechno.petpyaar;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.ActivityCallback;
import androidx.activity.result.ActivityResult;

import java.util.List;

/** फ़ोन में मौजूद UPI ऐप (Google Pay, PhonePe, Paytm, BHIM…) की सूची और उनसे भुगतान खोलना */
@CapacitorPlugin(name = "UpiPay")
public class UpiPlugin extends Plugin {

    @PluginMethod
    public void apps(PluginCall call) {
        PackageManager pm = getContext().getPackageManager();
        Intent probe = new Intent(Intent.ACTION_VIEW, Uri.parse("upi://pay?pa=test@upi&pn=Test&am=1&cu=INR"));
        List<ResolveInfo> list = pm.queryIntentActivities(probe, 0);
        JSArray arr = new JSArray();
        java.util.HashSet<String> seen = new java.util.HashSet<>();
        for (ResolveInfo ri : list) {
            String pkg = ri.activityInfo.packageName;
            if (seen.contains(pkg)) continue;
            seen.add(pkg);
            JSObject o = new JSObject();
            o.put("package", pkg);
            o.put("label", String.valueOf(ri.loadLabel(pm)));
            try { o.put("icon", iconPng(ri.loadIcon(pm))); } catch (Exception ignore) { }
            arr.put(o);
        }
        JSObject ret = new JSObject();
        ret.put("apps", arr);
        call.resolve(ret);
    }

    /** the app's own launcher icon (from the phone) as a small PNG data URL */
    private static String iconPng(android.graphics.drawable.Drawable d) {
        int size = 96;
        android.graphics.Bitmap bmp = android.graphics.Bitmap.createBitmap(size, size, android.graphics.Bitmap.Config.ARGB_8888);
        android.graphics.Canvas c = new android.graphics.Canvas(bmp);
        d.setBounds(0, 0, size, size);
        d.draw(c);
        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
        bmp.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, out);
        return "data:image/png;base64," + android.util.Base64.encodeToString(out.toByteArray(), android.util.Base64.NO_WRAP);
    }

    /** Opens the UPI app and waits for it to come back; resolves with the UPI app's own answer
     *  { status: SUCCESS | SUBMITTED | FAILURE | CANCELLED | UNKNOWN, txnId, txnRef, responseCode, raw } */
    @PluginMethod
    public void pay(PluginCall call) {
        String url = call.getString("url");
        String pkg = call.getString("package");
        if (url == null || !"upi".equalsIgnoreCase(Uri.parse(url).getScheme()) || !"pay".equalsIgnoreCase(Uri.parse(url).getHost())) { call.reject("Invalid UPI URI"); return; }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            if (pkg != null && !pkg.isEmpty()) {
                intent.setPackage(pkg);
                if (intent.resolveActivity(getContext().getPackageManager()) == null) { call.reject("No UPI app"); return; }
                startActivityForResult(call, intent, "upiResult");
            } else {
                Intent chooser = Intent.createChooser(intent, "UPI ऐप चुनें / Choose UPI app");
                startActivityForResult(call, chooser, "upiResult");
            }
        } catch (Exception e) {
            call.reject("No UPI app", e);
        }
    }

    @ActivityCallback
    private void upiResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject ret = new JSObject();
        String raw = "";
        Intent data = result.getData();
        if (data != null) {
            raw = data.getStringExtra("response");
            if (raw == null || raw.isEmpty()) {
                Uri.Builder response = new Uri.Builder();
                for (String key : new String[]{"Status", "status", "txnId", "txnRef", "ApprovalRefNo", "approvalRefNo", "responseCode"}) {
                    String value = data.getStringExtra(key);
                    if (value != null) response.appendQueryParameter(key, value);
                }
                raw = response.build().getEncodedQuery();
            }
        }
        String status = "UNKNOWN"; String txnId = ""; String txnRef = ""; String code = ""; String approvalRef = "";
        if (raw != null && !raw.isEmpty()) {
            for (String part : raw.split("&")) {
                String[] kv = part.split("=", 2);
                if (kv.length < 2) continue;
                String k = kv[0].trim().toLowerCase(); String v = Uri.decode(kv[1]).trim();
                if (k.equals("status")) status = v.toUpperCase();
                else if (k.equals("txnid")) txnId = v;
                else if (k.equals("txnref")) txnRef = v;
                else if (k.equals("approvalrefno") || k.equals("utr")) approvalRef = v;
                else if (k.equals("responsecode")) code = v;
            }
        } else if (result.getResultCode() == android.app.Activity.RESULT_CANCELED) {
            status = "CANCELLED";
        }
        ret.put("status", status);
        ret.put("txnId", txnId);
        ret.put("txnRef", txnRef);
        ret.put("approvalRef", approvalRef);
        ret.put("responseCode", code);
        ret.put("raw", raw == null ? "" : raw);
        call.resolve(ret);
    }

    /** Save a PNG (base64) into the phone's gallery: Pictures/FoodGaon */
    @PluginMethod
    public void saveImage(PluginCall call) {
        String b64 = call.getString("data");
        String name = call.getString("name", "FoodGaon-QR.png");
        if (b64 == null) { call.reject("no data"); return; }
        try {
            if (b64.contains(",")) b64 = b64.substring(b64.indexOf(',') + 1);
            byte[] bytes = android.util.Base64.decode(b64, android.util.Base64.DEFAULT);
            android.content.ContentResolver cr = getContext().getContentResolver();
            android.content.ContentValues v = new android.content.ContentValues();
            v.put(android.provider.MediaStore.Images.Media.DISPLAY_NAME, name);
            v.put(android.provider.MediaStore.Images.Media.MIME_TYPE, "image/png");
            if (android.os.Build.VERSION.SDK_INT >= 29) {
                v.put(android.provider.MediaStore.Images.Media.RELATIVE_PATH, "Pictures/FoodGaon");
                v.put(android.provider.MediaStore.Images.Media.IS_PENDING, 1);
            }
            android.net.Uri uri = cr.insert(android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI, v);
            if (uri == null) { call.reject("could not save"); return; }
            try (java.io.OutputStream out = cr.openOutputStream(uri)) { out.write(bytes); }
            if (android.os.Build.VERSION.SDK_INT >= 29) {
                android.content.ContentValues done = new android.content.ContentValues();
                done.put(android.provider.MediaStore.Images.Media.IS_PENDING, 0);
                cr.update(uri, done, null, null);
            }
            JSObject ret = new JSObject();
            ret.put("uri", uri.toString());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("could not save", e);
        }
    }
}

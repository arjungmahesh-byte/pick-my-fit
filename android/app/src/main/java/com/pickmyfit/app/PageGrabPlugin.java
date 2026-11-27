package com.pickmyfit.app;

import android.os.Handler;
import android.os.Looper;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;

/**
 * Opens a shop page in a hidden browser (like a person would), lets the shop's
 * "checking your browser" step finish, then hands the page back to the app.
 * Used when a plain request is blocked (Max, Zara, H&M and similar).
 */
@CapacitorPlugin(name = "PageGrab")
public class PageGrabPlugin extends Plugin {

    private static final String READY_JS =
        "(function(){return !!document.querySelector('script[type=\"application/ld+json\"],meta[property=\"og:image\"]')})()";
    private static final String GRAB_JS =
        "(function(){return [location.href, document.documentElement.outerHTML]})()";

    @PluginMethod
    public void grab(final PluginCall call) {
        final String url = call.getString("url");
        if (url == null || !(url.startsWith("http://") || url.startsWith("https://"))) {
            call.reject("bad url");
            return;
        }
        final int timeout = call.getInt("timeoutMs", 25000);
        getActivity().runOnUiThread(() -> {
            final WebView wv = new WebView(getContext());
            final Handler h = new Handler(Looper.getMainLooper());
            final boolean[] done = {false};
            WebSettings s = wv.getSettings();
            s.setJavaScriptEnabled(true);
            s.setDomStorageEnabled(true);
            s.setLoadsImagesAutomatically(false);
            wv.layout(0, 0, 1080, 2340);

            final Runnable finish = () -> {
                if (done[0]) return;
                wv.evaluateJavascript(GRAB_JS, v -> {
                    if (done[0]) return;
                    done[0] = true;
                    h.removeCallbacksAndMessages(null);
                    try {
                        JSONArray a = new JSONArray(v);
                        JSObject r = new JSObject();
                        r.put("url", a.getString(0));
                        r.put("html", a.getString(1));
                        call.resolve(r);
                    } catch (Exception e) {
                        call.reject("could not read the page");
                    }
                    wv.stopLoading();
                    wv.destroy();
                });
            };
            // check every second whether the real product page has arrived
            final Runnable[] poll = new Runnable[1];
            poll[0] = () -> {
                if (done[0]) return;
                wv.evaluateJavascript(READY_JS, v -> {
                    if ("true".equals(v)) h.postDelayed(finish, 600);
                    else h.postDelayed(poll[0], 1000);
                });
            };
            wv.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                    String sc = req.getUrl().getScheme();
                    return !("http".equals(sc) || "https".equals(sc)); // never jump into another app
                }
            });
            h.postDelayed(poll[0], 1500);
            h.postDelayed(finish, timeout);
            wv.loadUrl(url);
        });
    }
}

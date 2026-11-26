# Pick My Fit

A phone app for picking outfits from your own wardrobe: snap your clothes, the app cleans up the photos, build outfits on a mini model or on a photo of yourself, and ask the AI which colors work.

One code base for Android and iPhone, built with Capacitor. The app is a web page (`src/closet.html`, the same file as the claude.ai version) wrapped as a native app.

## Folders

| Folder | What it is |
|---|---|
| `src/` | The app itself, plus `config.js` (AI server address) and `native-shim.js` (phone storage and AI calls) |
| `www/` | Built output, made by `npm run build` |
| `android/` | Android Studio project |
| `ios/` | Xcode project (needs a Mac or a cloud Mac build) |
| `server/` | Optional AI helper server (Cloudflare Worker) that keeps your Anthropic API key off the phone |
| `.github/workflows/android.yml` | Builds the Android app file (APK) on GitHub for free |

## Get the Android app (free)

1. Push this folder to a GitHub repository.
2. Open the repository's **Actions** tab, then the **Build Android app** run.
3. When it finishes, download **PickMyFit-android** under Artifacts and unzip it to get `app-debug.apk`.
4. Send the APK to an Android phone, open it and allow "install unknown apps" when asked.

Or build it on a computer with Android Studio: `npm ci`, `npm run sync`, then open the `android` folder in Android Studio and press Run.

## iPhone

iPhones only install apps from the App Store or TestFlight, so this needs an Apple Developer account ($99 a year). Without a Mac, use a cloud build service (for example Codemagic or Ionic Appflow) on the `ios/` folder. Then upload to TestFlight, which lets friends install it before it's in the App Store.

## Turn on the AI (optional, paid per use)

Without this, everything works except the AI buttons: closet, photo cleanup, outfit builder, color meter and the model.

1. Get an API key at console.anthropic.com and add some credit.
2. Create a free Cloudflare account, then in `server/`: `npm i`, `npx wrangler login`, `npx wrangler secret put ANTHROPIC_API_KEY`, `npx wrangler secret put APP_KEY`, `npx wrangler deploy`.
3. Put the Worker address and your APP_KEY in `src/config.js`, then rebuild the app.

The APP_KEY only stops casual misuse, since anyone can read it out of the app. Set a monthly spend limit in the Anthropic console.

## Where data is saved

In the phone app, clothes, outfits and your model photo are saved only on that phone. If you uninstall the app, they're deleted.

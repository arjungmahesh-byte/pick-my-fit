# Putting Pick My Fit on the App Store

Everything in the code is ready. These steps need your own accounts and payment, so only you can do them.
Total cost: **$99 a year** (Apple). Codemagic's free plan covers the builds (about 500 build minutes a month).

## 1. Apple Developer account (about 1–2 days for Apple to approve)
1. Go to developer.apple.com/programs/enroll and sign in with an Apple ID.
2. Enroll as an **Individual**. The account holder must be **18 or older**, so if you're under 18, a parent or guardian enrolls in their name.
3. Pay $99. Apple checks your ID, which usually takes 1–2 days.

## 2. Create the app in App Store Connect (5 minutes)
1. Go to appstoreconnect.apple.com, then **Apps**, then **+**, then **New App**.
2. Platform: iOS. Name: **Pick My Fit** (choose another if it's taken). Language: English.
3. Bundle ID: register **com.pickmyfit.app** under developer.apple.com, then **Identifiers**, then pick it here.
4. SKU: `pickmyfit`.
5. Open the app's **App Information** page and copy the **Apple ID** number. Send it to Claude, who puts it in `codemagic.yaml`.

## 3. Let Codemagic build it (10 minutes)
1. In App Store Connect, go to **Users and Access**, then **Integrations**, then **App Store Connect API**, and create a key with the **App Manager** role. Download the .p8 file once.
2. Sign up free at codemagic.io with your GitHub account and add the **pick-my-fit.** repository.
3. Go to **Team settings**, then **Integrations**, then **Developer Portal**, then **Connect**. Name it `PickMyFit App Store key` and upload the .p8 file with its Issuer ID and Key ID.
4. Under **Code signing identities**, let Codemagic create an iOS Distribution certificate and an App Store profile for com.pickmyfit.app.
5. Start the **iPhone app to TestFlight** workflow.

## 4. Test with friends on TestFlight (same day)
After the build, the app appears in App Store Connect under **TestFlight**. Add friends' emails as testers. They install the free **TestFlight** app and get Pick My Fit straight away, with no App Store review for up to 100 internal testers.

## 5. Submit to the App Store (Apple review: usually 1–3 days)
You need:
- **Screenshots** from a 6.7" or 6.9" iPhone (Claude can make these)
- **Description, keywords, support URL** (Claude can write these; the GitHub Pages site can be the support URL)
- **Privacy policy URL** (Claude can write it and put it on the website)
- **Age rating** questionnaire (answer "no" to everything, since the app has no user content sharing)
- **App Privacy** answers: "Data not collected" while everything stays on the phone (this changes if usage stats or sign-in are added)

Then press **Submit for Review**.

## Google Play (optional, $25 once)
Sign up at play.google.com/console (18+). Claude can add a signed release build (.aab) to the GitHub workflow. Google needs about 14 days of closed testing with 12 testers for new personal accounts before public release.

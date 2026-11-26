# Seeing who uses Pick My Fit

When accounts are on, everyone picks a nickname (or signs in with email) the first time they open the app.
You, the owner, tap your name at the top of the app to open **My users**: total users, active today and this week,
and per person their nickname or email, phone type, last seen, number of opens, clothes added and outfits saved.
Clothes and photos are never uploaded. They stay on each phone.

## Setup (free Firebase "Spark" plan)
1. console.firebase.google.com: **Create a project** called `pick-my-fit` (Analytics off).
2. **Build → Authentication → Get started → Sign-in method**: turn on **Email/Password** and **Anonymous** (Anonymous is used for nickname-only users).
3. **Build → Firestore Database → Create database** in production mode.
4. **Firestore → Rules**: paste the contents of `firestore.rules`, put your own email in place of `OWNER_EMAIL_HERE`, and tap **Publish**.
5. **Project settings → Your apps → </>**: register a web app and copy the `firebaseConfig` values into `src/config.js` (`firebase: {...}`), and set `ownerEmail` to the same email.
6. Open the app and choose **Sign in with email instead → Create account** with that email. You'll then see **My users**.
7. **Authentication → Settings → Authorized domains**: add `arjungmahesh-byte.github.io` so the iPhone web app can sign in.

The `firebaseConfig` values aren't secret. The rules in step 4 are what keep the user list visible only to you.

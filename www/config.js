// Pick My Fit app settings.
// aiUrl: the address of your AI helper server (see server/README.md). Leave empty to run without AI.
window.PICKMYFIT_CONFIG = {
  aiUrl: "",
  appKey: "",
  // firebase: paste the firebaseConfig object from the Firebase console here to turn on accounts.
  firebase: {
    apiKey: "AIzaSyB_292XWrwnDKXxS74XkWvJzIFBq7a9bYw",
    authDomain: "pick-my-fit-c29f2.firebaseapp.com",
    projectId: "pick-my-fit-c29f2",
    storageBucket: "pick-my-fit-c29f2.firebasestorage.app",
    messagingSenderId: "452282463064",
    appId: "1:452282463064:web:ead098ee92f12703eaab2d"
  },
  // ownerEmail: optional. Leave empty: the owner is whoever the Firestore rules let read the user list,
  // so the owner's email only lives in the rules in the Firebase console, not in this public code.
  ownerEmail: ""
};

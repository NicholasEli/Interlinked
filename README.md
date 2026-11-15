# Interlinked

Victoria and Nicholas’s shared movie trailer board. Add a YouTube URL to either column, mark trailers watched, or delete them. A board link works on any device without sign-in. Anyone with the full link can change the board, so share it directly.

## Development

Use Node.js 22.12+ and run `npm ci`, then `npm test` and `npm run dev`. To work against an existing board, copy `.env.example` to `.env.local` and fill in the Firebase web app values for `projectId`, `apiKey`, and `appId`. Open your dev URL with the existing board key after `#`. Changes go to whichever Firebase project is configured.

To test the Firestore rules locally, install the Firebase CLI and Java 21, then run `npm run test:rules`. The suite uses the emulator and a demo project.

## Hosting and setup

1. Create a Firebase Spark project with a Firestore Standard database and register a web app. Run `firebase deploy --only firestore:rules --project YOUR_PROJECT_ID` from this checkout.
2. Generate a board key locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`. In the Firebase console, create the document `boards/<board-key>` with a boolean field `enabled` set to `true`. Only Firebase project admins can provision board documents. Keep the key out of Git, CI settings, and public posts.
3. In GitHub repository settings, select GitHub Actions as the Pages source. Add Actions repository variables named `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_API_KEY`, and `VITE_FIREBASE_APP_ID` using the Firebase web app configuration. Deploy by pushing to `main` or running the Pages workflow manually.
4. Add `#<board-key>` to the deployed Pages URL and share the full link. The Pages URL by itself displays a prompt for the board link.

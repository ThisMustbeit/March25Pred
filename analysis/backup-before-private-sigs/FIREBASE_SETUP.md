# Firebase sig library setup

This site uses Firebase 12.19.0 browser modules from Google's CDN. No npm install or build step is required. Upload the site files to the existing Cloudflare static-assets Worker, including all files under `tools/sigs/`.

## Firebase Console

1. Select the **calendrx** project.
2. Under **Authentication → Sign-in method**, enable **Email/Password** (the password provider, not just email-link sign-in).
3. Under **Authentication → Settings → Authorized domains**, add `calendrx.ca` and any other hostname actually used for the site.
4. Use the default Cloud Firestore database, named **(default)**, in Firestore Native mode.
5. Open **Firestore Database → Rules**, replace the rules with the contents of the root `firestore.rules` file, and click **Publish**. Do not leave test-mode rules enabled.
6. Upload the updated site files to Cloudflare. Open the Sig List page, pass the existing tools password gate, and sign in using the existing owner account: `Antoine.Morcos@dal.ca`.

The owner UID is `ukzzYYtIU3cyfoqP5BFgDhxjOCJ3`. It must match in both `tools/sigs/firebase-config.js` and `firestore.rules`. Permissions use the UID rather than the email address. Creating another account with a different UID does not grant owner permissions.

## How saving works

- Everyone can read the shared library. Only the owner can save, edit or remove shared entries.
- Every signed-in user, including the owner, has a private personal list and favourites. Other users cannot read or write those paths under the supplied rules.
- Use **Copy to my list** to customize a shared entry's wording or tags privately.
- The owner can select **Shared library (everyone)** when adding a shortcut, or use **Copy to shared library** on a personal entry.
- LS/CS reference entries remain bundled with the website. Shared additions, edits and removal markers are saved under `sharedSigs/{entryId}` and applied over the bundled entries. An empty collection is normal before the first shared change.
- Personal entries use `users/{UID}/sigs/{entryId}`; favourites use `users/{UID}/favorites/{source_entryId}`. Firestore creates collections with the first saved document. No manual collection creation or seeding is needed.
- Sign-in lasts for the current browser session. Cloud data remains saved after sign-out; signing back into the same account retrieves it. Private data is cleared from the page when signing out or changing accounts. Firestore uses its default memory-only cache, not persistent disk caching.
- Saves require an internet connection. Transactions reject edits when the same entry changed in another session; reopen the editor to use the latest revision.
- **Import browser-saved list into my account** copies local additions/customizations into the personal list, skipping unchanged bundled entries. Original localStorage is left intact. Browser-only removals do not remove anything from the shared library.
- **Import personal backup** imports version-1 JSON backups into the current account's personal list. It preserves existing entries; retrying an interrupted import does not overwrite earlier imports. An interrupted import can have saved some entries already.
- **Export backup** exports the selected view (All, Shared, Personal or Favourites). Importing that file always creates personal entries, never shared ones.
- If Firebase's CDN fails to load, the bundled reference list stays searchable, but cloud controls are unavailable until reloading successfully.

The tools password gate is a separate convenience screen. Firestore security comes from the published rules and Firebase Authentication. The public web config is not an admin credential. Analytics is not initialized by this integration.

## Verification

Local checks:

```
node analysis/sig-cloud-check.cjs
node analysis/sig-list-check.cjs
node --check tools/sigs/cloud.js
```

The cloud test uses simulated Firebase services to check UI permissions, data paths, account isolation, favourites, save conflicts, shared removal and import retries. It does not replace a deployed-rules or real-project test.

After deployment, verify with the owner account and a separate ordinary account: the owner can edit Shared, the ordinary account can only copy it, personal entries remain account-specific, and saved entries/favourites reappear on a second session. If you see permission errors, check that the published rules and owner UID match. If sign-in says the provider is disabled, enable Email/Password in Authentication.

## Notepad (added October 7, 2026)

Upload the entire `tools/notepad/` folder plus the updated `tools/index.html` and sig files. **Republish the updated root `firestore.rules`**: the previous rules do not include notebook access. No collections need to be created manually.

Every signed-in account gets its own private notebook at `users/{UID}/notebookPages/{pageId}`. Even the owner account cannot read other users' private pages through these client rules. The shared notebook at `sharedNotebookPages/{pageId}` is readable by signed-in users and writable only by the configured owner UID. It uses the same sign-in session as the sig tool.

Features: named sections, multiple pages, title/content search, pinned pages, autosave after a one-second pause, manual Save, Markdown export, and trash/restore. Creating a section creates its first page. Change a page's Section field to move it or create a new section name. Sections are derived from their pages. Trashed pages remain in Firebase until restored; there is no permanent-delete control.

Notebook saves require connectivity and use revision checks to prevent overwriting concurrent edits. Failed saves leave the draft on the page. Switching notebooks/pages or signing out first attempts to save; a failed save stops navigation. The browser warns before leaving an unsaved draft. Drafts are not persisted to localStorage. Export includes the current unsaved draft for recovery; other pages come from the loaded notebook. Account changes clear private page content. Markdown export contains plain text, not a runnable HTML preview.

For sigs, the owner can click **Edit tags** on a shared entry. Type comma-separated names to create multiple tags (up to 20 per sig), then save. Personal entries support the same tags. No full sig migration was performed: bundled LS/CS entries remain the starting library, with Firebase overrides for shared edits and Firebase collections for personal entries.

Run `node analysis/notepad-check.cjs` for simulated notebook integration checks. These cover private isolation, shared owner/member UI, sections, autosave, failed-save recovery, conflicts, export, trash/restore and account switching. Actual Firebase rule enforcement and deployment still need live verification after publishing the rules and uploading files.

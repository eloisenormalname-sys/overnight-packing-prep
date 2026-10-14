# Overnight Packing & Prep

A small, dependency-free iPhone PWA with 33 original checklist items in four sections: Preflight (0 minutes), Get Ready (60), Pack Bag (10), Final Checks (5). Total: 75 minutes.

## Add to Home Screen

1. Open the deployed app URL in Safari on your iPhone.
2. Tap Share → Add to Home Screen. If the action is missing, look under Edit Actions.
3. Leave Open as Web App enabled if shown, then tap Add.
4. Open the Overnight icon while online and wait for “Ready for offline use”. It can then reopen offline.

Apple instructions: https://support.apple.com/guide/iphone/iphea86e5236/ios

This adds an app icon. The checklist opens inside the app; it is not an interactive Home Screen widget.

## Everyday use

- Tap a checkbox to complete an item. Tap again to undo.
- Tap a section heading to collapse or expand it.
- Use Not needed for the conditional umbrella / coat item. It counts as resolved without pretending it was packed.
- Remaining time is the sum of unfinished task estimates, not a running timer. Untimed items still count toward completion. The full 10-minute packing estimate remains until Finish packing bag is checked.
- Start fresh clears completion and skipped choices, while keeping your edits.
- Edit routine changes names and minutes, adds/removes tasks, and moves items within a section. Cancel discards the editing session.
- The ? button opens installation help, backup export/import, and Restore original routine.

Progress and personal edits stay in this browser’s local storage. There is no account, tracking, cloud sync, or connection back to the Google Sheet. Another device, browser, or Home Screen installation may have a separate copy. Export/import a backup to transfer your state. Clearing site data or browser storage eviction can remove it. A new installation starts unchecked; source spreadsheet progress is not copied.

## Future ChatGPT maintenance

Give ChatGPT this repository or upload this project folder and say:

> Update my Overnight Packing & Prep PWA. Keep all existing item IDs stable, preserve local progress and edits, modify only this app, increment the service-worker VERSION, test it, and verify the live deployment.

- `routine.json`: default sections, stable item IDs, names, minutes, optional flags, and order.
- `model.js`: merge defaults with device-specific patches and additions; calculate progress and time.
- `app.js`: checklist, editor, local storage, backup, installation/update status.
- `styles.css`: responsive appearance.
- `sw.js`: offline asset cache and updates, limited to this app’s directory.
- `manifest.webmanifest` and the icon files: standalone launch and iPhone icon.

Keep the storage key `overnight-packing-prep:v1` and `schema: 1` stable unless providing a migration. Personal field edits override the corresponding default field; untouched fields accept new defaults. New default IDs appear even when the user has a personal order. Deleted defaults disappear. IDs must be unique, stable, and use only letters, numbers, and hyphens. Reserve `custom-` for user-added tasks. Do not store private information in public default files; local edits/backups are not uploaded by the app.

After deployment, reopen online. When a new worker has cached the complete release, “Update available · Reload” appears. Applying it preserves local storage. If you have personal edits to an updated task, they take priority; Restore original routine removes those overrides, keeping matching checkmarks.

## Hosting and local preview

All URLs are relative. Publish these files together at the root of a dedicated Pages repository or under a dedicated directory on an existing site. Never put this service worker at another site’s root. HTTPS is required for installation/offline behavior; localhost also works for development.

For a dedicated repository: Settings → Pages → Deploy from a branch → main → /(root). No build step or external dependencies are needed. The `.nojekyll` file disables Jekyll processing.

For local testing, run `python3 -m http.server 8765` from this folder and visit http://localhost:8765/. Opening index.html directly from disk will not provide offline support.

## Verification

Verify initial count 33 and total 75; timed and untimed completions; skip/undo; all-complete state; persistence after reload; edit/cancel/add/remove/reorder; backup export/import and invalid-file rejection; reset preserving edits; offline reload; update preserving progress; narrow screen layout; no unrelated caches or files changed. Real iPhone Add to Home Screen and Safari behavior should also be checked on-device.

# Photo Studio: gallery and sidebar update

## Install on your Mac

1. Keep a backup copy of your existing `UI/index.html`, `UI/style.css`, and `UI/app.js` outside the `UI` folder.
2. Copy the three replacement files from this folder into your existing `SoftwareRecruit_Shreya_Gavande/UI` folder. Choose Replace when Finder asks.
3. Keep your existing `UI/images`, `UI/sender.py`, and `UI/.venv`. This update does not replace those items.
4. Save all files in VS Code. Keep both servers running, or start them with the commands below.
5. Open **http://127.0.0.1:8000** in the same browser you used previously. Reload from the server with Command + Option + R if the old layout is cached.

The database is still `PhotoStudio`, version 1, with the same `photos` store. Existing records are read as unarchived photos with no folder and purple tags. The update does not delete or recreate the database. Your existing records remain available when you use the same browser profile and exact address.

## Run

Terminal 1, from the main project folder:

```bash
cd ~/Documents/SoftwareRecruit_Shreya_Gavande
python3 -m http.server 8000 --bind 127.0.0.1 --directory UI
```

Terminal 2, also from the main project folder:

```bash
cd ~/Documents/SoftwareRecruit_Shreya_Gavande
UI/.venv/bin/python UI/sender.py
```

Keep both terminals running. Your existing sender should accept `receive` and return a JSON photo with `type`, `name`, and `image` fields, exactly as before. If it reports that every source photo has already been sent, restart only the sender. The updated frontend recognizes identical incoming image data and keeps the existing entry and its edits instead of adding another copy. Existing duplicate entries are left as they are.

## Use

- **Open a photo:** click anywhere on its card, or focus it with Tab and press Enter. Cards no longer contain Edit or Delete buttons.
- **Preview:** the full photograph appears on the left without cropping. The editing sidebar appears on the right. On smaller screens the sidebar moves below the image.
- **Rename and label:** enter a name and comma-separated tags. Removing all meaningful tags sets the entry back to `unlabeled`.
- **Tag colours:** add tags, then choose purple, blue, green, gold, rose, or gray for each tag. Colours are saved per tag on that photo and remain legible in either theme.
- **Folders:** enter a new folder name or pick an existing suggestion. Save changes to assign the photo. Choose a folder in the toolbar to filter the gallery. These are collections inside the app; original files are not moved.
- **Save changes:** commits name, tags, colours, and folder to IndexedDB. Cancel or Close discards edits after confirmation if there are unsaved changes.
- **Archive:** saves the current edits and hides the photo from Library. Open Archive to find it and choose Restore to library.
- **Delete:** removes the selected database entry after confirmation. The original file in `UI/images` remains untouched.
- **Search:** filters by photo name or any tag, ignoring capitalization. Search, folder, and unlabeled filters work together.
- **Counts:** show totals for the current Library or Archive view, before search/folder filters. The unlabeled count updates after saved edits.
- **Appearance:** choose light or dark from the top bar or Settings. The same preference key as your previous version is used.
- **Reconnection:** the app reconnects automatically when the Python sender restarts. Existing saved photos remain usable while the sender is offline.

## Quick verification

1. Existing photos appear on opening the app.
2. A newly received photo immediately opens when clicked.
3. Rename one photo, add two tags, assign tag colours and a folder, and save.
4. Refresh: the saved values remain.
5. Search its name or tag, then filter by its folder.
6. Use Unlabeled: the tagged photo is excluded. Clear its tags and save: it returns.
7. Archive a photo: it leaves Library and appears in Archive. Restore it.
8. Edit a name and choose Cancel: the original name remains.
9. Switch to dark mode, open the editor, and refresh: the theme remains.
10. Delete a test entry and refresh: the entry remains deleted.

## How the code fits together

- `index.html` contains the gallery, navigation, large viewer, sidebar form, and Settings dialog.
- `style.css` contains the shared theme variables and responsive layout.
- `app.js` manages IndexedDB, WebSocket arrivals, one common gallery renderer, filters, sidebar drafts, and committed changes. Comments explain each part.

New optional record fields are `folder`, `archived`, `tagColors`, `createdAt`, and `updatedAt`. Original IDs, image data, names, and tags are preserved when existing records are edited.

## Guide and dark appearance update

Guide in the navigation explains receiving the ten sample photographs, opening the sidebar, names, coloured tags, folders, search, saving, archive/restore, deletion and themes. The receive control is now labelled Generate random photo; the Python protocol is unchanged. Dark mode uses navy with lavender accents and a subtle purple glow.

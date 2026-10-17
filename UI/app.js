// Small lookup helper: every ID matches an element in index.html.
const element = (id) => document.getElementById(id);
const photoGrid = element("photo-grid");
const searchInput = element("search-input");
const folderFilter = element("folder-filter");
const unlabeledFilter = element("unlabeled-filter");
const receiveButton = element("receive-button");
const editDialog = element("edit-dialog");
const editForm = element("edit-form");
const editName = element("edit-name");
const editTags = element("edit-tags");
const editFolder = element("edit-folder");
const colourNames = ["purple", "blue", "green", "gold", "rose", "gray"];

// Only committed records go into photos. Unsaved sidebar edits stay separate.
let photos = [];
let currentView = "library";
let selectedPhoto = null;
let draftColours = new Map();
let dirty = false;
let saving = false;
let storageLoaded = false;
// Prevent new photo requests while the demo is restarting.
let restartingDemo = false;

function feedback(message, isError = false) {
  element("feedback").textContent = message;
  element("feedback").dataset.error = String(isError);
}

// Keep the SAME database name, version, and store as the original app.
// Old records automatically receive defaults when read; nothing is cleared.
const databaseReady = new Promise((resolve, reject) => {
  const request = indexedDB.open("PhotoStudio", 1);
  request.addEventListener("upgradeneeded", () => {
    const database = request.result;
    if (!database.objectStoreNames.contains("photos")) {
      database.createObjectStore("photos", { keyPath: "id" });
    }
  });
  request.addEventListener("success", () => resolve(request.result));
  request.addEventListener("error", () => reject(request.error));
  request.addEventListener("blocked", () =>
    feedback("Close other Photo Studio tabs, then reload.", true)
  );
});

// A transaction only reports success once IndexedDB commits the operation.
async function databaseOperation(mode, operation) {
  const database = await databaseReady;
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("photos", mode);
    const request = operation(transaction.objectStore("photos"));
    transaction.addEventListener("complete", () => resolve(request.result));
    transaction.addEventListener("abort", () => {
      reject(transaction.error || new Error("The database operation failed."));
    });
  });
}

function normalizePhoto(photo) {
  return {
    ...photo,
    name: typeof photo.name === "string" ? photo.name : "Untitled photo",
    tags:
      Array.isArray(photo.tags) && photo.tags.length
        ? photo.tags
        : ["unlabeled"],
    folder: typeof photo.folder === "string" ? photo.folder : "",
    archived: photo.archived === true,
    tagColors:
      photo.tagColors && typeof photo.tagColors === "object"
        ? photo.tagColors
        : {},
  };
}

// Read saved photos and update the gallery and sample counter.
async function loadPhotos() {
  const records = await databaseOperation("readonly", (store) =>
    store.getAll()
  );

  photos = records.map(normalizePhoto);

  updateFolders();
  renderGallery();

  // Recheck completion after receiving, deleting, or archiving a photo.
  updateReceiveButton();
  receiveButton.disabled =
    restartingDemo ||
    !storageLoaded ||
    pending ||
    socket?.readyState !== WebSocket.OPEN ||
    allPhotosSaved;
}

function savePhoto(photo) {
  return databaseOperation("readwrite", (store) => store.put(photo));
}

function isUnlabeled(photo) {
  return photo.tags.some((tag) => tag.toLowerCase() === "unlabeled");
}

function option(value, label) {
  const item = document.createElement("option");
  item.value = value;
  item.textContent = label;
  return item;
}

// Folders are saved metadata, not physical folders on the computer.
function updateFolders() {
  const previous = folderFilter.value;
  const folders = [
    ...new Set(photos.map((photo) => photo.folder).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));
  folderFilter.replaceChildren(option("", "All folders"));
  element("folder-options").replaceChildren();
  for (const folder of folders) {
    folderFilter.append(option(folder, folder));
    element("folder-options").append(option(folder, folder));
  }
  if (folders.includes(previous)) folderFilter.value = previous;
}

// Use textContent for user text so names and tags cannot inject HTML.
function tagChip(label, colour) {
  const chip = document.createElement("span");
  chip.className = "photo-tag";
  chip.textContent = label;
  chip.dataset.color = colourNames.includes(colour) ? colour : "purple";
  return chip;
}

function renderGallery() {
  const term = searchInput.value.trim().toLowerCase();
  const inView = photos.filter(
    (photo) => photo.archived === (currentView === "archive")
  );
  const visible = inView.filter((photo) => {
    const matchesSearch = [photo.name, ...photo.tags].some((text) =>
      text.toLowerCase().includes(term)
    );
    const matchesFolder =
      !folderFilter.value || photo.folder === folderFilter.value;
    const matchesLabel = !unlabeledFilter.checked || isUnlabeled(photo);
    return matchesSearch && matchesFolder && matchesLabel;
  });
  // New arrivals appear first; older records without a date are still supported.
  visible.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  photoGrid.replaceChildren();
  for (const photo of visible) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "photo-card";
    card.setAttribute("aria-label", `Open details for ${photo.name}`);
    const image = document.createElement("img");
    image.src = photo.image;
    image.alt = ""; // The button already announces the photo name.
    image.loading = "lazy";
    const info = document.createElement("span");
    info.className = "card-info";
    const name = document.createElement("span");
    name.className = "photo-name";
    name.textContent = photo.name;
    info.append(name);
    if (photo.folder) {
      const folder = document.createElement("span");
      folder.className = "card-folder";
      folder.textContent = `Folder · ${photo.folder}`;
      info.append(folder);
    }
    const tags = document.createElement("span");
    tags.className = "tag-list";
    for (const tag of photo.tags)
      tags.append(tagChip(tag, photo.tagColors[tag]));
    info.append(tags);
    card.append(image, info);
    card.addEventListener("click", () => openPhoto(photo));
    photoGrid.append(card);
  }
  const count = inView.length;
  element("total-count").textContent = count;
  element("total-count").textContent = count;
  element("unlabeled-count").textContent = inView.filter(isUnlabeled).length;
  element("view-heading").textContent =
    currentView === "archive"
      ? "Archive"
      : unlabeledFilter.checked
      ? "Unlabeled photos"
      : "Library";
  const activeId =
    currentView === "archive"
      ? "nav-archive"
      : unlabeledFilter.checked
      ? "nav-unlabeled"
      : "nav-library";
  for (const id of ["nav-library", "nav-unlabeled", "nav-archive"]) {
    if (id === activeId) element(id).setAttribute("aria-current", "page");
    else element(id).removeAttribute("aria-current");
  }
  element("empty-message").hidden = visible.length > 0;
  element("empty-message").textContent = inView.length
    ? "No photos match your search or filters."
    : currentView === "archive"
    ? "Nothing archived yet. Open a photo to archive it."
    : "Your library is empty. Receive a photo to get started.";
}

// Search is local and immediate; stored images are not requested over HTTP.
searchInput.addEventListener("input", renderGallery);
folderFilter.addEventListener("change", renderGallery);
unlabeledFilter.addEventListener("change", renderGallery);
function switchView(view, unlabeled = false) {
  currentView = view;
  unlabeledFilter.checked = unlabeled;
  searchInput.value = "";
  folderFilter.value = "";
  renderGallery();
}
element("nav-library").addEventListener("click", () => switchView("library"));
element("nav-unlabeled").addEventListener("click", () =>
  switchView("library", true)
);
element("nav-archive").addEventListener("click", () => switchView("archive"));
element("brand-link").addEventListener("click", (event) => {
  event.preventDefault();
  switchView("library");
});

// Trim tags, remove repeated entries, and reserve 'unlabeled' for empty lists.
function parseTags() {
  const seen = new Set();
  return editTags.value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (!key || key === "unlabeled" || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function renderTagColours() {
  const list = element("tag-color-list");
  list.replaceChildren();
  const tags = parseTags();
  if (!tags.length) {
    const hint = document.createElement("p");
    hint.className = "field-hint";
    hint.textContent = "Add a tag above to choose its colour.";
    list.append(hint);
  }
  tags.forEach((tag, index) => {
    const row = document.createElement("div");
    row.className = "tag-color-row";
    const colour = draftColours.get(tag) || "purple";
    const chip = tagChip(tag, colour);
    const select = document.createElement("select");
    select.id = `tag-colour-${index}`;
    select.setAttribute("aria-label", `Colour for tag ${tag}`);
    for (const name of colourNames)
      select.append(option(name, name[0].toUpperCase() + name.slice(1)));
    select.value = colourNames.includes(colour) ? colour : "purple";
    select.addEventListener("change", () => {
      draftColours.set(tag, select.value);
      chip.dataset.color = select.value;
      dirty = true;
    });
    row.append(chip, select);
    list.append(row);
  });
}

function openPhoto(photo) {
  selectedPhoto = photo;
  draftColours = new Map(Object.entries(photo.tagColors));
  editName.value = photo.name;
  editTags.value = photo.tags
    .filter((tag) => tag.toLowerCase() !== "unlabeled")
    .join(", ");
  editFolder.value = photo.folder;
  element("edit-preview").src = photo.image;
  element("edit-preview").alt = photo.name;
  element("edit-heading").textContent = photo.name;
  element("photo-state").textContent = photo.archived
    ? "Archived photo"
    : "In your library";
  element("archive-button").textContent = photo.archived
    ? "Restore to library"
    : "Archive photo";
  element("editor-feedback").textContent = "";
  dirty = false;
  renderTagColours();
  editDialog.showModal();
  element("close-editor").focus();
}
editForm.addEventListener("input", () => {
  dirty = true;
});
editTags.addEventListener("input", renderTagColours);

// Cancel and Escape discard drafts only after an explicit confirmation.
function requestClose() {
  if (saving) return;
  if (dirty && !confirm("Discard your unsaved changes?")) return;
  editDialog.close();
}
element("close-editor").addEventListener("click", requestClose);
element("cancel-button").addEventListener("click", requestClose);
editDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  requestClose();
});
editDialog.addEventListener("close", () => {
  selectedPhoto = null;
  dirty = false;
  element("edit-preview").removeAttribute("src");
});

function draftPhoto() {
  if (!editForm.reportValidity()) return null;
  const name = editName.value.trim();
  if (!name) {
    element("editor-feedback").textContent = "Please enter a photo name.";
    element("editor-feedback").dataset.error = "true";
    editName.focus();
    return null;
  }
  const tags = parseTags();
  const typedFolder = editFolder.value.trim();
  const existingFolder = photos.find(
    (photo) => photo.folder.toLowerCase() === typedFolder.toLowerCase()
  )?.folder;
  return {
    ...selectedPhoto,
    name,
    tags: tags.length ? tags : ["unlabeled"],
    tagColors: Object.fromEntries(
      tags.map((tag) => [tag, draftColours.get(tag) || "purple"])
    ),
    folder: existingFolder || typedFolder,
    updatedAt: Date.now(),
  };
}

function editorBusy(busy) {
  saving = busy;
  editDialog.querySelectorAll("button, input, select").forEach((control) => {
    control.disabled = busy;
  });
}

async function commitEditor(archiveChange = false) {
  if (!selectedPhoto || saving) return;
  const draft = draftPhoto();
  if (!draft) return;
  if (archiveChange) draft.archived = !selectedPhoto.archived;
  editorBusy(true);
  try {
    await savePhoto(draft);
    await loadPhotos();
    dirty = false;
    editDialog.close();
    feedback(
      archiveChange
        ? draft.archived
          ? "Photo archived. Find it in Archive."
          : "Photo restored to your library."
        : "Changes saved."
    );
  } catch (error) {
    console.error(error);
    element("editor-feedback").textContent =
      "Could not save. Your edits are still here; please try again.";
    element("editor-feedback").dataset.error = "true";
  } finally {
    editorBusy(false);
  }
}
editForm.addEventListener("submit", (event) => {
  event.preventDefault();
  commitEditor();
});
element("archive-button").addEventListener("click", () => commitEditor(true));
element("delete-button").addEventListener("click", async () => {
  if (
    !selectedPhoto ||
    saving ||
    !confirm(
      `Delete “${selectedPhoto.name}” from this library? Your original file will stay in place.`
    )
  )
    return;
  editorBusy(true);
  try {
    await databaseOperation("readwrite", (store) =>
      store.delete(selectedPhoto.id)
    );
    await loadPhotos();
    dirty = false;
    editDialog.close();
    feedback("Photo deleted from the library.");
  } catch (error) {
    console.error(error);
    element("editor-feedback").textContent =
      "Could not delete the photo. Please try again.";
    element("editor-feedback").dataset.error = "true";
  } finally {
    editorBusy(false);
  }
});

// Open the guide without changing the current gallery search or collection.
element("guide-button").addEventListener("click", () =>
  element("guide-dialog").showModal()
);

// Theme preference uses the same setting name as the original app.
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  element("theme-select").value = theme;
  element("theme-toggle").textContent =
    theme === "dark" ? "Light mode" : "Dark mode";
}
let savedTheme;
try {
  savedTheme = localStorage.getItem("photo-studio-theme");
} catch {
  /* Browser may restrict settings storage. */
}
applyTheme(
  ["light", "dark"].includes(savedTheme)
    ? savedTheme
    : matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
);
function chooseTheme(theme) {
  applyTheme(theme);
  try {
    localStorage.setItem("photo-studio-theme", theme);
  } catch {
    feedback("Appearance changed for this visit.");
  }
}
element("theme-toggle").addEventListener("click", () =>
  chooseTheme(
    document.documentElement.dataset.theme === "dark" ? "light" : "dark"
  )
);
element("theme-select").addEventListener("change", (event) =>
  chooseTheme(event.target.value)
);
element("settings-button").addEventListener("click", () =>
  element("settings-dialog").showModal()
);

// Match the existing Python sender: a 'receive' request and a JSON photo reply.
// Reconnect automatically if the sender restarts; no page refresh is necessary.
let socket;
let pending = false;
let requestTimeout;
let closing = false;
let incomingQueue = Promise.resolve();
// Update the Generate button and show progress through the sample collection.
function updateReceiveButton() {
  const sampleLimit = 10;

  // Count unique photos across both Library and Archive.
  // Duplicate copies of the same image only count once.
  const savedCount = new Set(photos.map((photo) => photo.image)).size;

  const allPhotosSaved = savedCount >= sampleLimit;

  // Disable generating while disconnected, loading, receiving,
  // or when all ten sample photographs are already saved.
  receiveButton.disabled =
    !storageLoaded ||
    pending ||
    socket?.readyState !== WebSocket.OPEN ||
    allPhotosSaved;

  // Change the button text to match the current state.
  receiveButton.textContent = allPhotosSaved
    ? "All sample photos saved"
    : pending
    ? "Receiving photo…"
    : "+ Generate random photo";

  const progress = element("sample-progress");

  if (!storageLoaded) {
    progress.textContent = "Checking sample collection…";
  } else if (allPhotosSaved) {
    progress.textContent =
      "10 of 10 sample photos saved! All random photos have been added " +
      "to your database. No more photos are available in this demo.";
  } else {
    progress.textContent = `${savedCount} of ${sampleLimit} sample photos saved.`;
  }
}
function finishRequest() {
  pending = false;
  clearTimeout(requestTimeout);
  updateReceiveButton();
}
async function receivePhoto(event) {
  try {
    await initialLibrary;
    const data = JSON.parse(event.data);
    if (data.type === "error") {
      feedback(data.message);
      return;
    }
    if (data.type !== "photo") return;
    if (
      typeof data.name !== "string" ||
      typeof data.image !== "string" ||
      !/^data:image\/(jpeg|png);base64,/.test(data.image)
    ) {
      throw new Error("The sender returned an unsupported photo message.");
    }
    // Do not reset existing names/tags or add duplicates when Python restarts.
    // Compare the actual image data, not the filename: names can be repeated.
    const existing = photos.find((photo) => photo.image === data.image);
    if (existing) {
      feedback(
        existing.archived
          ? "This photo is already saved in Archive."
          : "This photo is already in your library. Your edits were kept."
      );
      return;
    }
    const photo = {
      id: crypto.randomUUID(),
      name: data.name,
      image: data.image,
      tags: ["unlabeled"],
      tagColors: {},
      folder: "",
      archived: false,
      createdAt: Date.now(),
    };
    await savePhoto(photo);
    await loadPhotos();
    feedback(
      currentView === "archive"
        ? "New photo saved in Library."
        : "Photo saved. Click its card to organize it."
    );
  } catch (error) {
    console.error(error);
    feedback(
      "Could not receive or save the photo. Check storage space and try again.",
      true
    );
  } finally {
    finishRequest();
  }
}
function connectSender() {
  socket = new WebSocket("ws://127.0.0.1:8765");
  socket.addEventListener("open", () => {
    element("connection-status").textContent = "Connected";
    element("connection-status").dataset.connected = "true";
    updateReceiveButton();
  });
  socket.addEventListener("close", () => {
    element("connection-status").textContent = "Sender offline · reconnecting";
    element("connection-status").dataset.connected = "false";
    finishRequest();
    if (!closing) setTimeout(connectSender, 2500);
  });
  socket.addEventListener("error", () => {
    /* The close handler updates the interface and retries. */
  });
  socket.addEventListener("message", (event) => {
    // Process messages sequentially so duplicate checks and saves cannot race.
    incomingQueue = incomingQueue.then(() => receivePhoto(event));
  });
}
receiveButton.addEventListener("click", () => {
  if (pending || !storageLoaded || socket?.readyState !== WebSocket.OPEN)
    return;
  pending = true;
  updateReceiveButton();
  socket.send("receive");
  requestTimeout = setTimeout(() => {
    finishRequest();
    feedback("The sender has not replied yet. Check its terminal.", true);
  }, 30000);
});
window.addEventListener("pagehide", () => {
  closing = true;
  socket?.close();
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    closing = false;
    connectSender();
  }
});

// Load old and new records before allowing incoming photos to be saved.
const initialLibrary = loadPhotos();
initialLibrary
  .then(() => {
    storageLoaded = true;
    feedback("Click a photo to view, label, or organize it.");
    updateReceiveButton();
  })
  .catch((error) => {
    console.error(error);
    feedback(
      "Could not open your saved library. Reload the page to try again.",
      true
    );
  });
connectSender();

// Ask Python to reset its queue and wait for confirmation.
function resetSenderQueue() {
  return new Promise((resolve, reject) => {
    // Remember this connection so cleanup uses the same socket.
    const connection = socket;

    function cleanup() {
      clearTimeout(timeout);
      connection.removeEventListener("message", onMessage);
      connection.removeEventListener("close", onClose);
    }

    function onMessage(event) {
      let data;

      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      // Ignore ordinary photo messages; wait for the reset reply.
      if (data.type === "reset_complete") {
        cleanup();
        resolve();
      }
    }

    function onClose() {
      cleanup();
      reject(new Error("The Python sender disconnected."));
    }

    // Avoid waiting forever if Python is running the old code.
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("No reset reply. Restart the updated Python sender."));
    }, 5000);

    connection.addEventListener("message", onMessage);
    connection.addEventListener("close", onClose);

    try {
      connection.send("reset");
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

// Clear the saved library only after Python confirms it is ready.
element("restart-button").addEventListener("click", async () => {
  if (restartingDemo) return;

  if (!storageLoaded || socket?.readyState !== WebSocket.OPEN) {
    alert("Wait until the photo sender is connected, then try again.");
    return;
  }

  if (pending) {
    alert("Wait for the current photo to finish arriving, then restart.");
    return;
  }

  const confirmed = confirm(
    "Restart the demo?\n\n" +
      "This removes all saved photos, including archived photos, " +
      "names, tags, and folder assignments from this browser.\n\n" +
      "Your original image files stay untouched."
  );

  if (!confirmed) return;

  const restartButton = element("restart-button");

  restartingDemo = true;
  restartButton.disabled = true;
  restartButton.textContent = "Restarting…";
  updateReceiveButton();

  try {
    // Finish processing any previously received messages first.
    await incomingQueue;

    // Reset Python before removing the saved browser records.
    await resetSenderQueue();

    // Wait for IndexedDB to finish clearing the photos collection.
    await databaseOperation("readwrite", (store) => store.clear());

    // Return to an empty Library with all filters cleared.
    await loadPhotos();
    switchView("library");

    feedback("Demo restarted! Generate a random photo to begin again.");
  } catch (error) {
    console.error("Could not restart the demo:", error);

    feedback(
      "Could not finish restarting. Check that the updated Python " +
        "sender is running, then try again.",
      true
    );
  } finally {
    restartingDemo = false;
    restartButton.disabled = false;
    restartButton.textContent = "Restart demo";
    updateReceiveButton();
  }
});

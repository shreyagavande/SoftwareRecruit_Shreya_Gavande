# TMR Software Recruitment — Shreya Gavande

This repository contains two projects completed for the TMR software recruitment application:

## GitHub Repository

https://github.com/shreyagavande/SoftwareRecruit_Shreya_Gavande

1. **TCP Image Transfer:** sends an image from a simulated rover to a base station.
2. **Photo Studio:** a photography library built for the Web Team UI Development task.

Photo Studio uses ten of my own photographs as its sample collection.

## Technologies

- **Python:** TCP image transfer and WebSocket image sender
- **JavaScript:** frontend interactions and database operations
- **HTML and CSS:** page structure, styling, and responsive layouts
- **IndexedDB:** persistent image storage in the browser
- **websockets 13.1:** Python WebSocket library

## Project Structure

```text
SoftwareRecruit_Shreya_Gavande/
├── README.md
├── .gitignore
├── Socket/
│   ├── README.md
│   ├── rover.py
│   ├── basestation.py
│   └── Utah.bmp
└── UI/
    ├── index.html
    ├── style.css
    ├── app.js
    ├── sender.py
    └── images/
```

`Socket/output.bmp` is generated when the TCP transfer runs.
The Python virtual environment is created locally and is excluded from Git.

## Getting Started

The commands below are for macOS or Linux.

### Clone the repository

```bash
git clone https://github.com/shreyagavande/SoftwareRecruit_Shreya_Gavande.git
cd SoftwareRecruit_Shreya_Gavande
```

### Set up the Python environment

Photo Studio requires Python 3.9 or later.

```bash
python3 -m venv UI/.venv
UI/.venv/bin/python -m pip install "websockets==13.1"
```

The TCP image transfer task uses Python's standard library and does not require additional packages.

## Task 1: TCP Image Transfer

### Overview

This task simulates transferring an image from a rover to a base station.

- `basestation.py` listens for a TCP connection.
- `rover.py` reads `Socket/Utah.bmp` as binary data and sends it.
- The base station receives the data in chunks and writes it to `Socket/output.bmp`.

Both scripts run on the same computer using `127.0.0.1` and port `5555`.

### Run the transfer

Run all commands from the main project folder.

In the first terminal, start the base station:

```bash
python3 Socket/basestation.py
```

Wait for:

```text
Waiting for rover connection...
```

In a second terminal, start the rover:

```bash
python3 Socket/rover.py
```

After the transfer finishes, open `Socket/output.bmp` to view the received image.

### Verify the result

Compare the original image with the received file:

```bash
cmp Socket/Utah.bmp Socket/output.bmp && echo "Files match"
```

If the transfer was successful, the terminal prints `Files match`.

To repeat the transfer, start the base station again before running the rover.

## Task 2: Photo Studio

### Overview

Photo Studio is a web application for receiving, organizing, and searching photographs.

A Python script selects photographs from `UI/images` and sends their image data to the browser through a WebSocket connection. Incoming photographs are automatically saved in IndexedDB with the tag `unlabeled`.

The interface uses a beige and purple light theme, with a navy and lavender dark theme.

### Features

- Receive photographs from a collection of ten sample images
- Automatically save incoming images with an `unlabeled` tag
- Track progress through the ten-photo collection
- Open a large image preview with an editing sidebar
- Rename photographs
- Add comma-separated tags and choose tag colours
- Organize photographs into folders within the application
- Search saved photographs by name or tag
- Filter by folder or unlabeled status
- Archive photographs and restore them to the library
- Delete saved entries with confirmation
- Restart the demo to clear saved entries and reset the image queue
- Switch between light and dark mode
- Open the Guide for instructions
- Retain saved photographs and edits after refreshing the page

### Run Photo Studio

Keep two terminals running, both opened in the main project folder.

**Terminal 1 — start the webpage server:**

```bash
python3 -m http.server 8000 --bind 127.0.0.1 --directory UI
```

**Terminal 2 — start the Python image sender:**

```bash
UI/.venv/bin/python UI/sender.py
```

Open this address in your browser:

http://127.0.0.1:8000

Wait for the connection status to show **Connected** before generating a photograph.

### How to Use the Application

1. **Receive a photograph**  
   Click **Generate random photo**. The photograph is automatically saved and marked as unlabeled.

2. **Open the editor**  
   Click a photograph in the gallery. Its preview opens on the left, with editing controls on the right. On smaller screens, the controls appear below the preview.

3. **Rename and add tags**  
   Enter a photo name and tags separated by commas, such as `Toronto, architecture, sunset`. Choose colours for the tags and click **Save changes**.

4. **Organize into folders**  
   Enter a new folder name or choose an existing suggestion in the sidebar, then save. Use the Folder filter to browse that collection.

5. **Search the library**  
   Enter a photo name or tag in the search bar. Search ignores capitalization and can be combined with the folder and unlabeled filters.

6. **Find unlabeled photographs**  
   Select **Unlabeled** in the navigation or enable **Unlabeled only**. Removing all tags from a photograph marks it as unlabeled again.

7. **Archive or restore a photograph**  
   Open a photograph and choose **Archive photo**. Find it under **Archive**, then choose **Restore to library** to bring it back.

8. **Delete an entry**  
   Open a photograph, choose **Delete photo**, and confirm. This removes the saved database entry; the original image file remains in `UI/images`.

9. **Restart the demo**  
   Click **Restart demo** and confirm. This clears saved photographs, including archived entries, names, tags, and folder assignments, and resets the Python queue.

10. **Change the appearance**  
    Use the theme button in the navigation or choose an appearance in **Settings**.

### Sample Collection

The demo contains ten source photographs. **Generate random photo** selects from those photographs; it does not create new images.

The sample counter includes distinct saved photographs in both Library and Archive. Once all ten are saved, the app displays a completion message and disables the Generate button.

Use **Restart demo** to try the complete workflow again.

### How It Works

1. The browser connects to the Python sender at `ws://127.0.0.1:8765`.
2. Clicking Generate sends a `receive` message through the WebSocket.
3. Python selects an image from its shuffled queue and reads its bytes.
4. Python encodes the image as Base64 and sends a JSON message containing its name and image data.
5. JavaScript saves the photograph in IndexedDB and displays it in the gallery.
6. Saved edits update the existing database record.

The HTTP server serves the frontend files. Image data sent by the Python script travels through WebSockets.

Restarting the demo sends a `reset` message to Python. After Python confirms that its queue is ready, the frontend clears the saved photo records.

### Storage

Photo Studio uses an IndexedDB database named `PhotoStudio`, with a `photos` object store.

Each photograph stores:

- A unique ID
- Its name and image data
- Tags and tag colours
- A folder assignment
- Archive status
- Creation or update timestamps where available

The library is stored in the browser on the current device. Use the same browser profile and address to access saved photographs later.

Clearing browser site data removes the saved library. The application does not provide cloud synchronization or user accounts.

Folders are organizational labels within the application; they do not move files on the computer. Editing changes a photograph's information, not its image pixels.

## Verification Checklist

### TCP Transfer

- Start the base station before the rover.
- Confirm that `output.bmp` is created.
- Compare `Utah.bmp` and `output.bmp` using `cmp`.

### Photo Studio

- Receive a photograph and confirm it appears as unlabeled.
- Rename it, add tags, select tag colours, assign a folder, and save.
- Refresh the page and confirm that the changes remain.
- Search by name and tag.
- Filter by folder and unlabeled status.
- Archive a photograph and restore it.
- Cancel an edit and confirm the saved information remains unchanged.
- Delete an entry and confirm it stays deleted after refreshing.
- Receive all ten photographs and check the completion message.
- Restart the demo and confirm the count returns to zero.
- Generate another photograph after restarting.
- Switch themes and check the layout at a smaller screen size.

## Troubleshooting

### The webpage does not open

Make sure the HTTP server is running and open:

http://127.0.0.1:8000

### The sender is offline or Generate is disabled

Make sure `UI/sender.py` is running. The frontend attempts to reconnect automatically.

Generate is also disabled while receiving a photograph or when all ten sample photographs are already saved.

### Address already in use

Another process may already be using the port. Check your existing terminals and stop the previous server with **Control C** before starting it again.

### Restart demo does not receive a response

Make sure you saved the updated `sender.py`, then stop and restart the Python sender.

### Styling changes do not appear

Save your files and reload the page. In Safari, use **Command + Option + R** to reload from the server.

### Saved photographs appear to be missing

Check that you are using the same browser profile and exact address. `localhost` and `127.0.0.1` use separate browser storage.

## Author

**Shreya Gavande**

Created for the TMR software recruitment application, with a focus on Web Team UI Development.

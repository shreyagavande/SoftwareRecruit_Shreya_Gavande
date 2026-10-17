import asyncio
import random
from pathlib import Path
from websockets.asyncio.server import serve
import base64
import json

# Locate the images folder beside this script
IMAGE_FOLDER = Path(__file__).resolve().parent / "images"

# Collect JPG and PNG files
image_files = []

for file in IMAGE_FOLDER.iterdir():
    if file.is_file() and file.suffix.lower() in (".jpg", ".jpeg", ".png"):
        image_files.append(file)

print(f"Found {len(image_files)} photos.")

# Create the shuffled list before handling any connections
remaining_images = image_files.copy()
random.shuffle(remaining_images)


# Handle requests from the browser
async def handle_connection(websocket):
    print("Browser connected!")

    async for message in websocket:
                # Reset the sample queue when the user restarts the demo
        if message == "reset":
            # Replace the queue with a fresh copy of all source photos
            remaining_images[:] = image_files.copy()

            # Shuffle so the next round arrives in a different order
            random.shuffle(remaining_images)

            # Tell the browser that the queue is ready
            await websocket.send(json.dumps({
                "type": "reset_complete"
            }))

            print("Demo restarted. Photo queue reset.")

            # This message was a reset, so do not send a photo yet
            continue
            
        if message == "receive":
            # Tell the browser if there are no source photos
            if not image_files:
                await websocket.send(json.dumps({
                    "type": "error",
                    "message": "No photos found in the images folder."
                }))
                continue

            # Stop sending once every source photo has been sent
            if not remaining_images:
                await websocket.send(json.dumps({
                     "type": "error",
                     "message": "All photos have been received."
                     }))
                continue

            # Remove a photo so it cannot repeat during this round
            photo_path = remaining_images.pop()
            image_bytes = photo_path.read_bytes()

            # Encode the image bytes as text
            image_text = base64.b64encode(image_bytes).decode("ascii")

            # Identify the image format for the browser
            mime_type = (
                "image/png"
                if photo_path.suffix.lower() == ".png"
                else "image/jpeg"
            )

            # Send the name and image data through WebSocket
            await websocket.send(json.dumps({
                "type": "photo",
                "name": photo_path.stem,
                "image": f"data:{mime_type};base64,{image_text}"
            }))

            print(f"Sent photo: {photo_path.name}")


# Start the WebSocket server and keep it running
async def main():
    async with serve(handle_connection, "127.0.0.1", 8765):
        print("WebSocket server running at ws://127.0.0.1:8765")
        await asyncio.Future()


asyncio.run(main())
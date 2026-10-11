# This file reads the image data from the Utah.bmp and sends it to the basestation.py file

import socket

rover = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

rover.connect(("127.0.0.1", 5555)) #local address and port number, connects to the basestation.py file

print("The rover is connected to the basestation!")

# Read the image data from the Utah.bmp file in binary mode
with open("Socket/Utah.bmp", "rb") as image_file:
    image_data = image_file.read()

#send the image data to the basestation.py file
rover.sendall(image_data)
rover.close()

# Rover Image transfer

The goal of this project was to send an image to the base station. Both programs run on the same computer usig a localhost (127.0.0.1) and port 5555.

# Side note

I did not know how to write in python so I used AI to understand how the code works and what each part of the code does

Here are the notes I created for myself while learning:
Python

# A socket

is a communication endpoint that a program uses to send or receive data

# socket.socket(...)

creates a socket. The first socket means a module, the second is the tool inside it that creates the socket

# socket.AF_INET

tells it to use IPv4 addresses, like 127.0.0.1

# socket.SOCK_STREAM

selects TCP, which lets up transfer data reliably and in order
server = stores the created socket in a variable called server, so we can refer to it later.

# TCP (Transmission Control Protocal)

It is a set of rules for reliably sending data between programs
Established a connection between the sender and receiver
Retransmits data if it gets lost along the way
Delivers teh data in the correct order

# .bind()

assigns it a local address and port
“127.0.0.1” means your own computer (local host). Both programs will run on locally on my computer

# .listen()

puts it into listening mode, allowing connection requests to queue until your program accepts them

# server.accept()

waits until another program connects
When the rover connects, it returns two values, which stores two variables, connection and address

# open(“Socket/utah.bmp”, “rb”)

opens the image.

# rb

means read binary, it reads all its bytes and stores them in image_data
with automatically closes the file when we finish the intended sections, the data is collected in image_data
rover is the connected socket

# .sendall()

keeps sending until all the bytes have been sent, or an error occurs in the program
image_data holds the bytes being read from Utah.bmp

# “Socket/output.bmp”

is where the received image is saved

# “Wb”

means write binary

# “rb”

means read binary
Output_file is our variable for accessing this opened file

# connection.recv(4096)

waits for data and receives up to 4096 bytes, storing them in chunk

# if not chunk:

check whether we received empty bytes. That means the rover has closed its sending side and there's no more data to receive

# output_file.write(chunk)

writes each nonempty chunk into the file, continuing after the previous chunk

# Created files

- rover.py: Reads Utah.bmp and sends its bytes using a TCP socket.
- basestation.py: Receives the bytes and saves them as output.bmp.
- Utah.bmp: The original image.
- output.bmp: The image created by the base station after a transfer.

# How It Works

The base station creates a socket, binds it to localhost on port 5555,
and listens for a connection.

The rover connects, reads Utah.bmp in binary mode, and sends its bytes
using sendall(). It then closes its connection.

The base station receives up to 4096 bytes at a time and writes each
chunk to output.bmp. It stops receiving when recv() returns empty bytes,
indicating that the sender has closed its sending side and no data remains.

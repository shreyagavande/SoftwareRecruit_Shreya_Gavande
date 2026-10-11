# This file receives the data from rover.py and saves it as output.bmp
import socket

# This creates a TCP socket, eventually it will create an established connection between the sender and reciever
server = socket.socket(socket.AF_INET, socket.SOCK_STREAM) 

server.bind(("127.0.0.1", 5555)) #local address and port number

server.listen()

print("Waiting for rover connection...")

connection, address = server.accept()

print("The rover is connected!")

#opens the output.bmp file in binary mode and writes the data received from rover.py
with open ("Socket/output.bmp", "wb") as output_file:
    while True:
        chunk = connection.recv(4096) #receives the data in chunks of 4096 bytes

        if not chunk:
            break

        output_file.write(chunk)


connection.close()
server.close()

print("The image has been received and saved as output.bmp!!")

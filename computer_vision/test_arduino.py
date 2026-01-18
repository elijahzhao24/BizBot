import serial
import time

arduino_port = '/dev/tty.usbmodem1301'  # your Arduino port
arduino = serial.Serial(port=arduino_port, baudrate=9600, timeout=1)

time.sleep(2)  # wait for Arduino to reset

# Send command to call helloWorld()
arduino.write(b'HELLO\n')

# Read response
while True:
    if arduino.in_waiting > 0:
        line = arduino.readline().decode('utf-8').strip()
        print(f"Arduino says: {line}")
        break

arduino.close()
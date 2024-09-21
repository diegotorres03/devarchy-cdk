SerialPort

Secure context: This feature is available only in secure contexts (HTTPS), in some or all supporting browsers.

Experimental: This is an experimental technology
Check the Browser compatibility table carefully before using this in production.

Note: This feature is available in Dedicated Web Workers.

The SerialPort interface of the Web Serial API provides access to a serial port on the host device.
EventTarget
SerialPort
Constructor

Instances of this interface may be obtained by calling methods of the Serial interface, therefore it has no constructor of its own.
Instance properties

SerialPort.readable Read only Experimental

    Returns a ReadableStream for receiving data from the device connected to the port.
SerialPort.writable Read only Experimental

    Returns a WritableStream for sending data to the device connected to the port.

Instance methods

SerialPort.forget() Experimental

    Returns a Promise that resolves when the port closes and is forgotten.
SerialPort.getInfo() Experimental

    Returns an object containing properties of the port.
SerialPort.open() Experimental

    Returns a Promise that resolves when the port is opened. By default the port is opened with 8 data bits, 1 stop bit and no parity checking.
SerialPort.setSignals() Experimental

    Sets control signals on the port and returns a Promise that resolves when they are set.
SerialPort.getSignals() Experimental

    Returns a Promise that resolves with an object containing the current state of the port's control signals.
SerialPort.close() Experimental

    Returns a Promise that resolves when the port closes.

Events

connect Experimental

    An event fired when the port has connected to the device.
disconnect Experimental

    An event fired when the port has disconnected from the device.

Examples
Opening a port

Before communicating on a serial port it must be opened. Opening the port allows the site to specify the necessary parameters that control how data is transmitted and received. Developers should check the documentation for the device they are connecting to for the appropriate parameters.
js

await port.open({ baudRate: 9600 /* pick your baud rate */ });

Once the Promise returned by open() resolves the readable and writable attributes can be accessed to get the ReadableStream and WritableStream instances for receiving data from and sending data to the connected device.
Reading data from a port

The following example shows how to read data from a port. The outer loop handles non-fatal errors, creating a new reader until a fatal error is encountered and readable becomes null.
js

while (port.readable) {
  const reader = port.readable.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        // |reader| has been canceled.
        break;
      }
      // Do something with |value|…
    }
  } catch (error) {
    // Handle |error|…
  } finally {
    reader.releaseLock();
  }
}

Writing data to a port

The following example shows how to write a string to a port. A TextEncoder converts the string to a Uint8Array before transmission.
js

const encoder = new TextEncoder();
const writer = port.writable.getWriter();
await writer.write(encoder.encode("PING"));
writer.releaseLock();

Specifications
Specification
Web Serial API
# dom-serialport


class UDPClientNode {
    static title = "UDP Client";
    static desc = "Sends and receives raw UDP datagrams (uses dgram in Node.js and WebTransport in browser)";
  
    constructor() {
      // Define common properties.
      this.properties = {
        // For Node.js: target address and port.
        remoteHost: "127.0.0.1",
        remotePort: 41234,
        // For Browser: the URL to a WebTransport server that proxies UDP traffic.
        udpUrl: "https://127.0.0.1:443/udp",
      };
      this._isNode = (typeof process !== "undefined" && process.versions && process.versions.node);
      this._socket = null;
      this._reader = null; // for browser
      this._writer = null; // for browser
  
      if (this._isNode) {
        this.connectNode();
      } else if (typeof window !== "undefined") {
        this.connectBrowser();
      }
    }
  
    // -------------------------------
    // Node.js implementation using dgram
    // -------------------------------
    connectNode() {
      try {
        const dgram = require("dgram");
        this._socket = dgram.createSocket("udp4");
        this._socket.on("message", (msg, rinfo) => {
          const message = msg.toString();
          console.log("[UDP Client Node][Node] Received message:", message, "from", rinfo);
          // Here you would trigger your node event or update output.
        });
        this._socket.on("error", (err) => {
          console.error("[UDP Client Node][Node] Socket error:", err);
        });
        // Optionally bind the socket to a local port (or let the OS choose one)
        this._socket.bind(); 
        console.log("[UDP Client Node][Node] UDP socket created.");
      } catch (e) {
        console.error("[UDP Client Node][Node] Error creating UDP socket:", e);
      }
    }
  
    // -------------------------------
    // Browser implementation using WebTransport
    // -------------------------------
    async connectBrowser() {
      if ("WebTransport" in window) {
        try {
          // Create a WebTransport connection to the provided URL.
          this._socket = new WebTransport(this.properties.udpUrl);
          await this._socket.ready;
          console.log("[UDP Client Node][Browser] WebTransport connection is ready.");
          // Get a writer for sending datagrams.
          this._writer = this._socket.datagrams.writable.getWriter();
          // Get a reader to process incoming datagrams.
          this._reader = this._socket.datagrams.readable.getReader();
          this.readLoop();
        } catch (e) {
          console.error("[UDP Client Node][Browser] Error establishing WebTransport connection:", e);
        }
      } else {
        console.error("[UDP Client Node][Browser] WebTransport API is not supported in this browser.");
      }
    }
  
    // Continuously read incoming datagrams in the browser.
    async readLoop() {
      try {
        for (;;) {
          const { value, done } = await this._reader.read();
          if (done) break;
          // value is a Uint8Array; decode it.
          const message = new TextDecoder("utf-8").decode(value);
          console.log("[UDP Client Node][Browser] Received message:", message);
          // Trigger event or update output here.
        }
      } catch (e) {
        console.error("[UDP Client Node][Browser] Error in read loop:", e);
      }
    }
  
    // -------------------------------
    // Common sending method
    // -------------------------------
    async send(data) {
      const msg = JSON.stringify(data);
      if (this._isNode) {
        // In Node.js, send using dgram.
        const buffer = Buffer.from(msg);
        this._socket.send(
          buffer,
          0,
          buffer.length,
          this.properties.remotePort,
          this.properties.remoteHost,
          (err) => {
            if (err) {
              console.error("[UDP Client Node][Node] Error sending message:", err);
            } else {
              console.log("[UDP Client Node][Node] Sent message:", msg);
            }
          }
        );
      } else {
        // In the browser, send using WebTransport if available.
        if (this._writer) {
          try {
            const encoded = new TextEncoder().encode(msg);
            await this._writer.write(encoded);
            console.log("[UDP Client Node][Browser] Sent message:", msg);
          } catch (e) {
            console.error("[UDP Client Node][Browser] Error sending message:", e);
          }
        }
      }
    }
}
  
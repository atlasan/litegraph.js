// -- server only libraries --
LiteGraph.LibraryManager.registerLibrary({
    key: "http",
    globalObject: "http",
    server: { npm: "http" }
});
// deferred LiteGraph.LibraryManager.loadLibrary("http");

LiteGraph.LibraryManager.registerLibrary({
    key: "ws",
    globalObject: "ws",
    server: { npm: "ws" },
    // defaultExport: "WebSocketServer"
});
// deferred LiteGraph.LibraryManager.loadLibrary("ws");

LiteGraph.LibraryManager.registerLibrary({
    key: "socket.io",
    globalObject: "ioserver",
    server: { npm: "socket.io" },
    defaultExport: "Server"
});
// deferred LiteGraph.LibraryManager.loadLibrary("socket.io");

LiteGraph.LibraryManager.registerLibrary({
    key: "dgram",
    globalObject: "dgram",
    server: { npm: "dgram" }
});
// deferred LiteGraph.LibraryManager.loadLibrary("dgram");

LiteGraph.LibraryManager.registerLibrary({
    key: "osc-js",
    globalObject: "OSC",
    defaultExport: true,
    server: { npm: "osc-js" }
});
// deferred LiteGraph.LibraryManager.loadLibrary("osc-js");

// ----------------------------
// BaseServer Class (common)
// ----------------------------
class BaseServer {
    constructor() {
        this.runtime = "node";
        // Child classes should set port and any other defaults.
        this.properties = {
            should_autoconnect: true,
            retryTimeout: 3000, // milliseconds
            retryLimit: 0       // 0 = unlimited retries
        };
        this.retryCount = 0;
        this.status = "stopped"; // stopped, starting, running, stopping, failed
        this.server = null;
        this._logged_once = [];
    }

    // Helper: Return server title or class name.
    _getServerName() {
        return this.constructor.title || this.constructor.name;
    }

    // Logging helpers
    log(...args) {
        console.log(`[${this._getServerName()}]`, ...args);
    }
    warn(...args) {
        console.warn(`[${this._getServerName()}]`, ...args);
    }
    error(...args) {
        console.error(`[${this._getServerName()}]`, ...args);
    }
    log_once(first) {
        if (!this._logged_once.includes(first)) {
            this._logged_once.push(first);
            return this.log(...arguments);
        }
    }
    warn_once(first) {
        if (!this._logged_once.includes(first)) {
            this._logged_once.push(first);
            return this.warn(...arguments);
        }
    }
    error_once(first) {
        if (!this._logged_once.includes(first)) {
            this._logged_once.push(first);
            return this.log(...arguments);
        }
    }

    onPropertyChanged(name, value) {
        this.log(`Property changed: ${name} = ${value}`);
        // Restart if a critical property like "port" changes.
        if (name === "port" && this.server && this.status === "running") {
            if (this.properties.port !== value) {
                this.stopServer(() => {
                    this.properties.port = value;
                    if (this.properties.should_autoconnect) {
                        this.log(`Auto-restarting server on new port ${value}`);
                        this.startServer();
                    }
                });
            }
        } else {
            this.properties[name] = value;
        }
    }

    startServer() {
        if (typeof process === "undefined" || process.browser) {
            this.warn_once("This server node is designed to run in Node.js.");
            return false;
        }
        if (this.status === "starting" || this.status === "running") {
            this.log("Server is already starting or running.");
            return;
        }
        if (this.status === "stopping") return;
        this._stopRequested = false;
        clearTimeout(this._retryTimer);
        this._retryTimer = null;
        this.status = "starting";
        this.log(`Starting server on port ${this.properties.port}...`);

        try {
            // Child class must implement _createServer()
            this.server = this._createServer();
            // Child class may override _setupServerListeners() to attach events.
            this._setupServerListeners();
        } catch (e) {
            this.error("Error starting server:", e);
            this.status = "failed";
            this._attemptRetry();
        }
    }

    stopServer(callback) {
        this._stopRequested = true;
        clearTimeout(this._retryTimer);
        this._retryTimer = null;
        const stopped = new Promise((resolve, reject) => {
            this._closeServer((error) => {
                try { callback?.(error); } catch (callbackError) { reject(callbackError); return; }
                if (error) reject(error); else resolve();
            });
        });
        // Legacy callers can still use the callback form without awaiting.
        stopped.catch(() => {});
        return stopped;
    }

    _closeServer(callback) {
        if (this._closeCallbacks) {
            if (callback) this._closeCallbacks.push(callback);
            return;
        }
        const server = this.server;
        if (!server) {
            this.status = "stopped";
            callback?.();
            return;
        }
        this.status = "stopping";
        this._closeCallbacks = callback ? [callback] : [];
        let closed = false;
        const done = (error) => {
            if (closed) return;
            closed = true;
            if (this.server === server) this.server = null;
            this.status = "stopped";
            const callbacks = this._closeCallbacks;
            this._closeCallbacks = null;
            if (error) this.error("Error closing server:", error);
            for (const cb of callbacks) cb(error);
        };
        try {
            // ws.close waits for clients: terminate this node's clients during teardown.
            this._clients?.forEach((client) => client.terminate());
            this._clients?.clear();
            const OSC = LiteGraph.getGlobalVariable("OSC");
            if (typeof OSC === "function" && server instanceof OSC) {
                server.on("close", () => done());
                server.close();
            } else {
                server.close(done);
            }
        } catch (error) { done(error); }
    }

    restartServer() {
        if (this.server) {
            this.stopServer(() => {
                this.startServer();
            });
        }
    }

    _attemptRetry(delay = this.properties.retryTimeout) {
        if (this._stopRequested || this._retryTimer || this._retryPending) return;
        if (this.properties.retryLimit !== 0 && this.retryCount >= this.properties.retryLimit) {
            this.error("Max retry limit reached. Server failed to start.");
            return;
        }
        this._retryPending = true;
        this._closeServer(() => {
            this._retryPending = false;
            if (this._stopRequested) return;
            this.status = "failed";
            this._retryTimer = setTimeout(() => {
                this._retryTimer = null;
                if (this._stopRequested) return;
                this.retryCount++;
                this.startServer();
            }, delay);
        });
    }

    // Abstract – must be implemented by child classes.
    _createServer() {
        throw new Error("_createServer() must be implemented by subclass");
    }

    // Optional – child classes can override to add listeners.
    _setupServerListeners() {
        // Default: do nothing.
    }

    onStarted() {
        this.log(this.name, "Server started.");
    }
    onStopped() {
        this.log(this.name, "Server stopped.");
    }

    onStop() { return this.stopServer(); }
    onRemoved() { return this.stopServer(); }
}

// ----------------------------
// WebSocketServer Class (child)
// ----------------------------
class WebSocketServer extends BaseServer {
    static title = "WebSocket Server";
    static desc = "WebSocket server: receive, send, and broadcast messages.";

    constructor() {
        super();
        this.libraries = ["ws"];
        // Set default properties specific to WebSocket.
        this.properties.port = 8010;
        this.properties.only_send_changes = true;
        this.properties.broadcast = true;
        // Internal state
        this._clients = new Set();
        this._last_sent_data = null;
        this._last_received_data = null;

        // In Node.js, auto-start if should_autoconnect is enabled.
        if (typeof process !== "undefined" && !process.browser) {
            // ok
        } else {
            this.warn_once("WebSocket Server node is designed to run in Node.js.");
            this.boxcolor = "#FF0000";
            this.title = WebSocketServer.title + " (run on server)";
        }
    }

    // Create the actual WebSocket server using the "ws" library.
    _createServer() {
        // let WebSocket = (typeof ws !== "undefined" ? ws : require("ws"));
        // if (typeof WebSocket !== "object") {
        //     WebSocket = LiteGraph.getGlobalVariable("ws");
        // }
        let WebSocketPkg = LiteGraph.LibraryManager.getLib("ws");
        if (!WebSocketPkg) {
            throw new Error("WebSocket library not available");
        } else {
            this.log("Got WebSocket package", WebSocketPkg);
        }
        this.log("Creating WebSocket server instance on port", this.properties.port);
        return new WebSocketPkg.WebSocketServer({ port: this.properties.port });
    }

    // Attach event listeners specific to WebSocket.
    _setupServerListeners() {
        if (!this.server) return;
        this.server.on("listening", () => {
            this.status = "running";
            this.retryCount = 0;
            this.log(`Server is listening on port ${this.properties.port}`);
            this.onStarted();
        });
        this.server.on("connection", (ws) => {
            this._clients.add(ws);
            this.log("New client connected.");
            ws.on("message", (message) => this.handleMessage(ws, message));
            ws.on("close", () => {
                this._clients.delete(ws);
                this.log("Client disconnected.");
            });
            ws.on("error", (error) => {
                this.error("Client error:", error);
            });
            try {
                ws.send("Welcome to the WebSocket server!");
            } catch (err) {
                this.error("Error sending welcome message:", err);
            }
        });
        this.server.on("error", (error) => {
            this.error("Server error:", error);
            this.status = "failed";
            this._attemptRetry();
        });
    }

    // Process incoming messages.
    handleMessage(ws, message) {
        let receivedMessage = message;
        if (typeof message !== "string") {
            try {
                receivedMessage = message.toString();
            } catch (e) {
                this.error("Error converting message to string:", e);
            }
        }
        this.log("Received message:", receivedMessage);
        let data = receivedMessage;
        try {
            data = JSON.parse(receivedMessage);
        } catch (err) {
            this.log("Message is not JSON formatted; processing as raw text.");
        }
        this._last_received_data = data;
        this.triggerSlot("onMessage", data);
        // Broadcast to all clients except the sender if enabled.
        if (this.properties.broadcast) {
            this.sendToAllClients(data);
        }
    }

    // Helper method to send a message to all connected clients.
    sendToAllClients(message) {
        let msg;
        try {
            msg = typeof message === "string" ? message : JSON.stringify(message);
        } catch (e) {
            this.error("Error stringifying message for broadcast:", e);
            return;
        }
        for (const client of this._clients) {
            if (client.readyState === client.OPEN) {
                try {
                    client.send(msg);
                } catch (err) {
                    this.error("Error sending message to client:", err);
                }
            }
        }
        this.log("Sent message to all clients:", msg);
    }

    // onExecute: update properties from inputs, auto-start if needed, and process incoming data.
    onExecute() {
        if (typeof process == "undefined" || process.browser) {
            return;
        }
        if (this.status === "stopped" && this.properties.should_autoconnect) {
            this.log(`Autoconnect triggered on execute, port ${this.properties.port}`);
            this.startServer();
        }
        const inputMessage = this.getInputData("dataIn");
        if (inputMessage != null && this.properties.broadcast) {
            let jsonMessage;
            try {
                jsonMessage = JSON.stringify({ type: 0, data: inputMessage });
            } catch (err) {
                this.error("Error stringifying input message:", err);
            }
            if (jsonMessage) {
                if (this.properties.only_send_changes && jsonMessage === this._last_sent_data) {
                    this.log("Message unchanged, not sending (only_send_changes enabled).");
                } else {
                    this._last_sent_data = jsonMessage;
                    this.sendToAllClients(jsonMessage);
                }
            }
        }
        // Update outputs
        this.setOutputData("status", this.status);
        this.setOutputData("dataOut", this._last_received_data);
    }

    restartServer() {
        if (this.server) {
            this.log("Restarting WSServer");
            this.stopServer(() => {
                this.startServer();
            });
        }
    }

    onAction(action, param) {
        if (!this.server || this.server.readyState !== this.server.OPEN) return;
        if (action === "doSend") {
            const data = this.getInputData("dataIn");
            if (data != null) {
                let msg;
                try {
                    msg = JSON.stringify({ type: 1, data: data });
                } catch (err) {
                    this.error("Error stringifying data in action:", err);
                }
                if (msg) {
                    this.sendToAllClients(msg);
                }
            }
        }
    }

    onGetInputs() {
        return [
            ["doSend", LiteGraph.ACTION],
            ["dataIn", 0],
            ["port", "number"],
        ];
    }

    onGetOutputs() {
        return [
            ["onMessage", LiteGraph.EVENT],
            ["dataOut", 0],
            ["status", "string"],
            ["onStarted", LiteGraph.EVENT],
            ["onStopped", LiteGraph.EVENT]
        ];
    }

    onStarted() {
        this.log("WSServer started");
        this.triggerSlot("onStarted");
    }

    onStopped() {
        this.log("WSServer stopped");
        this.triggerSlot("onStopped");
    }
}

// Register the node type with LiteGraph
LiteGraph.registerNodeType("server/network/websocketserver", WebSocketServer);




// ======================
// Socket.io Server Node
// ======================
class SocketIOServerNode extends BaseServer {
    static title = "Socket.io Server";
    static desc = "Creates a Socket.io server for real-time communication.";

    constructor() {
        super();
        this.libraries = ["socket.io"];
        // Set child-specific defaults.
        this.properties.port = 3030;
        // Initialize internal state.
        this.clients = new Set();
        if (typeof process !== "undefined" && !process.browser) {
            // ok
        } else {
            this.warn_once("Socket.io Server Node is designed to run in Node.js.");
            this.boxcolor = "#FF0000";
            this.title = SocketIOServerNode.title + " (run on server)";
        }
    }

    // Create the Socket.io server instance.
    _createServer() {
        // The client and server constructors are distinct even when both are loaded.
        const pkg = LiteGraph.LibraryManager.getLib("socket.io");
        if (typeof pkg !== "function") throw new Error("Socket.io server library not available");
        this.log("Creating Socket.io server instance on port", this.properties.port);
        // Create and return the server.
        return new pkg(this.properties.port, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
    }

    // Attach Socket.io specific listeners.
    _setupServerListeners() {
        // Socket.io is ready immediately after creation.
        this.status = "running";
        this.retryCount = 0;
        this.log(`Socket.io server is running on port ${this.properties.port}`);
        this.onStarted();
        this.server.on("connection", (socket) => {
            this.clients.add(socket);
            this.log("New client connected:", socket.id);
            socket.on("message", (data) => {
                this.log("SocketIO Received message:", data);
                this.setOutputData("dataOut", data);
                this.triggerSlot("onMessage", data);
                this.broadcast("message", data);
            });
            socket.onAny((event, ...args) => {
                this.log(`SocketIO Received event: ${event} with data:`, args);
                this.setOutputData("dataOut", arguments);
                this.triggerSlot("onMessage", event);
                this.broadcast(event, args);
            });
            socket.on("disconnect", () => {
                this.clients.delete(socket);
                this.log("Client disconnected:", socket.id);
            });
            socket.emit("welcome", "Welcome to the Socket.io server!");
        });
        this.server.on("error", (err) => {
            this.error("Socket.io server error:", err);
            this.status = "failed";
            this._attemptRetry();
        });
    }

    // Broadcast a message to all clients.
    broadcast(event, data) {
        if (this.server) {
            this.server.emit(event, data);
        }
    }

    // Example onExecute method: update status output.
    onExecute() {
        if (typeof process == "undefined" || process.browser) {
            return;
        }
        if (this.status === "stopped" && this.properties.should_autoconnect) {
            this.log(`Auto-restarting on port ${this.properties.port}`);
            this.startServer();
        }
        this.setOutputData("status", this.status);
    }

    onStarted() {
        this.log("SocketIOServer started");
        this.triggerSlot("onStarted");
    }

    onStopped() {
        this.log("SocketIOServer stopped");
        this.triggerSlot("onStopped");
    }

    onGetInputs() {
        
    }

    onGetOutputs() {
        return [["onMessage", LiteGraph.EVENT], ["dataOut", 0], ["status", "string"], ["onStarted", LiteGraph.EVENT], ["onStopped", LiteGraph.EVENT]];
    }
}

// Register Socket.io server node.
LiteGraph.registerNodeType("nodejs/network/SocketIO_server", SocketIOServerNode);

// ======================
// OSC Bridge Node
// ======================
class OSCBridge extends BaseServer {
    static title = "OSC Bridge";
    static desc = "Creates an OSC bridge with configurable UDP and WebSocket properties";

    constructor() {
        super();
        this.libraries = ["ws", "osc-js"];
        // Define child-specific default properties.
        this.properties.udpServer_host = "localhost";
        this.properties.udpServer_port = 41234;
        this.properties.udpServer_exclusive = false;
        this.properties.udpClient_host = "localhost";
        this.properties.udpClient_port = 41235;
        this.properties.wsServer_host = "localhost";
        this.properties.wsServer_port = 8002;
        this.properties.receiver = "ws";
        // Auto-start if in Node.js.
        if (typeof process !== "undefined" && !process.browser) {
            // OK
        } else {
            this.warn_once("OSC Bridge Node is designed to run in Node.js.");
            this.boxcolor = "#FF0000";
            this.title = OSCBridge.title + " (run on server)";
        }
    }

    _createServer() {
        let OSC = LiteGraph.getGlobalVariable("OSC");
        if (typeof OSC === "undefined" || !OSC) {
            throw new Error("osc-js library not available");
        }
        const config = {
            udpServer: {
                host: this.properties.udpServer_host,
                port: parseInt(this.properties.udpServer_port, 10),
                exclusive: this.properties.udpServer_exclusive
            },
            udpClient: {
                host: this.properties.udpClient_host,
                port: parseInt(this.properties.udpClient_port, 10)
            },
            wsServer: {
                host: this.properties.wsServer_host,
                port: parseInt(this.properties.wsServer_port, 10)
            },
            receiver: this.properties.receiver
        };
        this.log("Creating OSC Bridge with config:", config);
        return new OSC({ plugin: new OSC.BridgePlugin(config) });
    }

    _setupServerListeners() {
        this.server.on("ready", () => {
            this.status = "running";
            this.retryCount = 0;
            this.log("OSC Bridge is running.");
            this.onStarted();
        });
        this.server.on("message", (oscMsg) => {
            this.log("Received OSC message:", oscMsg);
            this.setOutputData("dataOut", oscMsg);
            this.triggerSlot("onMessage", oscMsg);
        });
        this.server.on("error", (err) => {
            this.error("OSC Bridge error:", err);
            this.status = "failed";
        });
        this.server.open();
    }

    onExecute() {
        if (typeof process == "undefined" || process.browser) {
            return;
        }
        if (this.status === "stopped" && this.properties.should_autoconnect) {
            this.startServer();
        }
        this.setOutputData("status", this.status);
    }

    onGetInputs() {
        
    }

    onGetOutputs() {
        return [
            ["dataOut", 0],
            ["status", "string"],
            ["onStarted", LiteGraph.EVENT],
            ["onStopped", LiteGraph.EVENT]
        ];
    }
    
    onStarted() {
        this.log("OscBridgeServer started");
        this.triggerSlot("onStarted");
    }

    onStopped() {
        this.log("OscBridgeServer stopped");
        this.triggerSlot("onStopped");
    }
}

// Register OSC Bridge node.
if (typeof LiteGraph !== "undefined") {
    LiteGraph.registerNodeType("nodejs/network/osc_bridge", OSCBridge);
}

// ======================
// OSC Server Node
// ======================
class OSCServerNode extends BaseServer {
    static title = "OSC Server";
    static desc = "Creates an OSC server";

    constructor() {
        super();
        this.libraries = ["osc-js"];
        // Set child-specific properties.
        this.properties.open_port = 9001;
        this.properties.open_host = "localhost";
        this.properties.send_port = 9002;
        this.properties.send_host = "localhost";
        // Fixed outputs and action inputs can be added via LiteGraph API.
        this.addOutput("onMessage", LiteGraph.EVENT);
        this.addOutput("dataOut", 0);
        this.addOutput("status", "string");
        this.addOutput("onStarted", LiteGraph.EVENT);
        this.addOutput("onStopped", LiteGraph.EVENT);
        this.addInput("start", LiteGraph.ACTION);
        this.addInput("stop", LiteGraph.ACTION);

        if (typeof process === "undefined" || process.browser) {
            this.warn_once("OSC Server Node is designed to run in Node.js.");
            this.boxcolor = "#FF0000";
            this.title = "OSC (run on server)";
        } else {
            // OK
        }
    }

    _createServer() {
        let OSC = LiteGraph.getGlobalVariable("OSC");
        if (typeof OSC === "undefined" || !OSC) {
            throw new Error("osc-js library not available");
        }
        const dgramOpts = {
            open: { host: this.properties.open_host, port: this.properties.open_port },
            send: { host: this.properties.send_host, port: this.properties.send_port }
        };
        this.log("Creating OSC Server with dgram options:", dgramOpts);
        return new OSC({ plugin: new OSC.DatagramPlugin(dgramOpts) });
    }

    _setupServerListeners() {
        this.server.on("open", () => {
            this.log(`OSC server is running on ${this.properties.open_host}:${this.properties.open_port}`);
            this.status = "running";
            this.onStarted();
        });
        this.server.on("message", (msg) => {
            this.log("Received OSC message:", msg);
            this.setOutputData("message", msg);
            this.triggerSlot("onMessage", msg);
        });
        this.server.on("*", (msg) => {
            this.log("Received OSC message (catch-all):", msg);
            this.setOutputData("message", msg);
            this.triggerSlot("onMessage", msg);
        });
        this.server.on("error", (err) => {
            this.error("OSC Server error:", err);
            this.status = "failed";
        });
        this.server.open({ port: this.properties.open_port, host: this.properties.open_host });
    }

    onAction(action, param) {
        if (action === "start") {
            if (this.status !== "running") {
                this.startServer();
            }
        } else if (action === "stop") {
            if (this.status === "running") {
                this.stopServer();
            }
        }
    }

    onExecute() {
        if (typeof process == "undefined" || process.browser) {
            return;
        }
        if (this.status === "stopped" && this.properties.should_autoconnect) {
            this.startServer();
        }
        this.setOutputData("status", this.status);
    }

    onGetInputs() {
        return [];
    }

    onGetOutputs() {
        return [];
    }
}

// Register OSC Server node.
if (typeof LiteGraph !== "undefined") {
    LiteGraph.registerNodeType("nodejs/network/OSC_server", OSCServerNode);
}

// ======================
// UDPServerNode (receiving only, extends BaseServer)
// ======================
class UDPServerNode extends BaseServer {
    static title = "UDP Server";
    static desc = "Receives data through UDP";

    constructor() {
        super();
        this.libraries = ["dgram"];
        this.size = [60, 20];
        // Add outputs only – no sending inputs needed.
        this.addOutput("onMessage", LiteGraph.EVENT);
        this.addOutput("dataOut", 0);

        // Set UDP-specific default properties.
        this.properties.host = "127.0.0.1";
        this.properties.port = 41234;
        this.properties.auto_reconnect = true;
        this.properties.reconnectTimeout = 5000;

        // Internal state for message tracking.
        this._last_received_data = null;

        // Only run in Node.js environment.
        if (typeof process !== "undefined" && process.versions && process.versions.node) {
            // OK
        } else {
            this.warn_once("UDPServerNode can only run on Node.js server");
            this.boxcolor = "#FF0000";
            this.title = "UDP Server (run on server)";
        }
    }

    // Create the UDP socket.
    _createServer() {
        let dgramPkg = LiteGraph.LibraryManager.getLib("dgram");
        if (!dgramPkg) {
            throw new Error("dgram library not available");
        } else {
            this.log("Got dgram package", dgramPkg);
        }
        try {
            return dgramPkg.createSocket("udp4");
        } catch (e) {
            this.error(e.message ?? e);
        }
    }

    // Set up UDP event listeners.
    _setupServerListeners() {
        if (!this.server) return;
        this.server.on("message", (msg, rinfo) => {
            let msgStr = msg.toString();
            let parsed;
            try {
                parsed = JSON.parse(msgStr);
            } catch (err) {
                this.error("Error parsing UDP message:", err);
                parsed = msgStr;
            }
            this._last_received_data = parsed;
            this.setOutputData("dataOut", this._last_received_data);
            this.triggerSlot("onMessage", this._last_received_data);
            this.log("UDP message received:", msgStr, "from", rinfo);
        });
        this.server.on("error", (err) => {
            this.error("UDP error:", err);
            this.status = "failed";
            if (this.properties.auto_reconnect) this._attemptRetry(this.properties.reconnectTimeout);
            else this.stopServer();
        });
        this.server.on("listening", () => {
            if (this._stopRequested || !this.server) return;
            this.status = "running";
            this.retryCount = 0;
            const address = this.server.address();
            this.log(`UDP server listening on ${address.address}:${address.port}`);
        });
        // Bind the socket to the specified port.
        this.server.bind(this.properties.port, this.properties.host);
    }

    // onExecute simply updates the output with the latest received data.
    onExecute() {
        if (typeof process == "undefined" || process.browser) {
            return;
        }
        if (!this.server) {
            this.startServer();
        }
        this.setOutputData("dataOut", this._last_received_data);
        this.setOutputData("status", this.status);
    }

    onGetInputs() {
        return [];
    }

    onGetOutputs() {
        return [["onMessage", LiteGraph.EVENT], ["dataOut", 0]];
    }
}
// Register UDP Server node.
if (typeof LiteGraph !== "undefined") {
    LiteGraph.registerNodeType("nodejs/network/UDP_server", UDPServerNode);
}

// what these node types need from the runtime (see LiteGraph.declareCapabilities)
LiteGraph.declareCapabilities(["nodejs/", "server/network/"], ["node", "network"]);

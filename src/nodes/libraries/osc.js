// Load OSC-JS library for both browser and server
LiteGraph.LibraryManager.registerLibrary({
    key: "osc-js",
    defaultExport: true,
    version: "2.4.1",
    globalObject: "OSC",
    browser: { remote: "https://cdn.jsdelivr.net/npm/osc-js@2.4.1/lib/osc.min.js" },
    server: { npm: "osc-js" }
});
// deferred LiteGraph.LibraryManager.loadLibrary("osc-js-browser");

class OSCClientNode {
    static title = "WS Client for OSCBridge";
    static desc = "Send and receive OSC messages via and WebSocket Bridge.";

    constructor() {
        this.libraries = ["osc-js"];
        this.size = [80, 40];
        this.properties = {
            host: "127.0.0.1", // Default WebSocket server for OSC
            port: 8002,
            address: "/example",
            auto_send_input: false,
        };

        this.addInput("SEND", LiteGraph.ACTION);
        this.addInput("address", "string", { param_bind: true });
        this.addInput("message", "array", { param_bind: true });

        this.addOutput("onReceived", LiteGraph.EVENT);
        this.addOutput("dataRec", "object");

        this.addProperty("message", [], "array");

        this._osc = null;
        this._socket = null;
        this._last_sent_data = null;
        this._last_received_data = null;
    }

    onPropertyChanged(name, _value) {
        if (name === "host" || name === "port") {
            this.connectOSC();
        }
    }

    onExecute() {
        if (!this._osc && this.properties.host) {
            this.connectOSC();
        }
    }

    connectOSC() {
        if (!LiteGraph.isBrowser()) return;

        if (!this._osc) {
            this._osc = new OSC(); //new OSC(new OSC.WebsocketClientPlugin({host: this.properties.host, port: this.properties.port}));
        }

        if (this._socket) {
            this._socket.close();
        }

        this.boxcolor = "#00F";

        this._osc.open({host: this.properties.host, port: this.properties.port});

        this._osc.on("open", () => {
            console.log("Connected to OSC WebSocket server");
            this.boxcolor = "#0F0";
        });

        this._osc.on("message", (msg) => {
            console.log("Received OSC message:", msg);
            this._last_received_data = msg;
            this.setOutputData(1, msg);
            this.triggerSlot(0, msg);
        });

        this._osc.on("close", () => {
            console.log("Disconnected from OSC server");
            this.boxcolor = "#FF0";
        });

        this._osc.on("error", (error) => {
            console.error("OSC WebSocket error:", error);
            this.boxcolor = "#F00";
        });
    }

    onAction(action, param) {
        if (!this._osc) return;

        if (action === "SEND") {
            const address = this.getInputOrProperty("address");
            const message = this.getInputOrProperty("message") || [];

            let oscMessage = null;
            if(Array.isArray(message)){
                oscMessage = new OSC.Message(address, ...message);
            }else{
                oscMessage = new OSC.Message(address, message);
            }
            this._osc.send(oscMessage);

            console.log("Sent OSC message:", oscMessage);
        }
    }
}

// Register for LiteGraph
LiteGraph.registerNodeType("browser/network/osc_client", OSCClientNode);

// what these node types need from the runtime (see LiteGraph.declareCapabilities)
LiteGraph.declareCapabilities("browser/", ["browser", "network"]);

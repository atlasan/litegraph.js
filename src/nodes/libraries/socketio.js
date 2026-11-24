// built-in pack: node types registered below belong to "litegraph/socketio" (see LiteGraph.packs)
LiteGraph.setupPlatform();
LiteGraph.packs.open({ id: "litegraph/socketio", version: LiteGraph.VERSION, title: "Socket.IO", description: "Socket.IO client for the browser and Node.js.", builtin: true });

// src/nodes/libraries/socket.io.js

// -- client&server libraries --
LiteGraph.LibraryManager.registerLibrary({
    key: "io",
    defaultExport: "io",
    version: "4.6.1",
    globalObject: "io",
    browser: { /*local: "/libs/socket.io.js",*/ remote: "https://cdn.jsdelivr.net/npm/socket.io-client@4.6.1/dist/socket.io.min.js" },
    server: { npm: ["socket.io-client"], /*remote: "https://cdn.jsdelivr.net/npm/socket.io-client@4.6.1/dist/socket.io.min.js"*/ }
});
// deferred LiteGraph.LibraryManager.loadLibrary("io");

class LGSocketIO {
    static title = "Socket.IO Client";
    static desc = "Connect to a Socket.IO server to send and receive data";

    constructor() {
        this.libraries = ["io"];
        this.size = [60, 20];
        this.properties = {
            url: "http://127.0.0.1:3030",
            room: null,
            auto_send_input: false,
            only_send_changes: true,
            runOnServerToo: false
        };
        this.addProperty("eventOut", "message", "string");
        this.addProperty("dataOut", "", "string");

        this.addInput("SEND", LiteGraph.ACTION);
        this.addInput("eventOut", "string", { param_bind: true });
        this.addInput("dataOut", "string", { param_bind: true });
        this.addOutput("onReceived", LiteGraph.EVENT);
        this.addOutput("eventIn", 0);
        this.addOutput("dataIn", 0);

        this._io_client = null;
        this._socket = null;
        this._last_sent_data = [];
        this._last_received_data = [];
        // TODO check library io is available
    }

    onPropertyChanged(name, _value) {
        if (name === "url") {
            this.connectSocket();
        }
    }

    onExecute() {
        if (!this._socket && this.properties.url){ // TODO && !this.state == "connecting") {
            this.connectSocket();
        }
    }

    connectSocket() {
        // if(typeof(io)=="undefined"){
        //     return;
        // }
        if(!this._io_client){
            if(typeof(io)=="function"){
                this._io_client = io;
                console.debug("Got socketio lib from io",this._io_client);
            // }else if(typeof(ioclient)=="function"){
            }else{
                this._io_client = LiteGraph.getGlobalVariable("io");
                console.debug("Got socketio lib from global",this._io_client);
            }
            // else if(typeof(io)=="object" && typeof(io.Socket)=="function"){
            //     this._io_client = io.Socket; // should verify this, seems not working
            // }
            // else{
            //     return;
            // }
        }
        if(typeof(this._io_client)=="undefined"){
            console.debug("SocketIo lib not ready");
            return;
        }
        if(!LiteGraph.isBrowser()){
            // STOP
            return;
        }
        try{
            if (this._socket) {
                this._socket.disconnect();
            }

            this.boxcolor = "#00F";

            this._socket = this._io_client(this.properties.url);
            
            this._socket.on("connect", () => {
                console.log("Connected to Socket.IO server");
                if (this.properties.room) {
                    this._socket.emit("join", this.properties.room);
                }
                this.boxcolor = "#0F0";

                const engine = this._socket.io.engine;
                console.log(engine.transport.name); // in most cases, prints "polling"

                engine.once("upgrade", () => {
                    // called when the transport is upgraded (i.e. from HTTP long-polling to WebSocket)
                    console.log("SocketIO","upgrade",engine.transport.name); // in most cases, prints "websocket"
                });

                engine.on("packet", ({ type, data }) => {
                    // console.debug("SockeIO", "packet", "called for each packet received", arguments);
                });

                engine.on("packetCreate", ({ type, data }) => {
                    // console.debug("SockeIO", "packetCreate", "called for each packet sent", arguments);
                });

                engine.on("drain", () => {
                    // console.debug("SockeIO", "drain", "called when the write buffer is drained", arguments);
                });

                engine.on("close", (reason) => {
                    // console.debug("SockeIO", "close", "called when the underlying connection is closed", arguments);
                });
            });

            this._socket.onAny((event, ...args) => {
                let data = args?.length == 1 ? args[0] : args;
                if(typeof(data)=="object"&&Object.keys(data).length==1&&typeof(data["0"])!=="undefined"){
                    data = data["0"];
                }
                this.setOutputData("eventIn", event);
                this.setOutputData("dataIn", data);
                this.triggerSlot("onReceived", {"event": event, "data": data});
            });

            this._socket.on("reconnect_attempt", () => {
                console.log("reconnect_attempt to Socket.IO server");
                this.boxcolor = "#07F";
            });

            this._socket.on("reconnect", () => {
                console.log("reconnect to Socket.IO server");
                this.boxcolor = "#0F3";
            });
            
            this._socket.on("disconnect", () => {
                console.log("Disconnected from Socket.IO server");
                this.boxcolor = "#FF0";
            });

            this._socket.on("connect_error", (error) => {
                if (this._socket.active) {
                  // temporary failure, the socket will automatically try to reconnect
                  console.log("Temporary failure Socket.IO connect, retry");
                  this.boxcolor = "#FF0";
                } else {
                  // the connection was denied by the server
                  // in that case, `socket.connect()` must be manually called in order to reconnect
                  console.log("Error on Socket.IO connect", error.message);
                  this.boxcolor = "#F00";
                }
            });

        }catch(e){
            console?.warn("network/socketio", "error", e);
            this.boxcolor = "#F00";
        }
    }

    onAction(action, param) {
        if (!this._socket && this.properties.url){
            this.connectSocket();
        }
        if (!this._socket){
            return;
        }
        if (action === "msg_w_data") {
            this._socket.emit("data", param);
        }
        if (action === "SEND") {
            this._socket.emit(this.getInputOrProperty("eventOut"), this.getInputOrProperty("dataOut"));
        }
    }
}

LiteGraph.registerNodeType("network/socketio", LGSocketIO);
LiteGraph.registerNodeReplacement({ old_type: "network/SocketIO", new_type: "network/socketio", auto: true, reason: "renamed in the catalog cleanup (Wave 4e)" });

// what these node types need from the runtime (see LiteGraph.declareCapabilities)
LiteGraph.declareCapabilities("network/", ["network"]);

LiteGraph.packs.close("litegraph/socketio");

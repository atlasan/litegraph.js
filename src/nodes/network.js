
function LGWebSocket() {

        this.size = [60, 20];
        // Fixed inputs and outputs
        this.addInput("msg_w_data", LiteGraph.ACTION, { nameLocked: true, removable: false });
        this.addInput("DATA_1", 0, { nameLocked: false, removable: true });
        this.addInput("EV_1", LiteGraph.ACTION, { nameLocked: false, removable: true });
        this.addOutput("onReceived", LiteGraph.EVENT);
        this.addOutput("dataRec", 0, { nameLocked: true, removable: false });
        this.addOutput("DATA_1", 0, { nameLocked: false, removable: true });
        this.addOutput("EV_1", LiteGraph.EVENT, { nameLocked: false, removable: true });

        // Configurable properties
        this.properties = {
            url: "ws://127.0.0.1:8010",
            room: null,
            auto_send_input: false,
            only_send_changes: true,
            runOnServerToo: false,
            auto_reconnect: true, // New property: attempt reconnection if disconnected
            reconnectInterval: 3000 // milliseconds before trying to reconnect
        };

        this._ws = null;
        this._last_sent_data = [];
        this._last_received_data = [];
        this._hasWarned = false; // To warn only once in server mode
    }

LGWebSocket.prototype.onPropertyChanged = function(name, _value) {
        if (name === "url" && this.properties.url !== _value) {
            this.connectSocket();
        }
        // For any property change, you could consider reconnecting if needed.
    }

LGWebSocket.prototype.onExecute = function() {
        // If no websocket exists or if it is closed, attempt to connect.
        if (!this._ws || this._ws.readyState === WebSocket.CLOSED) {
            console.debug("WSClient try to connect", this._ws?.readyState, this._ws);
            this.connectSocket();
        }

        // Only proceed if the socket is open.
        if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
            return;
        }

        const room = this.properties.room;
        const only_changes = this.properties.only_send_changes;

        if (this.properties.auto_send_input) {
            // Loop through dynamic data inputs (starting at index 1)
            for (let i = 1; i < this.inputs.length; ++i) {
                const data = this.getInputData(i);
                if (data == null) continue;

                let payload;
                try {
                    payload = {
                        type: 0,
                        channel: i,
                        data: data,
                    };
                    if (room) payload.room = room;
                    payload = JSON.stringify(payload);
                } catch (err) {
                    console.error("Error stringifying data:", err);
                    continue;
                }

                if (only_changes && this._last_sent_data[i] === payload) {
                    continue;
                }
                this._last_sent_data[i] = payload;
                try {
                    this._ws.send(payload);
                    console.log("WS sent by execute:", i, payload);
                } catch (err) {
                    console.error("Error sending data:", err);
                }
            }
        }

        // Reset box color if needed.
        if (this.boxcolor === "#AFA") {
            this.boxcolor = "#6C6";
        }
    }

LGWebSocket.prototype.connectSocket = function() {
        // In Node.js, only allow connection if runOnServerToo is true.
        if (typeof process !== "undefined" && process.versions && process.versions.node) {
            if (!this.properties.runOnServerToo) {
                if (!this._hasWarned) {
                    console.warn("WsClient: not allowed to run on the server. Set 'runOnServerToo' to true to enable.");
                    this._hasWarned = true;
                }
                return;
            }
        }

        // If already connected, close existing connection.
        if (this._ws) {
            this._ws.close();
        }

        // Ensure a proper WebSocket constructor is available.
        let WSConstructor = typeof WebSocket !== "undefined" ? WebSocket : null;
        if (!WSConstructor && typeof require !== "undefined") {
            try {
                WSConstructor = require("ws");
            } catch (err) {
                console.error("WebSocket module not found:", err);
                return;
            }
        }
        if (!WSConstructor) {
            console.error("WebSocket is not available in this environment.");
            return;
        }

        // Ensure URL has ws:// or wss:// prefix.
        const url = this.properties.url.startsWith("ws") ? this.properties.url : "ws://" + this.properties.url;
        try {
            this._ws = new WSConstructor(url);
        } catch (err) {
            console.error("Error creating WebSocket:", err);
            return;
        }

        this._ws.onopen = () => {
            console.log("WS ready");
            this.boxcolor = "#6C6";
        };

        this._ws.onmessage = (e) => {
            this.boxcolor = "#AFA";
            console.info("WS on message:", e.data);
            let data = e.data;

            if (typeof data === "string") {
                try {
                    data = JSON.parse(data);
                } catch (err) {
                    console.warn("Received non-JSON data:", data);
                }
            } else if (data instanceof ArrayBuffer) {
                console.log("Received binary data");
                const byteArray = new Uint8Array(data);
                const binaryString = new TextDecoder("utf-8").decode(byteArray);
                console.log("Binary data as string:", binaryString);
                // Optionally, you can also convert binary data to Base64.
                data = binaryString;
            }

            if (data.room && data.room !== this.properties.room) {
                console.debug("WS: received message for different room");
                return;
            }

            const channelX = data.channel !== undefined ? data.channel : 1;
            const dataDefined = typeof data.data !== "undefined";
            let dataX = dataDefined ? data.data : data;
            let slotX = data && data.action ? data.action : 0;

            // Handle type 1 messages (intended to create temporary LiteGraph objects)
            if (data && data.type === 1) {
                if (data.data && data.data.object_class && LiteGraph[data.data.object_class]) {
                    try {
                        const obj = new LiteGraph[data.data.object_class](data.data);
                        console.debug("WS created temporary LG object:", obj);
                        dataX = obj;
                    } catch (err) {
                        console.error("WS Error creating object:", err);
                    }
                } else if (dataDefined) {
                    console.debug("WS type1 received data:", data.data);
                    dataX = data.data;
                } else {
                    console.debug("WS type1 received UNKNOWN data:", data);
                }
            } else {
                if (dataDefined) {
                    console.debug("WS received channel data:", data.channel, data.data);
                } else {
                    console.debug("WS received UNKNOWN data:", data);
                }
            }
            this._last_received_data[channelX] = dataX;
            console.debug("WS updating data and triggers:", "channel", channelX, "data:", dataX, "slot:", slotX);
            // Set default output (dataRec)
            this.setOutputData("dataRec", dataX);
            // Set dynamic output if defined (for channel-specific data)
            if (slotX === 0) {
                this.setOutputData("DATA_" + channelX, dataX);
            }
            // Trigger default event slot
            this.triggerSlot(0, dataX);
            // If an action is specified, trigger that slot
            if (slotX !== 0) {
                this.triggerSlot(slotX, dataX);
            }
        };

        this._ws.onerror = (err) => {
            console.error("WS connection error:", err);
            this.boxcolor = "#E88";
        };

        this._ws.onclose = () => {
            console.log("WS connection closed");
            this.boxcolor = "#000";
            // Optionally, auto-reconnect if enabled.
            if (this.properties.auto_reconnect) {
                setTimeout(() => {
                    if (!this._ws || this._ws.readyState === WebSocket.CLOSED) {
                        console.log("Attempting to reconnect WS...");
                        this.connectSocket();
                    }
                }, this.properties.reconnectInterval);
            }
        };
    }

LGWebSocket.prototype.disconnectSocket = function() {
        if (this._ws) {
            console.log("WS close connection");
            this._ws.close();
            this._ws = null;
        } else {
            console.log("WS no connection to close");
        }
    }

LGWebSocket.prototype.send = function(data) {
        if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
            return;
        }
        const msgObj = { type: 1, data: data };
        const msg = JSON.stringify(msgObj);
        try {
            this._ws.send(msg);
            console.log("WS sent:", msg);
        } catch (err) {
            console.error("Error sending data:", err);
        }
    }

LGWebSocket.prototype.onAction = function(action, param) {
        if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
            return;
        }
        const oMsg = {
            type: 1,
            action: action,
            data: param,
        };
        if (this.properties.room) oMsg.room = this.properties.room;
        const msg = JSON.stringify(oMsg);
        try {
            this._ws.send(msg);
            console.log("WS sent by Action:", oMsg, action, param);
        } catch (err) {
            console.error("Error sending data by action:", err);
        }
    }

    // Return additional dynamic input slots only if they exist beyond the fixed ones.
LGWebSocket.prototype.onGetInputs = function() {
        // Fixed inputs are: "msg_w_data", "DATA_1", "EV_1" (total 3)
        return this.inputs.length > 3 ? this.inputs.slice(3) : [];
    }

    // Return additional dynamic output slots only if they exist beyond the fixed ones.
LGWebSocket.prototype.onGetOutputs = function() {
        // Fixed outputs are: "onReceived", "dataRec", "DATA_1", "EV_1" (total 4)
        return this.outputs && this.outputs.length > 4 ? this.outputs.slice(4) : [];
    }

LGWebSocket.prototype.onRemoved = function() {
        this.disconnectSocket();
    }
}
LGWebSocket.title = "WS Client";
LGWebSocket.desc = "Connect to a WebSocket to send and receive data";

LiteGraph.registerNodeType("network/websocket", LGWebSocket);



// HTTP Request
function HTTPRequestNode() {


        this.addInput("request", LiteGraph.ACTION);
        this.addInput("url", "string");
        this.addProperty("url", "");
        this.addOutput("ready", LiteGraph.EVENT);
        this.addOutput("data", "string");
        this.addWidget("button", "Fetch", null, this.fetch.bind(this));
        this._data = null;
        this._fetching = null;
    }

HTTPRequestNode.prototype.fetch = function() {
        var url = this.getInputOrProperty("url");
        if (!url)
            return;

        this.boxcolor = "#FF0";
        var that = this;
        this._fetching = fetch(url)
            .then((resp) => {
                if (!resp.ok) {
                    this.boxcolor = "#F00";
                    that.trigger("error");
                } else {
                    this.boxcolor = "#0F0";
                    return resp.text();
                }
            })
            .then((data) => {
                that._data = data;
                that._fetching = null;
                that.trigger("ready");
            });
    }

HTTPRequestNode.prototype.onAction = function(evt) {
        if (evt == "request")
            this.fetch();
    }

HTTPRequestNode.prototype.onExecute = function() {
        this.setOutputData(1, this._data);
    }

HTTPRequestNode.prototype.onGetOutputs = function() {
        return [["error", LiteGraph.EVENT]];
    }
}
HTTPRequestNode.title = "HTTP Request";
HTTPRequestNode.desc = "Fetch data through HTTP";
LiteGraph.registerNodeType("network/httprequest", HTTPRequestNode);


// -------------- TODO TEST ---------------
function WebRTCNode() {

        this.size = [100, 60];
        this.addInput("send", LiteGraph.ACTION);
        this.addInput("data", 0);
        this.addInput("offer", "string");
        this.addInput("answer", "string");
        this.addOutput("offer", "string");
        this.addOutput("answer", "string");
        this.addOutput("received", LiteGraph.EVENT);
        this.addOutput("data", 0);
        this.properties = {
            signalingServer: "",
            stunServer: "", // stun:stun.l.google.com:19302
            turnServer: "",
            username: "",
            credential: ""
        };
        this.peerConnection = null;
        this.dataChannel = null;
        this._lastReceivedData = null;
    }

WebRTCNode.prototype.onPropertyChanged = function(name, value) {
        if (["signalingServer", "stunServer", "turnServer", "username", "credential"].includes(name)) {
            this.createPeerConnection();
        }
    }

WebRTCNode.prototype.createPeerConnection = function() {
        if (!this.properties.stunServer || (!this.properties.turnServer && (this.properties.username || this.properties.credential))) {
            console.warn("Incomplete WebRTC configuration. Ensure stunServer and (optionally) turnServer with username and credential are set.");
            return;
        }

        try {
            if (this.peerConnection) {
                this.peerConnection.close();
            }

            const iceServers = [
                { urls: this.properties.stunServer }
            ];

            if (this.properties.turnServer) {
                iceServers.push({
                    urls: this.properties.turnServer,
                    username: this.properties.username,
                    credential: this.properties.credential
                });
            }

            this.peerConnection = new RTCPeerConnection({ iceServers });

            this.peerConnection.ondatachannel = (event) => {
                this.dataChannel = event.channel;
                this.setupDataChannel();
            };

            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    console.debug("ICE candidate:", event.candidate);
                } else {
                    if (this.peerConnection.localDescription.type === "offer") {
                        this.setOutputData(0, JSON.stringify(this.peerConnection.localDescription));
                    } else {
                        this.setOutputData(1, JSON.stringify(this.peerConnection.localDescription));
                    }
                }
            };

            this.dataChannel = this.peerConnection.createDataChannel("dataChannel");
            this.setupDataChannel();

            this.peerConnection.createOffer()
                .then(offer => this.peerConnection.setLocalDescription(offer))
                .catch(error => console.error("Error creating offer:", error));
        } catch (error) {
            console.error("Error creating peer connection:", error);
        }
    }

WebRTCNode.prototype.setupDataChannel = function() {
        if (!this.dataChannel) return;

        this.dataChannel.onopen = () => {
            console.debug("Data channel open");
            this.boxcolor = "#00FF00";
        };

        this.dataChannel.onclose = () => {
            console.debug("Data channel closed");
            this.boxcolor = "#990000";
        };

        this.dataChannel.onmessage = (event) => {
            try {
                const receivedData = JSON.parse(event.data);
                this._lastReceivedData = receivedData;
                this.setOutputData(3, receivedData);
                this.triggerSlot(2, receivedData);
                console.debug("Data received:", event.data);
            } catch (error) {
                console.error("Error parsing received data:", error);
            }
        };

        this.dataChannel.onerror = (error) => {
            console.error("Data channel error:", error);
            this.boxcolor = "#FF0000";
        };
    }

WebRTCNode.prototype.onExecute = function() {
        if (!this.peerConnection) {
            this.createPeerConnection();
        }

        if (this.dataChannel && this.dataChannel.readyState === "open") {
            const data = this.getInputData(1);
            if (data != null) {
                try {
                    this.dataChannel.send(JSON.stringify(data));
                    console.debug("Data sent:", data);
                } catch (error) {
                    console.error("Error sending data:", error);
                }
            }
        }

        this.setOutputData(3, this._lastReceivedData);
    }

WebRTCNode.prototype.onAction = function(action, param) {
        if (!this.peerConnection) {
            this.createPeerConnection();
        }

        if (this.dataChannel && this.dataChannel.readyState === "open") {
            try {
                this.dataChannel.send(JSON.stringify(param));
                console.debug("Data sent by action:", param);
            } catch (error) {
                console.error("Error sending data by action:", error);
            }
        }
    }

WebRTCNode.prototype.onConnectionsChange = function(input) {
        if (input && input.type === "string") {
            if (input.name === "offer") {
                this.handleOffer(input.data);
            } else if (input.name === "answer") {
                this.handleAnswer(input.data);
            }
        }
    }

    async handleOffer(offer) {
        try {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(offer)));
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            this.setOutputData(1, JSON.stringify(answer));
        } catch (error) {
            console.error("Error handling offer:", error);
        }
    }

    async handleAnswer(answer) {
        try {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(answer)));
        } catch (error) {
            console.error("Error handling answer:", error);
        }
    }

WebRTCNode.prototype.onRemoved = function() {
        if (this.peerConnection) {
            this.peerConnection.close();
        }
    }

    // onGetInputs() {
    //     return [["send", LiteGraph.ACTION], ["data", 0], ["offer", "string"], ["answer", "string"]];
    // }

    // onGetOutputs() {
    //     return [["offer", "string"], ["answer", "string"], ["received", LiteGraph.EVENT], ["data", 0]];
    // }
}
WebRTCNode.title = "WebRTC";
WebRTCNode.desc = "Send and receive data through WebRTC";
LiteGraph.registerNodeType("network/webrtc", WebRTCNode);



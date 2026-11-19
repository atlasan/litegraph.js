// src/nodes/device.js
import { LiteGraph } from "../litegraph.js";

class MobileOrientationNode {
    constructor() {
        this.addOutput("alpha", "number");
        this.addOutput("beta", "number");
        this.addOutput("gamma", "number");

        this.properties = { enabled: true };
        this.output = { alpha: 0, beta: 0, gamma: 0 }; // normalized value
        this.last = { alpha: 0, beta: 0, gamma: 0 }; // last raw value
        this.offset = { alpha: 0, beta: 0, gamma: 0 }; // Calibration offsets
        this.orientationListener = null;

        // this.addWidget("toggle", "Enabled", this.properties.enabled, "enabled");
        // this.addWidget("button", "Calibrate", null, () => this.calibrate());
    }

    // onGetInputs() {
    //     return [
    //         ["start", LiteGraph.ACTION],
    //         ["stop", LiteGraph.ACTION],
    //         ["calibrate", LiteGraph.ACTION],
    //     ];
    // }

    onAdded() {
        this.requestPermission();
    }

    onRemoved() {
        this.stopListening();
    }

    onStart() {
        if (this.properties.enabled) {
            this.startListening();
        }
    }

    onStop() {
        this.stopListening();
    }

    onPropertyChanged(name, value) {
        if (name === "enabled") {
            this.properties.enabled = value;
            value ? this.startListening() : this.stopListening();
        }
    }

    requestPermission() {
        if (
            typeof DeviceOrientationEvent !== "undefined" &&
            typeof DeviceOrientationEvent.requestPermission === "function"
        ) {
            DeviceOrientationEvent.requestPermission()
                .then((response) => {
                    if (response === "granted") {
                        this.startListening();
                    } else {
                        console.warn("DeviceOrientation permission denied");
                    }
                })
                .catch(console.error);
        } else {
            this.startListening();
        }
    }

    startListening() {
        if (!window.DeviceOrientationEvent) {
            console.warn("Device orientation is not supported.");
            return;
        }

        if (!this.orientationListener) {
            this.orientationListener = (event) => {
                if (!this.properties.enabled) return;

                // Apply calibration offsets and normalize values
                this.last = {alpha: event.alpha, beta: event.beta, gamma: event.gamma};
                this.output.alpha = this.normalizeDegrees(event.alpha - this.offset.alpha);
                this.output.beta = this.normalizeDegrees(event.beta - this.offset.beta);
                this.output.gamma = this.normalizeDegrees(event.gamma - this.offset.gamma);
            };
            window.addEventListener("deviceorientation", this.orientationListener);
        }
    }

    stopListening() {
        if (this.orientationListener) {
            window.removeEventListener("deviceorientation", this.orientationListener);
            this.orientationListener = null;
        }
    }

    calibrate() {
        // Set current orientation as new zero
        this.offset.alpha = this.last.alpha; // this.output.alpha;
        this.offset.beta = this.last.beta; // this.output.beta;
        this.offset.gamma = this.last.gamma; // this.output.gamma;
        // this.properties.calibrated = true;
    }

    normalizeDegrees(value) {
        if (value === null || isNaN(value)) return 0;
        return ((value + 180) % 360) - 180; // Keep within [-180, 180]
    }

    onExecute() {
        this.setOutputData(0, this.output.alpha);
        this.setOutputData(1, this.output.beta);
        this.setOutputData(2, this.output.gamma);
    }

    onDrawBackground(ctx) {
        if (!this.flags.collapsed) {
            ctx.fillStyle = "rgba(0,0,0,0.1)";
            ctx.fillRect(0, 0, this.size[0], this.size[1]);

            ctx.fillStyle = this.properties.enabled ? "#0F0" : "#F00";
            ctx.font = "12px Arial";
            ctx.fillText(
                `α: ${this.output.alpha.toFixed(1)}, β: ${this.output.beta.toFixed(1)}, γ: ${this.output.gamma.toFixed(1)}`,
                10,
                this.size[1] - 10
            );

            // Draw a small rotation indicator
            ctx.strokeStyle = "#FFF";
            ctx.beginPath();
            ctx.arc(this.size[0] / 2, this.size[1] / 2, 10, 0, Math.PI * 2);
            ctx.moveTo(this.size[0] / 2, this.size[1] / 2);
            ctx.lineTo(
                this.size[0] / 2 + Math.cos((this.output.alpha * Math.PI) / 180) * 10,
                this.size[1] / 2 + Math.sin((this.output.alpha * Math.PI) / 180) * 10
            );
            ctx.stroke();
        }
    }
}

LiteGraph.registerNodeType("Device/MobileOrientation", MobileOrientationNode);



class DeviceInfoNode {
    constructor() {
        this.addOutput("info", "DeviceInfo|object");
        this.output = this.getDeviceInfo();
    }

    onAdded(){
        this.setOutputData(0, this.output);
    }

    getDeviceInfo() {
        const userAgent = navigator.userAgent;
        const platform = navigator.platform;
        return {
            // userAgent,
            platform,
            browser: this.getBrowser(userAgent),
            mobile: /Mobi|Android/i.test(userAgent),
        };
    }

    getBrowser(ua) {
        if (/chrome|chromium|crios/i.test(ua)) return "Chrome";
        if (/firefox|fxios/i.test(ua)) return "Firefox";
        if (/safari/i.test(ua) && !/chrome/i.test(ua)) return "Safari";
        if (/edg/i.test(ua)) return "Edge";
        if (/opr|opera/i.test(ua)) return "Opera";
        return "Unknown";
    }

    onExecute() {
        this.setOutputData(0, this.output);
    }
}

LiteGraph.registerNodeType("Device/BrowserInfo", DeviceInfoNode);


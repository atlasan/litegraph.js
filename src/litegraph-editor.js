import { LGraphCanvas } from "./lgraphcanvas.js";
import { LGraph } from "./lgraph.js";
import { LiteGraph } from "./litegraph.js";

// Creates an interface to access extra features from a graph (like play, stop, live, etc)
export class Editor {

    constructor(container_id, options = {}) {

        const root = this.root = document.createElement("div");
        root.className = "litegraph litegraph-editor";
        root.innerHTML = `
        <div class="header">
            <div class="tools tools-left"></div>
            <div class="tools tools-right"></div>
        </div>
        <div class="content">
            <div class="editor-area">
                <canvas class="graphcanvas" width="1000" height="500" tabindex="10"></canvas>
            </div>
        </div>
        <div class="footer">
            <div class="tools tools-left"></div>
            <div class="tools tools-right"></div>
        </div>`;

        this.tools = root.querySelector(".tools");
        this.content = root.querySelector(".content");
        this.footer = root.querySelector(".footer");

        // keep settings and user key bindings across reloads (embedders may opt out)
        if (!options.skip_persistence) LiteGraph.persistPlatformState?.();

        const canvas = this.canvas = root.querySelector(".graphcanvas");
        const graph = this.graph = new LGraph();
        const graphcanvas = this.graphcanvas = new LGraphCanvas(canvas, graph);

        graphcanvas.background_image = "imgs/grid.png";
        graph.onAfterExecute = () => {
            graphcanvas.draw(true);
        };

        graphcanvas.onDropItem = this.onDropItem.bind(this);

        // a loaded document with missing node types: show what is missing and what can replace it
        graph.events.on("missing-nodes", (event) => {
            if (event.detail.reason !== "load") return; // not again on undo or redo
            const id = "litegraph.nodes.showMissing";
            if (LiteGraph.settings?.get("LiteGraph.Nodes.ShowMissingOnLoad") === false || !LiteGraph.commands?.get(id)) return;
            LiteGraph.commands.execute(id, LiteGraph.commands.contextFor(graphcanvas));
        });

        // add stuff
        // this.addToolsButton("loadsession_button","Load","imgs/icon-load.png", this.onLoadButton.bind(this), ".tools-left" );
        // this.addToolsButton("savesession_button","Save","imgs/icon-save.png", this.onSaveButton.bind(this), ".tools-left" );
        this.addLoadCounter();
        this.addToolsButton(
            "playnode_button",
            "Play",
            "imgs/icon-play.png",
            this.onPlayButton.bind(this),
            ".tools-right",
        );
        this.addToolsButton(
            "playstepnode_button",
            "Step",
            "imgs/icon-playstep.png",
            this.onPlayStepButton.bind(this),
            ".tools-right",
        );

        if (!options.skip_livemode) {
            this.addToolsButton(
                "livemode_button",
                "Live",
                "imgs/icon-record.png",
                this.onLiveButton.bind(this),
                ".tools-right",
            );
        }
        if (!options.skip_maximize) {
            this.addToolsButton(
                "maximize_button",
                "",
                "imgs/icon-maximize.png",
                this.onFullscreenButton.bind(this),
                ".tools-right",
            );
        }
        if (options.miniwindow) {
            this.addMiniWindow(300, 200);
        }

        // append to DOM
        const parent = document.getElementById(container_id);
        if (parent) {
            parent?.appendChild(root);
        } else {
            throw new Error("Editor has no parentElement to bind to");
        }

        graph.onPlayEvent = () => {
            const button = this.root.querySelector("#playnode_button");
            button.innerHTML = `<img src="imgs/icon-stop.png"/> Stop`;
        };

        graph.onStopEvent = () => {
            const button = this.root.querySelector("#playnode_button");
            button.innerHTML = `<img src="imgs/icon-play.png"/> Play`;
        };

        // modified marker and draft autosave (settings LiteGraph.Editor.Autosave / AutosaveDelay)
        this.setupModifiedMarker();
        if (!options.skip_autosave) this.setupAutosave(options.draft_storage);

        graphcanvas.resize();
    }

    /** Shows "• modified" in the header and prefixes the page title while the document is modified. */
    setupModifiedMarker() {
        const marker = this.modified_marker = document.createElement("span");
        marker.className = "modified-marker";
        marker.title = "Modified since it was loaded or saved";
        marker.style.cssText = "position:absolute;right:8px;bottom:4px;z-index:5;font:12px Arial;color:#fc6;pointer-events:none;display:none";
        marker.textContent = "• modified";
        this.root.querySelector(".content")?.appendChild(marker);
        const baseTitle = typeof document !== "undefined" ? document.title.replace(/^• /, "") : "";
        this.graph.events.on("modified-changed", (event) => {
            marker.style.display = event.detail.modified ? "" : "none";
            if (typeof document !== "undefined") document.title = (event.detail.modified ? "• " : "") + baseTitle;
        });
    }

    /**
     * Keeps a draft of the modified document and, when one is left from an earlier session,
     * offers to restore it (never restores silently).
     */
    setupAutosave(storage) {
        const settings = LiteGraph.settings;
        if (settings && !settings.has("LiteGraph.Editor.Autosave")) {
            settings.define({ id: "LiteGraph.Editor.Autosave", name: "Keep a draft of the modified document and offer it after a reload", default: true });
            settings.define({ id: "LiteGraph.Editor.AutosaveDelay", name: "Draft autosave delay (ms)", default: 2000 });
        }
        if (settings && settings.get("LiteGraph.Editor.Autosave") === false) return;
        this.autosave = new DraftAutosave(this.graph, { storage, delay: settings?.get("LiteGraph.Editor.AutosaveDelay") ?? 2000 });
        const draft = this.autosave.load();
        this.autosave.start();
        if (draft) this.offerDraftRestore(draft);
    }

    /** A small bar with Restore / Discard for a draft left from an earlier session. */
    offerDraftRestore(draft) {
        const bar = this.draft_bar = document.createElement("div");
        bar.className = "draft-restore";
        bar.style.cssText = "position:absolute;top:44px;left:50%;transform:translateX(-50%);z-index:10;background:#333;color:#ddd;border:1px solid #666;border-radius:4px;padding:6px 10px;font:13px Arial;white-space:nowrap;display:flex;align-items:center;gap:6px";
        const when = new Date(draft.time).toLocaleString();
        const count = Array.isArray(draft.doc?.nodes) ? draft.doc.nodes.length : 0;
        bar.innerHTML = `<span>Unsaved draft from ${when} (${count} node${count === 1 ? "" : "s"}).</span> `;
        const button = (label, onClick) => {
            const element = document.createElement("button");
            element.className = "btn";
            element.textContent = label;
            element.addEventListener("click", () => { onClick(); bar.remove(); this.draft_bar = null; });
            bar.appendChild(element);
            return element;
        };
        button("Restore", () => this.restoreDraft(draft));
        button("Discard", () => this.autosave?.clear());
        this.root.appendChild(bar);
        return bar;
    }

    /** Loads a draft into the graph; the document stays modified until it is saved. */
    restoreDraft(draft) {
        this.graph.configure(draft.doc);
        this.graph.markModified();
        this.autosave?.save(true);
    }

    addLoadCounter() {
        const meter = document.createElement("div");
        meter.className = "headerpanel loadmeter toolbar-widget";
        meter.innerHTML = `
            <div class="cpuload">
                <strong>CPU</strong> 
                <div class="bgload">
                    <div class="fgload"></div>
                </div>
            </div>
            <div class="gpuload">
                <strong>GFX</strong> 
                <div class="bgload">
                    <div class="fgload"></div>
                </div>
            </div>`;

        this.root.querySelector(".header .tools-left").appendChild(meter);
        var self = this;

        setInterval(() => {
            meter.querySelector(".cpuload .fgload").style.width =
                `${2 * self.graph.execution_time * 90}px`;
            if (self.graph.status == LGraph.STATUS_RUNNING) {
                meter.querySelector(".gpuload .fgload").style.width =
                    `${self.graphcanvas.render_time * 10 * 90}px`;
            } else {
                meter.querySelector(".gpuload .fgload").style.width = `${4}px`;
            }
        }, 200);
    }

    addToolsButton(id, name, icon_url, callback, container = ".tools") {
        const button = this.createButton(name, icon_url, callback);
        button.id = id;
        this.root.querySelector(container).appendChild(button);
    }

    createButton(name, icon_url, callback) {
        const button = document.createElement("button");
        if (icon_url) {
            button.innerHTML = `<img src="${icon_url}"/> `;
        }
        button.classList.add("btn");
        button.innerHTML += name;
        if(callback)
            button.addEventListener("click", callback );
        return button;
    }

    onLoadButton() {
        var panel = this.graphcanvas.createPanel("Load session",{closable: true});

        // @TODO

        this.root.appendChild(panel);
    }

    onSaveButton() {}

    onPlayButton() {
        var graph = this.graph;
        if (graph.status == LGraph.STATUS_STOPPED) {
            graph.start();
        } else {
            graph.stop();
        }
    }

    onPlayStepButton() {
        var graph = this.graph;
        graph.runStep(1);
        this.graphcanvas.draw(true, true);
    }

    onLiveButton() {
        var is_live_mode = !this.graphcanvas.live_mode;
        this.graphcanvas.switchLiveMode(true);
        this.graphcanvas.draw();
        var button = this.root.querySelector("#livemode_button");
        button.innerHTML = !is_live_mode
            ? `<img src="imgs/icon-record.png"/> Live`
            : `<img src="imgs/icon-gear.png"/> Edit`;
    }

    onDropItem(e) {
        var that = this;
        if(!e.dataTransfer){
            LiteGraph.log_warn("LGEditor","onDropItem","no dataTransfer on event",e,this);
            return;
        }
        LiteGraph.log_info("LGEditor","onDropItem","processing dataTransfer",e.dataTransfer);
        for(var i = 0; i < e.dataTransfer.files.length; ++i) {
            var file = e.dataTransfer.files[i];
            var ext = LGraphCanvas.getFileExtension(file.name);
            var reader = new FileReader();
            if(ext == "json") {
                reader.onload = (event) => {
                    var data = JSON.parse( event.target.result );
                    that.graph.configure(data);
                };
                reader.readAsText(file);
            }
        }
    }

    goFullscreen() {
        if (this.root.requestFullscreen) {
            this.root.requestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        } else if (this.root.mozRequestFullscreen) {
            this.root.requestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        } else if (this.root.webkitRequestFullscreen) {
            this.root.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        } else {
            throw new Error("Fullscreen not supported");
        }

        var self = this;
        setTimeout(() => {
            self.graphcanvas.resize();
        }, 100);
    }

    onFullscreenButton() {
        if(this.isFullscreen()) {
            this.exitFullscreen();
        } else {
            this.goFullscreen();
        }
    }

    addMiniWindow(w, h) {
        var miniwindow = document.createElement("div");
        miniwindow.className = "litegraph miniwindow";
        miniwindow.innerHTML =
            `<canvas class="graphcanvas" width="${w}" height="${h}" tabindex="10"></canvas>`;
        var canvas = miniwindow.querySelector("canvas");
        var that = this;

        var graphcanvas = new LGraphCanvas( canvas, this.graph );
        graphcanvas.show_info = false;
        graphcanvas.background_image = "imgs/grid.png";
        graphcanvas.scale = 0.25;
        graphcanvas.allow_dragnodes = false;
        graphcanvas.allow_interaction = false;
        graphcanvas.render_shadows = false;
        graphcanvas.max_zoom = 0.25;
        this.miniwindow_graphcanvas = graphcanvas;
        graphcanvas.onClear = () => {
            graphcanvas.scale = 0.25;
            graphcanvas.allow_dragnodes = false;
            graphcanvas.allow_interaction = false;
        };
        graphcanvas.onRenderBackground = function(canvas, ctx) {
            ctx.strokeStyle = "#567";
            var tl = that.graphcanvas.convertOffsetToCanvas([0, 0]);
            var br = that.graphcanvas.convertOffsetToCanvas([
                that.graphcanvas.cssWidth,
                that.graphcanvas.cssHeight,
            ]);
            tl = this.convertCanvasToOffset(tl);
            br = this.convertCanvasToOffset(br);
            ctx.lineWidth = 1;
            ctx.strokeRect(
                Math.floor(tl[0]) + 0.5,
                Math.floor(tl[1]) + 0.5,
                Math.floor(br[0] - tl[0]),
                Math.floor(br[1] - tl[1]),
            );
        };

        miniwindow.style.position = "absolute";
        miniwindow.style.top = "4px";
        miniwindow.style.right = "4px";

        var close_button = document.createElement("div");
        close_button.className = "corner-button";
        close_button.innerHTML = "&#10060;";
        close_button.addEventListener("click", (_event) => {
            graphcanvas.dispose(); // stops its render loop and unbinds its listeners
            miniwindow.parentNode.removeChild(miniwindow);
        });
        miniwindow.appendChild(close_button);

        this.root.querySelector(".content").appendChild(miniwindow);
    }

    // removeMultiView() {
    //     if (this.graphcanvas2) {
    //         this.graphcanvas2.setGraph(null, true);
    //         this.graphcanvas2.viewport = null;
    //         this.graphcanvas2 = null;

    //         this.graphcanvas.viewport = [0,0,this.graphcanvas.cssWidth,this.graphcanvas.cssHeight];
    //         this.graphcanvas.resize();
    //     }
    // }

    toggleMultiview() {
        var canvas = this.canvas;
        let graphcanvas;

        // toggle test
        if (this.graphcanvas2) {
            // both canvases share one element: dispose the second (render loop + listeners),
            // then hand the element back to the main canvas
            this.graphcanvas2.dispose();
            this.graphcanvas2 = null;
            canvas.data = this.graphcanvas;

            // this.graphcanvas.unbindEvents();
            // this.graphcanvas.setGraph(null, false);
            // this.graphcanvas.viewport = null;
            // this.graphcanvas = null;
            // graphcanvas = new LGraphCanvas( canvas, this.graph );
            // graphcanvas.background_image = "imgs/grid.png";
            // this.graphcanvas = graphcanvas;
            // window.graphcanvas = this.graphcanvas;

            this.graphcanvas.viewport = [0,0,this.graphcanvas.cssWidth,this.graphcanvas.cssHeight];
            this.graphcanvas.setDirty(true,true);

            return;
        }

        this.graphcanvas.ctx.fillStyle = "black";
        const cssW = this.graphcanvas.cssWidth, cssH = this.graphcanvas.cssHeight;
        this.graphcanvas.ctx.fillRect(0,0,canvas.width,canvas.height); // backing-store pixels, identity transform
        this.graphcanvas.viewport = [0,0,cssW*0.5-2,cssH];
        // this.graphcanvas.resize();
        this.graphcanvas.setDirty(true,true);

        graphcanvas = new LGraphCanvas( canvas, this.graph );
        graphcanvas.background_image = "imgs/grid.png";
        this.graphcanvas2 = graphcanvas;
        this.graphcanvas2.viewport = [cssW*0.5,0,cssW*0.5,cssH];
        // this.graphcanvas2.resize();
        this.graphcanvas2.setDirty(true,true);
    }

    isFullscreen() {
        return(
            document.fullscreenElement ||
            document.mozRequestFullscreen ||
            document.webkitRequestFullscreen ||
            false
        );
    }

    exitFullscreen() {
        if(document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullscreen) {
            document.mozCancelFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
}

/**
 * Draft autosave for an editor document: after each recorded change (debounced) the modified
 * document is written to a storage (default `localStorage`, key "litegraph.editor.draft");
 * marking the document saved removes the draft.
 */
export class DraftAutosave {

    static KEY = "litegraph.editor.draft";

    /**
     * @param {object} graph
     * @param {{storage?: {getItem: Function, setItem: Function, removeItem: Function}, key?: string, delay?: number}} [options]
     */
    constructor(graph, { storage, key = DraftAutosave.KEY, delay = 2000 } = {}) {
        this.graph = graph;
        this.key = key;
        this.delay = delay;
        this.storage = storage ?? DraftAutosave.defaultStorage();
        this._timer = null;
        this._disposers = [];
    }

    /** localStorage when it is usable, else null (no drafts) */
    static defaultStorage() {
        try {
            return typeof localStorage !== "undefined" ? localStorage : null;
        } catch {
            return null;
        }
    }

    start() {
        const events = this.graph.events;
        this._disposers.push(events.on("graph-changed", (event) => {
            if (event.detail.kind !== "configure") this.schedule();
        }));
        this._disposers.push(events.on("modified-changed", (event) => {
            if (!event.detail.modified) this.clear();
        }));
        return this;
    }

    schedule() {
        if (this._timer) clearTimeout(this._timer);
        this._timer = setTimeout(() => { this._timer = null; this.save(); }, this.delay);
    }

    /** Writes the draft now (only a modified document unless `force`). @returns {boolean} */
    save(force = false) {
        if (!this.storage || (!force && !this.graph.isModified)) return false;
        try {
            this.storage.setItem(this.key, JSON.stringify({ time: Date.now(), id: this.graph.id, revision: this.graph.revision, doc: this.graph.serialize() }));
            return true;
        } catch (error) {
            LiteGraph.log_warn?.("editor", "draft autosave failed", error);
            return false;
        }
    }

    /** @returns {{time: number, id: string, revision: number, doc: object}|null} the stored draft */
    load() {
        try {
            const draft = JSON.parse(this.storage?.getItem(this.key) ?? "null");
            return draft && typeof draft === "object" && draft.doc && Array.isArray(draft.doc.nodes) ? draft : null;
        } catch {
            return null;
        }
    }

    clear() {
        if (this._timer) clearTimeout(this._timer);
        this._timer = null;
        try { this.storage?.removeItem(this.key); } catch { /* storage unavailable */ }
    }

    dispose() {
        if (this._timer) clearTimeout(this._timer);
        this._timer = null;
        this._disposers.splice(0).forEach((dispose) => dispose?.());
    }
}

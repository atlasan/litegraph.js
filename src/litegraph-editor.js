import { LGraphCanvas } from "./lgraphcanvas.js";
import { LGraph } from "./lgraph.js";
import { LiteGraph } from "./litegraph.js";
import { GraphLoader } from "./graphloader.js";

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
        // the Editor shows execution problems as badges by default (a stored choice wins)
        const badgeSetting = LiteGraph.settings?.getDefinition("LiteGraph.Node.ExecutionBadge");
        if (badgeSetting) badgeSetting.default = true;
        // and the pin by mode and state, and the graph status chip (extensions node_pin, graph_status)
        const pinSetting = LiteGraph.settings?.getDefinition("LiteGraph.Node.PinStyle");
        if (pinSetting) pinSetting.default = "modes";
        if (LiteGraph.settings && !LiteGraph.settings.has("LiteGraph.Canvas.GraphStatus")) {
            LiteGraph.settings.define({ id: "LiteGraph.Canvas.GraphStatus", name: "Show the graph's execution model and run state on the canvas", default: true });
        }

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

        // opened or dropped files are validated (graph.configureValidated): show what was refused or repaired
        graph.events.on("load-report", (event) => {
            const { report, ok, source } = event.detail;
            const summary = GraphLoader.formatReport(report, 3);
            graphcanvas.showExecutionNotice(ok ? `Loaded ${source} with fixes: ${summary}` : `Not loaded (${source}): ${summary}`, ok ? 6000 : 12000);
        });
        graph.events.on("graph-changed", (event) => {
            if (event.detail.reason !== "load" || event.detail.action !== "configure") return;
            const reason = graph.getExecutionBlockReason();
            if (reason) graphcanvas.showExecutionNotice(reason, 12000);
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

        // node palette (setting LiteGraph.Editor.Palette remembers whether it is open)
        if (!options.skip_palette) this.setupPalette();
        this.addToolsButton("starter_button", "Starter workflow", "imgs/icon-gear.png", () => this.showStarterGenerator(), ".tools-left");

        // modified marker and draft autosave (settings LiteGraph.Editor.Autosave / AutosaveDelay)
        this.setupModifiedMarker();
        if (!options.skip_autosave) this.setupAutosave(options.draft_storage);

        graphcanvas.resize();
    }

    /** Adds the "Nodes" button and opens the palette if it was open last time. */
    setupPalette() {
        // in the Editor the node panel follows the selection unless the user turned it off (decision P3)
        const follow = LiteGraph.settings?.getDefinition?.("LiteGraph.Panel.FollowSelection");
        if (follow) follow.default = true;
        const settings = LiteGraph.settings;
        if (settings && !settings.has("LiteGraph.Editor.Palette")) {
            settings.define({ id: "LiteGraph.Editor.Palette", name: "Show the node palette in the Editor", default: false });
        }
        this.addToolsButton("palette_button", "Nodes", "imgs/icon-gear.png", () => this.togglePalette(), ".tools-left");
        if (settings?.get("LiteGraph.Editor.Palette")) this.togglePalette(true);
    }

    /** Opens or closes the node palette; returns whether it is open. */
    togglePalette(open = !this.palette_panel) {
        if (!open) {
            this.palette_panel?.dispose();
            this.palette_panel = null;
        } else if (!this.palette_panel) {
            this.palette_panel = new NodePalettePanel(this.graphcanvas, this.content);
        }
        LiteGraph.settings?.set("LiteGraph.Editor.Palette", !!this.palette_panel);
        return !!this.palette_panel;
    }

    /** The existing editor's section/pack starter generator; previews use registry metadata only. */
    showStarterGenerator() {
        this.starter_panel?.remove();
        const panel = this.starter_panel = document.createElement("section");
        panel.className = "lg-starter-panel";
        panel.setAttribute("aria-label", "Starter workflow generator");
        const el = (tag, text, parent = panel) => {
            const item = document.createElement(tag);
            if (text) item.textContent = text;
            parent.appendChild(item);
            return item;
        };
        const heading = el("div", "");
        el("h2", "Starter workflow", heading);
        const close = el("button", "Close", heading);
        close.onclick = () => { panel.remove(); this.starter_panel = null; };
        el("p", "Explore a whole section or pack. Add an organized inventory of nodes to your graph, then build examples from it.");
        const packLabel = el("label", "Node pack ");
        const pack = el("select", "", packLabel);
        pack.setAttribute("aria-label", "Node pack");
        const categoryLabel = el("label", "Section ");
        const category = el("select", "", categoryLabel);
        category.setAttribute("aria-label", "Section");
        const option = (select, value, text) => { const opt = el("option", text, select); opt.value = value; };
        const scope = () => ({ pack: pack.value || undefined, category: category.value || undefined });
        const status = el("p", "");
        status.setAttribute("role", "status");
        const list = el("div", "");
        list.className = "lg-starter-list";
        const actions = el("div", "");
        const insert = el("button", "Add nodes to workflow", actions);
        const refresh = el("button", "Refresh packs", actions);
        const download = el("button", "Export metadata", actions);
        el("p", "Nodes are grouped by section and added below existing content. Connections are left for you to build. Stop playback before adding nodes. Types needing devices, DOM, network or other setup are listed as skipped.");
        let entries = [];
        const render = () => {
            entries = LiteGraph.palette.starterPreview(scope());
            const skipped = entries.filter((entry) => entry.reason).length;
            status.textContent = `${entries.length - skipped} available · ${skipped} skipped · ${entries.length} types in scope`;
            insert.disabled = !entries.some((entry) => !entry.reason) || this.graphcanvas.read_only;
            list.replaceChildren();
            for (const entry of entries) {
                const row = el("article", "", list);
                el("strong", entry.title, row);
                el("small", entry.type + (entry.reason ? ` — Skipped: ${entry.reason}` : ""), row);
                el("p", entry.description || `Suggested description: ${entry.suggestedDescription}`, row);
                if (entry.usage) el("small", entry.usage, row);
            }
        };
        const reload = () => {
            const previousPack = pack.value, previousCategory = category.value;
            pack.replaceChildren(); category.replaceChildren();
            option(pack, "", "All packs"); option(category, "", "All sections");
            const defs = LiteGraph.listNodeDefinitions();
            for (const id of [...new Set(defs.map((def) => def.pack?.id).filter(Boolean))].sort()) {
                option(pack, id, LiteGraph.packs.get(id)?.title ?? id);
            }
            for (const name of [...new Set(defs.map((def) => def.category).filter(Boolean))].sort()) option(category, name, name);
            if ([...pack.options].some((opt) => opt.value === previousPack)) pack.value = previousPack;
            if ([...category.options].some((opt) => opt.value === previousCategory)) category.value = previousCategory;
            render();
        };
        pack.onchange = category.onchange = render;
        refresh.onclick = reload;
        insert.onclick = () => {
            try {
                const result = LiteGraph.palette.insertStarter(this.graphcanvas, scope());
                status.textContent = `Added ${result.nodes.length} nodes. ${result.skipped.length} skipped.`;
                if (result.skipped.length) status.textContent += " " + result.skipped.map((item) => `${item.type}: ${item.reason}`).join("; ");
            } catch (error) { status.textContent = error.message; }
        };
        download.onclick = () => {
            const metadata = { format: "litegraph-starter-metadata", version: 1, scope: scope(), entries };
            const url = URL.createObjectURL(new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json" }));
            const link = el("a", "");
            link.href = url; link.download = "starter-metadata.json"; link.click(); link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        };
        panel.addEventListener("keydown", (event) => {
            event.stopPropagation();
            if (event.key === "Escape") { close.click(); this.root?.querySelector("#starter_button")?.focus(); }
        });
        this.content.appendChild(panel);
        reload();
        pack.focus();
        return panel;
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
            const reason = graph.getExecutionBlockReason();
            if (reason) return this.graphcanvas.showExecutionNotice(reason);
            graph.start();
        } else {
            graph.stop();
        }
    }

    onPlayStepButton() {
        var graph = this.graph;
        const reason = graph.getExecutionBlockReason();
        if (reason) return this.graphcanvas.showExecutionNotice(reason);
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
                // untrusted: checked by the validated loader (setting LiteGraph.Loader.OnOpen), report shown as a notice
                reader.onload = (event) => that.graph._configureOpened(event.target.result, file.name);
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

/**
 * The Editor's node palette: a DOM panel over the left side of the canvas, built from
 * LiteGraph.palette. Types are grouped by pack and category; a search box filters them; the star
 * marks favourites (setting LiteGraph.Palette.Favorites); "Recent" lists the last inserted types.
 * Drag an entry onto the canvas (or double-click it) to insert it; hover shows a preview.
 */
export class NodePalettePanel {

    constructor(graphcanvas, container) {
        this.graphcanvas = graphcanvas;
        this.query = "";
        this.favoritesOnly = false;
        this._abort = new AbortController();
        const signal = this._abort.signal;
        const root = this.root = document.createElement("div");
        root.className = "litegraph-palette";
        root.style.cssText = "position:absolute;left:0;top:0;bottom:0;width:240px;z-index:6;display:flex;flex-direction:column;background:rgba(28,28,28,0.96);border-right:1px solid #444;font:12px Arial;color:#ccc";
        root.innerHTML = `<div style="display:flex;gap:4px;padding:6px;border-bottom:1px solid #444">
                <input class="palette-search" type="search" placeholder="Search nodes" style="flex:1;min-width:0;background:#111;color:#ddd;border:1px solid #555;border-radius:3px;padding:3px 5px">
                <button class="palette-favorites btn" title="Favourites only" style="padding:0 6px">☆</button>
            </div>
            <div class="palette-list" style="flex:1;overflow:auto;padding:4px 0"></div>`;
        this.list = root.querySelector(".palette-list");
        const search = root.querySelector(".palette-search");
        search.addEventListener("input", () => { this.query = search.value.trim(); this.render(); }, { signal });
        const favButton = root.querySelector(".palette-favorites");
        favButton.addEventListener("click", () => {
            this.favoritesOnly = !this.favoritesOnly;
            favButton.textContent = this.favoritesOnly ? "★" : "☆";
            this.render();
        }, { signal });
        // keys typed in the panel belong to it, not to the canvas shortcuts
        root.addEventListener("keydown", (e) => e.stopPropagation(), { signal });
        const preview = this.preview = document.createElement("canvas");
        preview.className = "palette-preview";
        preview.width = 180;
        preview.height = 100;
        preview.style.cssText = "position:absolute;left:246px;display:none;z-index:7;border:1px solid #555;border-radius:4px;background:#222;pointer-events:none";
        container.appendChild(root);
        container.appendChild(preview);
        this.render();
    }

    render() {
        const palette = LiteGraph.palette;
        this.list.innerHTML = "";
        if (!palette) return;
        const section = (title) => {
            const header = document.createElement("div");
            header.textContent = title;
            header.style.cssText = "padding:6px 8px 2px;color:#8ab;font-weight:bold;text-transform:uppercase;font-size:10px";
            this.list.appendChild(header);
        };
        if (!this.query && !this.favoritesOnly) {
            const recent = palette.recent().map((type) => LiteGraph.getNodeDefinition(type)).filter(Boolean);
            if (recent.length) {
                section("Recent");
                for (const def of recent) this.list.appendChild(this.item({ ...def, favorite: palette.isFavorite(def.type) }));
            }
        }
        const groups = palette.groups({ query: this.query, favoritesOnly: this.favoritesOnly });
        for (const group of groups) {
            section(group.pack.title);
            for (const { category, items } of group.categories) {
                const label = document.createElement("div");
                label.textContent = category || "(no category)";
                label.style.cssText = "padding:3px 10px 1px;color:#888";
                this.list.appendChild(label);
                for (const def of items) this.list.appendChild(this.item(def));
            }
        }
        if (!groups.length) {
            const empty = document.createElement("div");
            empty.textContent = this.favoritesOnly ? "No favourites yet: star a node." : "No node matches.";
            empty.style.cssText = "padding:8px;color:#888";
            this.list.appendChild(empty);
        }
    }

    /** one draggable entry */
    item(def) {
        const signal = this._abort.signal;
        const element = document.createElement("div");
        element.className = "palette-item";
        element.draggable = true;
        element.dataset.type = def.type;
        element.title = def.description ? `${def.type}: ${def.description}` : def.type;
        element.style.cssText = "display:flex;align-items:center;gap:6px;padding:2px 8px 2px 18px;cursor:grab;white-space:nowrap";
        const star = document.createElement("span");
        star.className = "palette-star";
        star.textContent = def.favorite ? "★" : "☆";
        star.style.cssText = `cursor:pointer;color:${def.favorite ? "#fc6" : "#666"}`;
        const label = document.createElement("span");
        label.textContent = (typeof def.icon === "string" && def.icon ? def.icon + " " : "") + def.title;
        label.style.cssText = "overflow:hidden;text-overflow:ellipsis";
        element.append(star, label);
        star.addEventListener("click", (e) => {
            e.stopPropagation();
            LiteGraph.palette.toggleFavorite(def.type);
            this.render();
        }, { signal });
        element.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData(this.graphcanvas.constructor.NODE_DRAG_MIME ?? "application/x-litegraph-node-type", def.type);
            e.dataTransfer.setData("text/plain", def.type);
            e.dataTransfer.effectAllowed = "copy";
            this.preview.style.display = "none";
        }, { signal });
        element.addEventListener("dblclick", () => {
            const area = this.graphcanvas.visible_area;
            LiteGraph.palette.insert(this.graphcanvas, def.type, [area[0] + area[2] / 2, area[1] + area[3] / 2]);
            this.render();
        }, { signal });
        element.addEventListener("mouseenter", () => this.showPreview(def.type, element), { signal });
        element.addEventListener("mouseleave", () => { this.preview.style.display = "none"; }, { signal });
        return element;
    }

    /** draws a small node from the palette's preview data next to the entry */
    showPreview(type, anchor) {
        const data = LiteGraph.palette.preview(type);
        const canvas = this.preview;
        const ctx = canvas.getContext?.("2d");
        if (!data || !ctx) return;
        const rows = Math.max(data.inputs.length, data.outputs.length, 1);
        const titleHeight = 20;
        canvas.height = Math.min(220, titleHeight + 12 + rows * 16);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = data.bgcolor || LiteGraph.NODE_DEFAULT_BGCOLOR || "#353535";
        ctx.fillRect(6, 6, canvas.width - 12, canvas.height - 12);
        ctx.fillStyle = data.color || LiteGraph.NODE_DEFAULT_COLOR || "#333";
        ctx.fillRect(6, 6, canvas.width - 12, titleHeight);
        ctx.font = "12px Arial";
        ctx.fillStyle = "#ddd";
        ctx.textAlign = "left";
        ctx.fillText(((typeof data.icon === "string" && data.icon) ? data.icon + " " : "") + data.title, 14, 20);
        ctx.font = "11px Arial";
        data.inputs.slice(0, rows).forEach((slot, i) => {
            const y = 6 + titleHeight + 14 + i * 16;
            ctx.fillStyle = "#7c7";
            ctx.beginPath(); ctx.arc(14, y - 4, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#bbb";
            ctx.fillText(String(slot.name), 22, y);
        });
        ctx.textAlign = "right";
        data.outputs.slice(0, rows).forEach((slot, i) => {
            const y = 6 + titleHeight + 14 + i * 16;
            ctx.fillStyle = "#7c7";
            ctx.beginPath(); ctx.arc(canvas.width - 14, y - 4, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#bbb";
            ctx.fillText(String(slot.name), canvas.width - 22, y);
        });
        const top = anchor.offsetTop - this.list.scrollTop; // offsetTop is relative to the panel (positioned)
        canvas.style.top = `${Math.max(0, top)}px`;
        canvas.style.display = "";
    }

    dispose() {
        this._abort.abort();
        this.root.remove();
        this.preview.remove();
    }
}

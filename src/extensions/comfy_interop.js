import { LiteGraph } from "../litegraph.js";

/**
 * Optional ComfyUI workflow interoperability.
 *
 * Loads ComfyUI workflow JSON (schema 0.4 and 1) into an LGraph so it can be inspected, edited
 * and saved back without losing data this runtime does not model, and exports LGraphs as
 * ComfyUI-shaped documents. Node types unknown to this runtime become hidden placeholder types
 * that keep every stored field. Importing has no global effect until it is called.
 *
 * Modes 0 to 4 mean the same in both (4 is BYPASS since mode numbering 2). LiteGraph's ON_REQUEST (5)
 * has no ComfyUI equivalent:
 * - export: ON_REQUEST -> Comfy ALWAYS (0) plus a `litegraph_mode: 5` marker that import restores;
 * - import: a `litegraph_mode: 4` marker (written by builds before numbering 2) means ON_REQUEST.
 * Earlier imports turned BYPASS into NEVER and listed the nodes in `extra.comfy_bypassed`;
 * LGraph.migrateModes turns those back into BYPASS, and export still writes 4 for a listed NEVER node.
 *
 * Designed after ComfyUI's documented workflow schema; no ComfyUI code is included.
 */
export const ComfyInterop = {
    COMFY_MODE: { ALWAYS: 0, ON_EVENT: 1, NEVER: 2, ON_TRIGGER: 3, BYPASS: 4 },

    /** node fields the core serializer models; placeholders stash everything else */
    CORE_NODE_FIELDS: ["id", "type", "pos", "size", "flags", "order", "mode", "inputs", "outputs",
        "properties", "title", "color", "bgcolor", "boxcolor", "shape"],

    /** heuristic: does this JSON look like a ComfyUI workflow? */
    isComfyWorkflow(json) {
        if (!json || typeof json !== "object" || !Array.isArray(json.nodes)) return false;
        if (typeof json.litegraph_version === "string") return false; // written by this runtime (exportWorkflow drops it)
        if (json.version === 1 && json.state) return true;
        if (json.extra?.ds || json.models || json.definitions?.subgraphs) return true;
        return json.nodes.some((n) => n?.properties?.["Node name for S&R"] !== undefined || n?.cnr_id !== undefined);
    },

    /** registers a hidden placeholder type for a ComfyUI node type unknown to this runtime */
    ensurePlaceholderType(type) {
        if (!type || LiteGraph.registered_node_types[type]) return false;
        const coreFields = ComfyInterop.CORE_NODE_FIELDS;
        class ComfyPlaceholderNode extends LiteGraph.LGraphNode {
            constructor(title) {
                super(title ?? type);
                this.serialize_widgets = false;
                this.comfy_fields = {};
            }
            onConfigure(info) {
                this.comfy_fields = {};
                for (const key of Object.keys(info)) {
                    if (!coreFields.includes(key)) this.comfy_fields[key] = LiteGraph.cloneObject(info[key]);
                }
                this.comfy_absent = ["inputs", "outputs"].filter((key) => !(key in info));
            }
            onSerialize(o) {
                Object.assign(o, LiteGraph.cloneObject(this.comfy_fields));
                for (const key of this.comfy_absent ?? []) {
                    if (Array.isArray(o[key]) && !o[key].length) delete o[key];
                }
            }
            onDrawForeground(ctx) {
                const values = this.comfy_fields?.widgets_values;
                if (!values || this.flags.collapsed) return;
                const list = Array.isArray(values) ? values : Object.entries(values).map(([k, v]) => `${k}: ${v}`);
                const slots = Math.max(this.inputs?.length ?? 0, this.outputs?.length ?? 0);
                ctx.save();
                ctx.font = "11px Arial";
                ctx.fillStyle = "#999";
                ctx.textAlign = "left";
                list.slice(0, 8).forEach((value, i) => {
                    const text = typeof value === "object" ? JSON.stringify(value) : String(value);
                    ctx.fillText(text.length > 40 ? text.slice(0, 39) + "…" : text, 8, (slots + 1) * LiteGraph.NODE_SLOT_HEIGHT + i * 13);
                });
                ctx.restore();
            }
        }
        ComfyPlaceholderNode.title = type;
        ComfyPlaceholderNode.skip_list = true; // never offered in menus or search
        ComfyPlaceholderNode.comfy_placeholder = true;
        LiteGraph.registerNodeType(type, ComfyPlaceholderNode);
        return true;
    },

    /**
     * Loads a ComfyUI workflow into a graph.
     * @param {LGraph} graph
     * @param {object} json - ComfyUI workflow (0.4 or 1)
     * @param {{placeholders?: boolean}} [options] - placeholders: register hidden types for unknown nodes (default true)
     * @returns {{error: boolean, placeholderTypes: string[], bypassed: Array<number|string>}}
     */
    importWorkflow(graph, json, options = {}) {
        const data = LiteGraph.cloneObject(json);
        const placeholderTypes = [];
        const definitions = ComfyInterop._definitionsOf(data);
        const definitionIds = new Set(definitions.map((definition) => definition.id));
        // nodes of the root and of every subgraph definition: placeholders and modes
        const importNodes = (holder) => {
            const bypassedHere = [];
            for (const node of holder.nodes ?? []) {
                if (!node) continue;
                if (options.placeholders !== false && !definitionIds.has(node.type) && ComfyInterop.ensurePlaceholderType(node.type)) {
                    placeholderTypes.push(node.type);
                }
                if (typeof node.litegraph_mode === "number") {
                    // round-tripped LiteGraph mode; 4 was ON_REQUEST before mode numbering 2
                    node.mode = node.litegraph_mode === 4 ? LiteGraph.ON_REQUEST : node.litegraph_mode;
                    delete node.litegraph_mode;
                } else if (node.mode === ComfyInterop.COMFY_MODE.BYPASS) {
                    bypassedHere.push(node.id); // BYPASS is native: the mode is kept as it is
                }
            }
            return bypassedHere;
        };
        const bypassed = importNodes(data);
        for (const definition of definitions) importNodes(definition);
        // version 1 keeps a link's reroute parent on the link; LLink does not model it, so keep it
        // as a 0.4-style link extension that export converts back
        if (data.version === 1 && Array.isArray(data.links)) {
            const extensions = data.links.filter((l) => l && !Array.isArray(l) && l.parentId !== undefined)
                .map((l) => ({ id: l.id, parentId: l.parentId }));
            if (extensions.length) {
                data.extra = { ...(data.extra ?? {}), linkExtensions: extensions };
            }
        }
        // the modes above are in the current numbering (an unmarked document would follow LiteGraph.Compat.UnmarkedMode4)
        data.litegraph_modes = LiteGraph.MODES_VERSION;
        const error = graph.configure(data);
        return { error: !!error, placeholderTypes, bypassed };
    },

    /** subgraph definitions of a document, nested blocks included (the objects themselves) */
    _definitionsOf(doc) {
        const out = [];
        const visit = (holder) => {
            for (const definition of holder?.definitions?.subgraphs ?? []) {
                if (!definition || typeof definition !== "object") continue;
                out.push(definition);
                visit(definition);
            }
        };
        visit(doc);
        return out;
    },

    /** LiteGraph mode -> ComfyUI mode */
    toComfyMode(mode) {
        return mode === LiteGraph.ON_REQUEST ? ComfyInterop.COMFY_MODE.ALWAYS : mode;
    },

    /**
     * Serializes a graph as a ComfyUI workflow.
     * @param {LGraph} graph
     * @param {{version?: 0.4|1}} [options]
     * @returns {object} workflow JSON
     */
    exportWorkflow(graph, options = {}) {
        const version = options.version ?? 0.4;
        if (version !== 0.4 && version !== 1) throw new Error(`Unsupported ComfyUI workflow version: ${version}`);
        // subgraphs as ComfyUI definitions: instances reference definitions.subgraphs
        const data = LiteGraph.cloneObject(graph.serialize({ format: "definitions" }));
        delete data.litegraph_version; // marks documents written by this runtime (see isComfyWorkflow)
        delete data.litegraph_modes; // ComfyUI numbers modes 0 to 4 the same way
        const extra = data.extra = { ...(data.extra ?? {}) };
        // modes of the root and of every definition
        const exportNodes = (holder, holderExtra) => {
            const bypassed = new Set(holderExtra?.comfy_bypassed ?? []);
            if (holderExtra) delete holderExtra.comfy_bypassed;
            (holder.nodes ?? []).forEach((node, index) => {
                if (bypassed.has(node.id) && node.mode === LiteGraph.NEVER) {
                    node.mode = ComfyInterop.COMFY_MODE.BYPASS;
                } else if (node.mode === LiteGraph.ON_REQUEST) {
                    node.mode = ComfyInterop.toComfyMode(node.mode);
                    node.litegraph_mode = LiteGraph.ON_REQUEST;
                }
                node.mode ??= 0;
                node.order ??= index;
                node.flags ??= {};
                node.properties ??= {};
            });
        };
        exportNodes(data, extra);
        const definitions = ComfyInterop._definitionsOf(data);
        for (const definition of definitions) {
            if (definition.extra) definition.extra = { ...definition.extra };
            exportNodes(definition, definition.extra);
            if (definition.extra && !Object.keys(definition.extra).length) delete definition.extra;
        }

        const numeric = (id) => typeof id === "number";
        for (const link of data.links) {
            if (!numeric(link[0])) {
                throw new Error("ComfyUI workflows need numeric link ids; set LiteGraph.use_uuids = false");
            }
        }
        for (const definition of definitions) {
            if ((definition.links ?? []).some((link) => !numeric(Array.isArray(link) ? link[0] : link?.id))) {
                throw new Error("ComfyUI workflows need numeric link ids; set LiteGraph.use_uuids = false");
            }
        }
        const linkIds = new Set(data.links.map((link) => link[0]));
        const linkExtensions = (extra.linkExtensions ?? []).filter((e) => linkIds.has(e.id));
        const reroutes = data.reroutes ?? extra.reroutes;
        const numericMax = (values) => values.reduce((max, v) => (typeof v === "number" && v > max ? v : max), 0);

        if (version === 0.4) {
            data.version = 0.4;
            if (linkExtensions.length) extra.linkExtensions = linkExtensions; else delete extra.linkExtensions;
            if (reroutes) extra.reroutes = reroutes;
            delete data.reroutes;
            delete data.state;
            if (typeof data.last_node_id !== "number") data.last_node_id = numericMax(data.nodes.map((n) => n.id));
            return data;
        }

        // version 1
        const parents = new Map(linkExtensions.map((e) => [e.id, e.parentId]));
        data.links = data.links.map(([id, origin_id, origin_slot, target_id, target_slot, type]) => {
            const link = { id, origin_id, origin_slot, target_id, target_slot, type };
            if (parents.has(id)) link.parentId = parents.get(id);
            return link;
        });
        let groupId = numericMax((data.groups ?? []).map((g) => g.id));
        for (const group of data.groups ?? []) group.id ??= ++groupId;
        const previous = data.state ?? {};
        data.state = {
            ...previous,
            lastGroupId: Math.max(previous.lastGroupId ?? 0, groupId),
            lastNodeId: Math.max(previous.lastNodeId ?? 0, numericMax([data.last_node_id, ...data.nodes.map((n) => n.id)])),
            lastLinkId: Math.max(previous.lastLinkId ?? 0, numericMax([data.last_link_id, ...linkIds])),
            lastRerouteId: Math.max(previous.lastRerouteId ?? 0, numericMax((reroutes ?? []).map((r) => r.id))),
        };
        if (reroutes) data.reroutes = reroutes;
        delete extra.reroutes;
        delete extra.linkExtensions;
        delete data.last_node_id;
        delete data.last_link_id;
        data.version = 1;
        return data;
    },
};

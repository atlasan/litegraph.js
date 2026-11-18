import { LiteGraph } from "../litegraph.js";

/**
 * Optional ComfyUI workflow interoperability.
 *
 * Loads ComfyUI workflow JSON (schema 0.4 and 1) into an LGraph so it can be inspected, edited
 * and saved back without losing data this runtime does not model, and exports LGraphs as
 * ComfyUI-shaped documents. Node types unknown to this runtime become hidden placeholder types
 * that keep every stored field. Importing has no global effect until it is called.
 *
 * Mode 4 means different things: LiteGraph ON_REQUEST vs ComfyUI BYPASS. The mapping is explicit:
 * - import: Comfy BYPASS (4) -> LiteGraph NEVER (2); the node ids are remembered in
 *   graph.extra.comfy_bypassed so export restores 4 while the node is still NEVER.
 * - export: LiteGraph ON_REQUEST (4) -> Comfy ALWAYS (0) plus a `litegraph_mode: 4` marker
 *   that import restores.
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
        const bypassed = [];
        for (const node of data.nodes ?? []) {
            if (options.placeholders !== false && ComfyInterop.ensurePlaceholderType(node.type)) {
                placeholderTypes.push(node.type);
            }
            if (typeof node.litegraph_mode === "number") {
                node.mode = node.litegraph_mode; // round-tripped LiteGraph mode (e.g. ON_REQUEST)
                delete node.litegraph_mode;
            } else if (node.mode === ComfyInterop.COMFY_MODE.BYPASS) {
                node.mode = LiteGraph.NEVER;
                bypassed.push(node.id);
            }
        }
        // version 1 keeps a link's reroute parent on the link; LLink does not model it, so keep it
        // as a 0.4-style link extension that export converts back
        if (data.version === 1 && Array.isArray(data.links)) {
            const extensions = data.links.filter((l) => l && !Array.isArray(l) && l.parentId !== undefined)
                .map((l) => ({ id: l.id, parentId: l.parentId }));
            if (extensions.length) {
                data.extra = { ...(data.extra ?? {}), linkExtensions: extensions };
            }
        }
        if (bypassed.length) {
            data.extra = { ...(data.extra ?? {}), comfy_bypassed: bypassed };
        }
        const error = graph.configure(data);
        return { error: !!error, placeholderTypes, bypassed };
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
        const data = LiteGraph.cloneObject(graph.serialize());
        const extra = data.extra = { ...(data.extra ?? {}) };
        const bypassed = new Set(extra.comfy_bypassed ?? []);
        delete extra.comfy_bypassed;

        data.nodes.forEach((node, index) => {
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

        for (const link of data.links) {
            if (typeof link[0] !== "number") {
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

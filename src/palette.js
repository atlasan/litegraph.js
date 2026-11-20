import { LiteGraph } from "./litegraph.js";

/**
 * The node palette's data (Wave 4d, decision W4-7): node types grouped by pack and category,
 * search, favourites and recently used types. The Editor draws it as a DOM panel; other hosts
 * can draw their own from the same data.
 *
 * Favourites live in the setting `LiteGraph.Palette.Favorites`, recently used types in
 * `LiteGraph.Palette.Recent`, so they persist with the other settings.
 */
export class NodePalette {

    static RECENT_LIMIT = 12;

    /** previews do not build nodes of types that open devices or contexts */
    static PREVIEW_SKIP_CAPABILITIES = ["audio", "webgl", "midi", "sys"];

    constructor(host) {
        this.host = host;
        this._previews = new Map();
    }

    get _settings() {
        return this.host?.settings ?? null;
    }

    _list(id) {
        const value = this._settings?.has?.(id) ? this._settings.get(id) : [];
        return Array.isArray(value) ? value.filter((type) => typeof type === "string") : [];
    }

    /** the definitions the palette offers: not hidden, supported here, deprecated only on request */
    definitions({ includeDeprecated = false } = {}) {
        const host = this.host;
        return (host.listNodeDefinitions?.({ includeDeprecated, supportedOnly: true }) ?? [])
            .filter((def) => !def.hidden && !def.type.startsWith("graph/input") && !def.type.startsWith("graph/output"));
    }

    /**
     * Definitions matching a query (through LiteGraph.nodeSearch) or every one, with a
     * `favorite` flag, optionally limited to a pack, a category or the favourites.
     * @param {{query?: string, pack?: string, category?: string, favoritesOnly?: boolean}} [options]
     * @returns {Array<object>} definitions (frozen) wrapped as `{...def, favorite}`
     */
    list({ query = "", pack, category, favoritesOnly = false } = {}) {
        const favorites = new Set(this.favorites());
        let defs;
        if (query && this.host.nodeSearch) {
            const allowed = new Set(this.definitions().map((def) => def.type));
            defs = this.host.nodeSearch.search(query).map((result) => this.host.getNodeDefinition(result.type)).filter((def) => def && allowed.has(def.type));
        } else {
            defs = this.definitions().sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
        }
        return defs
            .filter((def) => (pack === undefined || (def.pack?.id ?? "") === pack)
                && (category === undefined || def.category === category || def.category.startsWith(category + "/"))
                && (!favoritesOnly || favorites.has(def.type)))
            .map((def) => ({ ...def, favorite: favorites.has(def.type) }));
    }

    /**
     * Definitions grouped by pack, then by category.
     * @returns {Array<{pack: {id: string, title: string, builtin: boolean}, categories: Array<{category: string, items: object[]}>}>}
     */
    groups(options = {}) {
        const byPack = new Map();
        for (const def of this.list(options)) {
            const id = def.pack?.id ?? "";
            if (!byPack.has(id)) {
                const manifest = id ? this.host.packs?.get(id) : null;
                byPack.set(id, { pack: { id, title: manifest?.title ?? (id || "Other"), builtin: !!def.pack?.builtin }, categories: new Map() });
            }
            const group = byPack.get(id);
            const category = def.category || "";
            if (!group.categories.has(category)) group.categories.set(category, []);
            group.categories.get(category).push(def);
        }
        return [...byPack.values()]
            .sort((a, b) => (a.pack.builtin === b.pack.builtin ? a.pack.title.localeCompare(b.pack.title) : a.pack.builtin ? 1 : -1))
            .map((group) => ({ pack: group.pack, categories: [...group.categories].map(([category, items]) => ({ category, items })) }));
    }

    /** @returns {string[]} favourite node types */
    favorites() {
        return this._list("LiteGraph.Palette.Favorites");
    }

    isFavorite(type) {
        return this.favorites().includes(type);
    }

    /** Adds or removes a favourite; returns whether it is now a favourite. */
    toggleFavorite(type, on = !this.isFavorite(type)) {
        const list = this.favorites().filter((entry) => entry !== type);
        if (on) list.push(type);
        this._settings?.set("LiteGraph.Palette.Favorites", list);
        return on;
    }

    /** @returns {string[]} recently used node types, newest first */
    recent() {
        return this._list("LiteGraph.Palette.Recent");
    }

    /** Records that a type was inserted (newest first, at most RECENT_LIMIT). */
    recordUse(type) {
        if (typeof type !== "string" || !type) return;
        const list = [type, ...this.recent().filter((entry) => entry !== type)].slice(0, NodePalette.RECENT_LIMIT);
        this._settings?.set("LiteGraph.Palette.Recent", list);
    }

    /**
     * What a preview draws: title, icon, colours and slots, from the definition when it declares
     * its slots, else from a node built for the purpose (never added to a graph).
     * @returns {{type: string, title: string, icon: *, color: string|null, bgcolor: string|null,
     *   inputs: Array<{name: string, type: *}>, outputs: Array<{name: string, type: *}>}|null}
     */
    preview(type) {
        const def = this.host.getNodeDefinition?.(type);
        if (!def) return null;
        const slot = (s) => ({ name: s.label ?? s.name ?? "", type: s.type });
        if (this._previews.has(type)) return this._previews.get(type);
        let inputs = def.inputs?.map(slot) ?? null;
        let outputs = def.outputs?.map(slot) ?? null;
        let color = null;
        let bgcolor = null;
        const skip = (def.capabilities ?? []).some((capability) => NodePalette.PREVIEW_SKIP_CAPABILITIES.includes(capability));
        if ((!inputs || !outputs) && !skip) {
            try {
                const node = this.host.createNode(type);
                inputs ??= (node?.inputs ?? []).map(slot);
                outputs ??= (node?.outputs ?? []).map(slot);
                color = node?.color ?? node?.constructor?.color ?? null;
                bgcolor = node?.bgcolor ?? node?.constructor?.bgcolor ?? null;
            } catch {
                inputs ??= [];
                outputs ??= [];
            }
        }
        const preview = { type, title: def.title, icon: def.icon ?? null, color, bgcolor, inputs: inputs ?? [], outputs: outputs ?? [] };
        this._previews.set(type, preview);
        return preview;
    }

    /**
     * Inserts a node of `type` at a graph position, selected, as one undo step, and records the use.
     * @returns {object|null} the node
     */
    insert(canvas, type, pos) {
        const graph = canvas?.graph;
        if (!graph) return null;
        let node = null;
        graph.transact("paletteInsert", () => {
            node = this.host.createNode(type);
            if (!node) return;
            node.pos = [Math.round(pos[0]), Math.round(pos[1])];
            graph.add(node);
        });
        if (!node) return null;
        this.recordUse(type);
        canvas.selectNodes?.([node]);
        canvas.setDirty?.(true, true);
        return node;
    }
}

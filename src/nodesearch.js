import { LiteGraph } from "./litegraph.js";

/**
 * Node search without a DOM: query parsing, matching and ranking over node definitions
 * (LiteGraph.getNodeDefinition), plus a registry of definition filters.
 *
 * Query syntax: plain words must all match (type, title, aliases or description); filters narrow
 * the result: `i:number` (has an input of that type), `o:string` (has an output of that type),
 * `c:math` (category, or a sub-category), `s:core` (source). Words and filters combine freely:
 * `add i:number c:math`.
 *
 * Ranking per word, best match wins: exact type or title, title prefix, whole word, word prefix,
 * alias, substring of type/title, description. Slot filters use the declared `def` slots, else the
 * slot-type registry (filled as nodes are created). Results are sorted by score, then title.
 */
export class NodeSearch {

    static FILTER_PREFIXES = ["i", "o", "c", "s"];

    constructor() {
        /** @type {Map<string, {id: string, name: string, predicate: (def: object) => boolean, enabled: () => boolean}>} */
        this._filters = new Map();
    }

    /**
     * Registers a definition filter. `predicate(def)` returns true to keep a definition;
     * `enabled()` (default: always) decides whether the filter applies right now.
     * @returns {() => void} disposer
     */
    registerFilter({ id, name = id, predicate, enabled = () => true }) {
        if (typeof id !== "string" || !id) throw new TypeError("filter id must be a non-empty string");
        if (typeof predicate !== "function") throw new TypeError(`filter ${id}: predicate must be a function`);
        const entry = { id, name, predicate, enabled };
        this._filters.set(id, entry);
        return () => { if (this._filters.get(id) === entry) this._filters.delete(id); };
    }

    /** @returns {Array<{id: string, name: string}>} */
    listFilters() {
        return [...this._filters.values()].map(({ id, name }) => ({ id, name }));
    }

    /** true when no enabled definition filter rejects the definition */
    passesFilters(def) {
        for (const filter of this._filters.values()) {
            let active = true;
            try { active = filter.enabled(); } catch { active = true; }
            if (active && !filter.predicate(def)) return false;
        }
        return true;
    }

    /**
     * @param {string} text
     * @returns {{terms: string[], filters: {i: string[], o: string[], c: string[], s: string[]}}}
     */
    static parseQuery(text) {
        const query = { terms: [], filters: { i: [], o: [], c: [], s: [] } };
        for (const token of String(text ?? "").trim().split(/\s+/)) {
            if (!token) continue;
            const match = /^([ioIOcCsS]):(.+)$/.exec(token);
            if (match) query.filters[match[1].toLowerCase()].push(match[2].toLowerCase());
            else query.terms.push(token.toLowerCase());
        }
        return query;
    }

    /**
     * Slot types of a registered type: from its definition, else from the slot-type registry, else from
     * a probe instance (`new Class()`, cached per class) for types that declare no slots and were never
     * created (outputs reach the registry only with `auto_load_slot_types`). A constructor that throws
     * leaves the type without slot types.
     */
    static _slotTypes(def, input) {
        const declared = input ? def.inputs : def.outputs;
        if (declared) return declared.map((slot) => String(slot.type ?? "").toLowerCase());
        const registry = input ? LiteGraph.registered_slot_in_types : LiteGraph.registered_slot_out_types;
        const types = [];
        for (const [slotType, entry] of Object.entries(registry ?? {})) {
            if (entry?.nodes?.includes?.(def.type)) types.push(String(slotType).toLowerCase());
        }
        if (types.length) return types;
        const probed = NodeSearch._probeSlots(def.type);
        return probed ? (input ? probed.inputs : probed.outputs) : types;
    }

    /** the slot types of one instance of a type, cached per class; null when it cannot be built */
    static _probeSlots(type) {
        const Class = LiteGraph.registered_node_types?.[type];
        if (typeof Class !== "function") return null;
        NodeSearch._probes ??= new WeakMap();
        if (NodeSearch._probes.has(Class)) return NodeSearch._probes.get(Class);
        let probed = null;
        try {
            const node = new Class();
            const list = (slots) => (slots ?? []).flatMap((slot) => String(slot?.type ?? "").toLowerCase().split(","));
            probed = { inputs: list(node.inputs), outputs: list(node.outputs) };
        } catch {
            probed = null;
        }
        NodeSearch._probes.set(Class, probed);
        return probed;
    }

    /** true when a definition passes the query's i:/o:/c:/s: filters */
    static matchesFilters(def, filters) {
        const typeMatch = (types, wanted) => types.some((type) => type === wanted || type.split(",").includes(wanted));
        for (const wanted of filters.i) if (!typeMatch(NodeSearch._slotTypes(def, true), wanted)) return false;
        for (const wanted of filters.o) if (!typeMatch(NodeSearch._slotTypes(def, false), wanted)) return false;
        const category = String(def.category ?? "").toLowerCase();
        for (const wanted of filters.c) if (category !== wanted && !category.startsWith(wanted + "/")) return false;
        const source = String(def.source ?? "").toLowerCase();
        for (const wanted of filters.s) if (!source.includes(wanted)) return false;
        return true;
    }

    /**
     * Score of a definition for the query's words: -1 when a word does not match at all.
     * @param {object} def - from LiteGraph.getNodeDefinition
     * @param {{terms: string[]}} query
     */
    static score(def, query) {
        const type = def.type.toLowerCase();
        const title = String(def.title ?? "").toLowerCase();
        const aliases = (def.search_aliases ?? []).map((alias) => String(alias).toLowerCase());
        const description = String(def.description ?? "").toLowerCase();
        const words = `${title} ${type.replace(/[/:_-]/g, " ")}`.split(/\s+/).filter(Boolean);
        let total = 0;
        for (const term of query.terms) {
            let best = -1;
            if (type === term || title === term || type.endsWith("/" + term)) best = 100;
            else if (title.startsWith(term)) best = 60;
            else if (words.includes(term)) best = 50;
            else if (words.some((word) => word.startsWith(term))) best = 40;
            else if (aliases.some((alias) => alias === term || alias.startsWith(term))) best = 35;
            else if (title.includes(term) || type.includes(term)) best = 20;
            else if (aliases.some((alias) => alias.includes(term))) best = 15;
            else if (description.includes(term)) best = 8;
            if (best < 0) return -1;
            total += best;
        }
        return total;
    }

    /**
     * Searches registered node types.
     * @param {string|object} text - query text, or a parsed query
     * @param {{types?: string[], limit?: number, applyFilters?: boolean}} [options]
     * @returns {Array<{type: string, score: number, def: object}>}
     */
    search(text, { types = Object.keys(LiteGraph.registered_node_types), limit = -1, applyFilters = true } = {}) {
        const query = typeof text === "string" ? NodeSearch.parseQuery(text) : text;
        const results = [];
        for (const type of types) {
            const def = LiteGraph.getNodeDefinition(type);
            if (!def) continue;
            if (applyFilters && !this.passesFilters(def)) continue;
            if (!NodeSearch.matchesFilters(def, query.filters)) continue;
            const score = query.terms.length ? NodeSearch.score(def, query) : 0;
            if (score < 0) continue;
            results.push({ type, score, def });
        }
        results.sort((a, b) => b.score - a.score || String(a.def.title).localeCompare(String(b.def.title)) || a.type.localeCompare(b.type));
        return limit >= 0 ? results.slice(0, limit) : results;
    }
}

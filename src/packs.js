import { LiteGraph } from "./litegraph.js";

/**
 * Node packs: a manifest (plain JSON) that names a group of node types, extensions and libraries,
 * with a version and the litegraph range it needs. Manifests are data: nothing here fetches or
 * evaluates code. A pack's code is whatever the page or the runner already imported; while it
 * runs inside `register(manifest, setup)` (or between `open` and `close`), every node type it
 * registers belongs to the pack.
 *
 * ```js
 * LiteGraph.packs.register({ id: "acme-audio", version: "1.2.0", requires: { litegraph: ">=0.10" } }, () => {
 *     LiteGraph.registerNodeType("acme/filter", Filter);
 * });
 * LiteGraph.getNodeDefinition("acme/filter").pack; // {id: "acme-audio", version: "1.2.0"}
 * ```
 *
 * Settings: `LiteGraph.Packs.Stamp`, `LiteGraph.Packs.AutoReplace`,
 * `LiteGraph.Packs.AllowIncompatible`, `LiteGraph.Packs.Disabled`.
 *
 * Design references (no code copied): ComfyUI-Manager's pack metadata and node-provenance
 * fields, and the ComfyUI frontend's node replacement mappings.
 */

const PACK_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._@/-]*$/;

/** Splits "1.2.3-beta.1" into numeric parts and a pre-release tag. */
function packParseVersion(version) {
    const match = /^v?(\d+)(?:\.(\d+|[xX*]))?(?:\.(\d+|[xX*]))?(?:-([0-9A-Za-z.-]+))?(?:\+.*)?$/.exec(String(version ?? "").trim());
    if (!match) return null;
    const part = (value) => (value === undefined || /^[xX*]$/.test(value)) ? null : Number(value);
    return { parts: [Number(match[1]), part(match[2]), part(match[3])], pre: match[4] ?? null };
}

/**
 * Compares two versions: negative, 0 or positive. A pre-release sorts before its release.
 * @returns {number|NaN} NaN when either is not a version
 */
function compareVersions(a, b) {
    const left = packParseVersion(a);
    const right = packParseVersion(b);
    if (!left || !right) return NaN;
    for (let i = 0; i < 3; i++) {
        const d = (left.parts[i] ?? 0) - (right.parts[i] ?? 0);
        if (d) return d;
    }
    if (left.pre === right.pre) return 0;
    if (left.pre === null) return 1;
    if (right.pre === null) return -1;
    return left.pre < right.pre ? -1 : 1;
}

/** Turns one comparator ("^1.2", "~1.2.3", ">=1", "1.x", "*") into [op, version] pairs. */
function packExpandComparator(text) {
    const match = /^(\^|~|>=|<=|>|<|=)?\s*(.+)$/.exec(text);
    if (!match) return null;
    const op = match[1] ?? "";
    if (/^[xX*]$/.test(match[2])) return [];
    const version = packParseVersion(match[2]);
    if (!version) return null;
    const [major, minor, patch] = version.parts;
    const at = (...parts) => parts.map((p) => p ?? 0).join(".") + (version.pre && parts.length === 3 ? `-${version.pre}` : "");
    if (op === "^") {
        const upper = major > 0 || minor === null ? [major + 1, 0, 0] : (minor > 0 || patch === null ? [0, minor + 1, 0] : [0, 0, patch + 1]);
        return [[">=", at(major, minor, patch)], ["<", `${upper.join(".")}-0`]];
    }
    if (op === "~") {
        const upper = minor === null ? [major + 1, 0, 0] : [major, minor + 1, 0];
        return [[">=", at(major, minor, patch)], ["<", `${upper.join(".")}-0`]];
    }
    if ((op === "" || op === "=") && (minor === null || patch === null)) {
        // a partial version is a range: "1.2" means >=1.2.0 <1.3.0-0
        const upper = minor === null ? [major + 1, 0, 0] : [major, minor + 1, 0];
        return [[">=", at(major, minor, patch)], ["<", `${upper.join(".")}-0`]];
    }
    return [[op || "=", at(major, minor, patch)]];
}

/**
 * True when `version` satisfies `range`. Supports `*`, exact and partial versions (`1.2`, `1.x`),
 * `>=` `>` `<=` `<` `=`, `^`, `~`, space-separated comparators (all must hold) and `||`.
 * @param {string} version
 * @param {string} range
 * @returns {boolean}
 */
function satisfiesVersion(version, range) {
    if (range === undefined || range === null || String(range).trim() === "") return true;
    if (!packParseVersion(version)) return false;
    return String(range).split("||").some((alternative) => {
        const comparators = alternative.trim().replace(/(>=|<=|>|<|=|\^|~)\s+/g, "$1").split(/\s+/).filter(Boolean);
        if (!comparators.length) return true;
        return comparators.every((text) => {
            const expanded = packExpandComparator(text);
            if (!expanded) return false;
            return expanded.every(([op, bound]) => {
                const d = compareVersions(version, bound);
                switch (op) {
                    case ">=": return d >= 0;
                    case ">": return d > 0;
                    case "<=": return d <= 0;
                    case "<": return d < 0;
                    default: return d === 0;
                }
            });
        });
    });
}

const packStringList = (value) => Array.isArray(value) ? value.filter((v) => typeof v === "string" && v) : [];

/**
 * Checks a manifest and returns a frozen, normalized copy.
 * @throws {TypeError} when `id` or `version` is missing or malformed
 */
function normalizePackManifest(manifest) {
    if (!manifest || typeof manifest !== "object") throw new TypeError("pack manifest must be an object");
    if (typeof manifest.id !== "string" || !PACK_ID_PATTERN.test(manifest.id)) throw new TypeError(`pack manifest: invalid id ${JSON.stringify(manifest.id)}`);
    if (typeof manifest.version !== "string" || !packParseVersion(manifest.version)) {
        throw new TypeError(`pack ${manifest.id}: invalid version ${JSON.stringify(manifest.version)}`);
    }
    const requires = (manifest.requires && typeof manifest.requires === "object") ? { ...manifest.requires } : {};
    return Object.freeze({
        ...manifest,
        id: manifest.id,
        version: manifest.version,
        title: typeof manifest.title === "string" ? manifest.title : manifest.id,
        description: typeof manifest.description === "string" ? manifest.description : "",
        builtin: manifest.builtin === true,
        requires: Object.freeze(requires),
        nodes: Object.freeze(packStringList(manifest.nodes)),
        extensions: Object.freeze(packStringList(manifest.extensions)),
        libraries: Object.freeze(packStringList(manifest.libraries)),
        templates: Object.freeze(Array.isArray(manifest.templates) ? [...manifest.templates] : []),
        locales: Object.freeze(Array.isArray(manifest.locales) ? [...manifest.locales] : []),
    });
}

/**
 * The pack registry (`LiteGraph.packs`).
 */
export class PackRegistry {

    /** @param {object} host - the LiteGraph instance */
    constructor(host) {
        this.host = host;
        /** @type {Map<string, {manifest: object, state: string, types: Set<string>, error?: string}>} */
        this._packs = new Map();
        /** @type {Map<string, string>} node type → pack id (installed packs) */
        this._typeToPack = new Map();
        /** @type {Map<string, object>} known, not installed packs (metadata only) */
        this._indexed = new Map();
        /** @type {string[]} packs whose registrations are being attributed (innermost last) */
        this._open = [];
        /** @type {Map<string, object>} old type → replacement mapping */
        this._replacements = new Map();
    }

    _setting(id, fallback) {
        const settings = this.host?.settings;
        return settings?.has?.(id) ? settings.get(id) : fallback;
    }

    /** Refusal for a pack whose `requires.litegraph` does not match this runtime. */
    _checkCompatible(manifest) {
        const range = manifest.requires?.litegraph;
        const version = this.host?.VERSION;
        if (!range || satisfiesVersion(version, range)) return null;
        return `pack ${manifest.id}@${manifest.version} requires litegraph ${range}, this is ${version}`;
    }

    /**
     * Starts attributing node registrations to a pack (built-in node files use this; most code
     * should use {@link register}). Pair it with {@link close}.
     * @param {object} manifest
     * @returns {object} the normalized manifest
     */
    open(manifest) {
        const normalized = this._add(manifest);
        this._open.push(normalized.id);
        return normalized;
    }

    /** Stops attributing registrations to the pack opened last (or to `id`). */
    close(id) {
        const index = id === undefined ? this._open.length - 1 : this._open.lastIndexOf(id);
        if (index >= 0) this._open.splice(index, 1);
    }

    /**
     * Registers a pack. `setup(ctx)` runs at once (unless the pack is disabled); node types it
     * registers belong to the pack, as do types listed in `manifest.nodes`.
     * Refused (throws) when `requires.litegraph` does not match, unless the setting
     * `LiteGraph.Packs.AllowIncompatible` is on.
     * @param {object} manifest
     * @param {(ctx: {manifest: object, registerNodeType: Function}) => *} [setup]
     * @returns {() => void} disposer: unregisters the pack's node types and forgets the pack
     */
    register(manifest, setup) {
        const normalized = this._add(manifest);
        const entry = this._packs.get(normalized.id);
        if (entry.state === "active" && typeof setup === "function") {
            this._open.push(normalized.id);
            try {
                setup({ manifest: normalized, registerNodeType: (type, cls) => this.host.registerNodeType(type, cls) });
            } finally {
                this.close(normalized.id);
            }
        }
        return () => this.unregister(normalized.id);
    }

    _add(manifest) {
        const normalized = normalizePackManifest(manifest);
        const previous = this._packs.get(normalized.id);
        if (previous) {
            // a newer registration of the same pack replaces the manifest and keeps its types
            if (previous.manifest.version !== normalized.version) {
                LiteGraph.log_debug?.("packs", "replacing", normalized.id, previous.manifest.version, "->", normalized.version);
            }
        }
        const refusal = normalized.builtin ? null : this._checkCompatible(normalized);
        if (refusal && !this._setting("LiteGraph.Packs.AllowIncompatible", false)) {
            throw new Error(`${refusal}. Set LiteGraph.Packs.AllowIncompatible to register it anyway.`);
        }
        const disabled = !normalized.builtin && (this._setting("LiteGraph.Packs.Disabled", []) ?? []).includes(normalized.id);
        const entry = {
            manifest: normalized,
            state: disabled ? "disabled" : (refusal ? "incompatible" : "active"),
            types: previous?.types ?? new Set(),
            ...(refusal ? { error: refusal } : {}),
        };
        this._packs.set(normalized.id, entry);
        for (const type of normalized.nodes) {
            if (this.host?.registered_node_types?.[type]) this._attribute(type, normalized.id);
        }
        return normalized;
    }

    /** Forgets a pack and unregisters the node types it owns. */
    unregister(id) {
        const entry = this._packs.get(id);
        if (!entry) return false;
        for (const type of [...entry.types]) {
            if (this._typeToPack.get(type) === id && this.host?.registered_node_types?.[type]) {
                this.host.unregisterNodeType(type);
            }
            this._typeToPack.delete(type);
        }
        this._packs.delete(id);
        return true;
    }

    /** Called by registerNodeType: attributes the type to the open pack, or to a pack listing it. */
    _onTypeRegistered(type) {
        const open = this._open[this._open.length - 1];
        if (open) return this._attribute(type, open, false);
        for (const [id, entry] of this._packs) {
            if (entry.manifest.nodes.includes(type)) return this._attribute(type, id, false);
        }
        return null;
    }

    /** Called by unregisterNodeType. */
    _onTypeUnregistered(type) {
        const id = this._typeToPack.get(type);
        if (id) this._packs.get(id)?.types.delete(type);
        this._typeToPack.delete(type);
    }

    _attribute(type, id, refresh = true) {
        const previous = this._typeToPack.get(type);
        if (previous && previous !== id) this._packs.get(previous)?.types.delete(type);
        this._typeToPack.set(type, id);
        this._packs.get(id)?.types.add(type);
        if (refresh) this.host?.refreshNodeDefinition?.(type);
        return id;
    }

    /**
     * Adds known packs that are not installed (metadata only, nothing runs), so a missing type
     * can name the pack that provides it.
     * @param {object|object[]} manifests
     * @returns {() => void} disposer
     */
    index(manifests) {
        const ids = [];
        for (const manifest of Array.isArray(manifests) ? manifests : [manifests]) {
            const normalized = normalizePackManifest(manifest);
            this._indexed.set(normalized.id, normalized);
            ids.push(normalized.id);
        }
        return () => ids.forEach((id) => this._indexed.delete(id));
    }

    /** @returns {object|null} the manifest of an installed pack */
    get(id) {
        return this._packs.get(id)?.manifest ?? null;
    }

    /** @returns {object[]} manifests of installed packs, in registration order */
    list() {
        return [...this._packs.values()].map((entry) => entry.manifest);
    }

    /** @returns {{id: string, version: string, builtin: boolean}|null} the installed pack owning a type */
    packOf(type) {
        const id = this._typeToPack.get(type);
        const manifest = id ? this._packs.get(id)?.manifest : null;
        return manifest ? { id: manifest.id, version: manifest.version, builtin: manifest.builtin } : null;
    }

    /** @returns {string[]} the node types an installed pack owns */
    typesOf(id) {
        return [...(this._packs.get(id)?.types ?? [])];
    }

    /**
     * Finds the pack that provides a type: an installed pack first (also a disabled one that
     * lists the type), then the index.
     * @returns {{id: string, version: string, installed: boolean, state?: string}|null}
     */
    findPackForType(type) {
        const owner = this._typeToPack.get(type);
        if (owner) {
            const entry = this._packs.get(owner);
            return { id: owner, version: entry.manifest.version, installed: true, state: entry.state };
        }
        for (const [id, entry] of this._packs) {
            if (entry.manifest.nodes.includes(type)) return { id, version: entry.manifest.version, installed: true, state: entry.state };
        }
        for (const [id, manifest] of this._indexed) {
            if (manifest.nodes.includes(type)) return { id, version: manifest.version, installed: false };
        }
        return null;
    }

    /**
     * Every known pack as plain data: installed ones with their state ("active", "disabled",
     * "incompatible") and node types, then indexed ones (state "indexed").
     */
    describe() {
        const installed = [...this._packs.values()].map((entry) => ({
            ...entry.manifest,
            state: entry.state,
            types: [...entry.types].sort(),
            ...(entry.error ? { error: entry.error } : {}),
        }));
        const indexed = [...this._indexed.values()]
            .filter((manifest) => !this._packs.has(manifest.id))
            .map((manifest) => ({ ...manifest, state: "indexed", types: [...manifest.nodes] }));
        return [...installed, ...indexed];
    }

    /**
     * Provenance to stamp on a new node of `type`: `{pack, pack_ver}` for non-builtin packs when
     * the setting `LiteGraph.Packs.Stamp` is on, otherwise null.
     */
    stampFor(type) {
        if (!this._setting("LiteGraph.Packs.Stamp", true)) return null;
        const pack = this.packOf(type);
        return pack && !pack.builtin ? { pack: pack.id, pack_ver: pack.version } : null;
    }

    // ---- replacement mappings ------------------------------------------------------------

    /**
     * Registers how to replace a node type by another, as data.
     * @param {{old_type: string, new_type: string, inputs?: object, outputs?: object,
     *   properties?: object, widgets?: object, set?: {properties?: object}, auto?: boolean,
     *   reason?: string}} mapping
     *   - inputs / outputs: old slot (name or index) → new slot (name or index), or null to drop.
     *     Unlisted slots keep their name.
     *   - properties: old name → new name, or null to drop. Unlisted properties keep their name
     *     when the new type has them.
     *   - widgets: old widget index → new widget index, or null to drop. Unlisted values keep
     *     their position.
     *   - set.properties: values written on the new node after the mapping.
     *   - auto: replace on load, without asking (setting `LiteGraph.Packs.AutoReplace`).
     * @returns {() => void} disposer
     */
    registerReplacement(mapping) {
        if (!mapping || typeof mapping !== "object") throw new TypeError("node replacement must be an object");
        const { old_type, new_type } = mapping;
        if (typeof old_type !== "string" || !old_type) throw new TypeError("node replacement: old_type must be a non-empty string");
        if (typeof new_type !== "string" || !new_type) throw new TypeError(`node replacement ${old_type}: new_type must be a non-empty string`);
        for (const key of ["inputs", "outputs", "properties", "widgets", "set"]) {
            if (mapping[key] !== undefined && (mapping[key] === null || typeof mapping[key] !== "object" || Array.isArray(mapping[key]))) {
                throw new TypeError(`node replacement ${old_type}: ${key} must be an object`);
            }
        }
        const normalized = Object.freeze({ ...LiteGraph.cloneObject(mapping), auto: mapping.auto === true });
        this._replacements.set(old_type, normalized);
        return () => {
            if (this._replacements.get(old_type) === normalized) this._replacements.delete(old_type);
        };
    }

    /** @returns {object|null} the replacement mapping registered for a type */
    getReplacement(type) {
        return this._replacements.get(type) ?? null;
    }

    /** @returns {object[]} every registered replacement mapping */
    listReplacements() {
        return [...this._replacements.values()];
    }
}

// ---- node replacement on a graph -----------------------------------------------------------

/** true for a placeholder made by configure for a type that was not registered */
function isMissingNodePlaceholder(node) {
    return !!(node && node.has_errors && node.last_serialization && node.constructor === LiteGraph.LGraphNode);
}

/** The stored type of a node (a placeholder keeps the missing type in last_serialization). */
function storedNodeType(node) {
    return isMissingNodePlaceholder(node) ? node.last_serialization.type : node.type;
}

function packResolveSlot(slots, key) {
    if (key === null || key === undefined) return -1;
    if (typeof key === "number" || /^\d+$/.test(String(key))) {
        const index = Number(key);
        return index < (slots?.length ?? 0) ? index : -1;
    }
    return slots?.findIndex((slot) => slot?.name === key) ?? -1;
}

/** Target index on the new node for old slot `index` (named `name`), per a mapping. */
function packMapSlot(map, index, name, newSlots) {
    if (map) {
        if (Object.hasOwn(map, name)) return packResolveSlot(newSlots, map[name]);
        if (Object.hasOwn(map, String(index))) return packResolveSlot(newSlots, map[String(index)]);
    }
    return packResolveSlot(newSlots, name);
}

/**
 * Replaces `node` in its graph by a node of `mapping.new_type`, keeping its id, position, title,
 * colours, mode and flags, and moving its links (with their ids and reroutes) onto the mapped
 * slots. Links on slots the mapping cannot place are removed and listed in the result.
 * The caller wraps this in a transaction.
 * @returns {{node: object, dropped: Array<{kind: "input"|"output", slot: number, name: string, link: *}>}}
 */
function replaceNodeInGraph(graph, node, mapping) {
    const newNode = LiteGraph.createNode(mapping.new_type);
    if (!newNode) throw new Error(`replaceNode: node type ${mapping.new_type} is not registered`);
    const placeholder = isMissingNodePlaceholder(node);
    const stored = placeholder ? node.last_serialization : null;
    const dropped = [];

    // what to keep from the old node
    const customTitle = placeholder ? stored.title : (node.title !== node.constructor.title ? node.title : undefined);
    const oldProperties = { ...(placeholder ? (stored.properties ?? {}) : {}), ...(node.properties ?? {}) };
    const oldWidgets = placeholder
        ? (Array.isArray(stored.widgets_values) ? stored.widgets_values : [])
        : (node.widgets ?? []).map((w) => w?.value);

    newNode.pos = [node.pos[0], node.pos[1]];
    if (customTitle !== undefined) newNode.title = customTitle;
    for (const key of ["color", "bgcolor", "boxcolor"]) if (node[key]) newNode[key] = node[key];
    newNode.mode = node.mode ?? newNode.mode;
    if (node.flags) newNode.flags = { ...newNode.flags, ...LiteGraph.cloneObject(node.flags) };

    // properties: same name unless mapped; the new node's own provenance stamp wins
    const propertyMap = mapping.properties ?? {};
    for (const [key, value] of Object.entries(oldProperties)) {
        if (key === "pack" || key === "pack_ver") continue;
        const target = Object.hasOwn(propertyMap, key) ? propertyMap[key] : (key in (newNode.properties ?? {}) ? key : null);
        if (target === null || target === undefined) continue;
        newNode.properties[target] = LiteGraph.cloneObject(value);
    }
    Object.assign(newNode.properties, LiteGraph.cloneObject(mapping.set?.properties ?? {}));

    // widgets: same position unless mapped
    const widgetMap = mapping.widgets ?? {};
    const widgetValues = [];
    oldWidgets.forEach((value, index) => {
        const target = Object.hasOwn(widgetMap, String(index)) ? widgetMap[String(index)] : index;
        if (target === null || target === undefined) return;
        widgetValues[Number(target)] = value;
    });

    // plan the links: [link id, new slot] per old slot; unplaceable links are disconnected first
    const inputMoves = [];
    (node.inputs ?? []).forEach((input, index) => {
        if (input?.link === null || input?.link === undefined) return;
        const target = packMapSlot(mapping.inputs, index, input.name, newNode.inputs);
        if (target < 0 || inputMoves.some((move) => move.slot === target)) {
            dropped.push({ kind: "input", slot: index, name: input.name, link: input.link });
            node.disconnectInput(index, { doProcessChange: false });
            return;
        }
        inputMoves.push({ link: input.link, slot: target });
    });
    const outputMoves = [];
    (node.outputs ?? []).forEach((output, index) => {
        if (!output?.links?.length) return;
        const target = packMapSlot(mapping.outputs, index, output.name, newNode.outputs);
        if (target < 0) {
            for (const link of output.links) dropped.push({ kind: "output", slot: index, name: output.name, link });
            node.disconnectOutput(index, false, { doProcessChange: false });
            return;
        }
        outputMoves.push({ links: [...output.links], slot: target });
    });

    // detach the remaining links from the old node so removing it keeps them
    (node.inputs ?? []).forEach((input) => { if (input) input.link = null; });
    (node.outputs ?? []).forEach((output) => { if (output) output.links = null; });
    const id = node.id;
    graph.remove(node);

    const oldSize = node.size ? [node.size[0], node.size[1]] : null;
    newNode.id = id;
    graph.add(newNode, true, { doCalcSize: true });
    if (newNode.id !== id) throw new Error(`replaceNode: could not keep node id ${id}`);
    // the node keeps the size it had, grown if the new type needs more room
    if (oldSize && Number.isFinite(oldSize[0]) && Number.isFinite(oldSize[1])) {
        newNode.size[0] = Math.max(oldSize[0], newNode.size[0]);
        newNode.size[1] = Math.max(oldSize[1], newNode.size[1]);
    }

    for (const move of inputMoves) {
        const link = graph.links[move.link];
        if (!link) continue;
        link.target_slot = move.slot;
        newNode.inputs[move.slot].link = link.id;
    }
    for (const move of outputMoves) {
        const output = newNode.outputs[move.slot];
        output.links ??= [];
        for (const linkId of move.links) {
            const link = graph.links[linkId];
            if (!link) continue;
            link.origin_slot = move.slot;
            output.links.push(link.id);
        }
    }

    newNode.configure({
        properties: newNode.properties,
        ...(widgetValues.length ? { widgets_values: widgetValues } : {}),
        ...(customTitle !== undefined ? { title: customTitle } : {}),
    });
    graph.updateExecutionOrder();
    graph.setDirtyCanvas(true, true);
    return { node: newNode, dropped };
}

// helpers shared with LGraph (statics keep the bundles' export list to PackRegistry)
PackRegistry.compareVersions = compareVersions;
PackRegistry.satisfiesVersion = satisfiesVersion;
PackRegistry.normalizeManifest = normalizePackManifest;
PackRegistry.isMissingNodePlaceholder = isMissingNodePlaceholder;
PackRegistry.storedNodeType = storedNodeType;
PackRegistry.replaceNodeInGraph = replaceNodeInGraph;

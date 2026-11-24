// Examples library (FLW-22): the editor's Demo menu, built from apps/editor/examples/index.json and
// the templates of the active packs (LiteGraph.packs.listTemplates()). No DOM access at import, so
// tools/tests/examples.test.mjs can use exampleGroups().

/** Loads the examples manifest; `base` is the folder that holds index.json and the example files. */
export async function fetchExampleManifest(base = "examples/") {
    const response = await fetch(`${base}index.json`);
    if (!response.ok) throw new Error(`examples manifest: HTTP ${response.status}`);
    return response.json();
}

/**
 * Groups the manifest's examples and the packs' templates by category, in the manifest's category
 * order, leaving out empty and hidden categories (`wip`) unless `includeHidden`.
 * @returns {{id: string, title: string, items: {id: string, title: string, description: string, url: string|null, data: object|null, pack: string|null}[]}[]}
 */
export function exampleGroups(manifest, templates = [], { base = "examples/", includeHidden = false } = {}) {
    const categories = manifest?.categories ?? [];
    const known = new Map(categories.map((c) => [c.id, c]));
    const items = new Map();
    const add = (category, item) => {
        if (!items.has(category)) items.set(category, []);
        items.get(category).push(item);
    };
    for (const ex of manifest?.examples ?? []) {
        add(ex.category, { id: ex.id, title: ex.title, description: ex.description ?? "", url: base + ex.file, data: null, pack: null, ...(ex.guide ? { guide: ex.guide } : {}) });
    }
    for (const t of templates) {
        add(t.category, { id: `${t.pack}:${t.id}`, title: t.title, description: t.description ?? "", url: t.url, data: t.data, pack: t.pack });
    }
    const order = [...categories.map((c) => c.id), ...[...items.keys()].filter((id) => !known.has(id))];
    return order
        .filter((id) => items.has(id) && (includeHidden || !known.get(id)?.hidden))
        .map((id) => ({ id, title: known.get(id)?.title ?? id, items: items.get(id) }));
}

/** Fills a <select> with one <optgroup> per group; each option keeps its url or inline data. */
export function fillDemoSelect(select, groups) {
    const doc = select.ownerDocument;
    for (const group of groups) {
        const optgroup = doc.createElement("optgroup");
        optgroup.label = group.title;
        for (const item of group.items) {
            const option = doc.createElement("option");
            option.textContent = item.pack ? `${item.title} (${item.pack})` : item.title;
            if (item.description) option.title = item.description;
            option.dataset.example = item.id;
            option.exampleInfo = item;
            if (item.url) option.dataset.url = item.url;
            else option.exampleData = item.data;
            optgroup.appendChild(option);
        }
        select.appendChild(optgroup);
    }
}

/** Explain an example using text-only DOM, including steps, expected results and relevant settings. */
export function renderExampleHelp(container, item) {
    container.replaceChildren();
    container.hidden = !item;
    if (!item) return;
    const doc = container.ownerDocument;
    const el = (tag, text, parent = container) => {
        const node = doc.createElement(tag);
        node.textContent = text;
        parent.appendChild(node);
        return node;
    };
    el("summary", item.title);
    el("p", item.description || "Explore the nodes in this example.");
    const guide = item.guide;
    if (!guide) return;
    if (guide.steps?.length) {
        const list = el("ol", "");
        for (const step of guide.steps) el("li", step, list);
    }
    if (guide.expected) el("p", "Expected: " + guide.expected);
    if (guide.settings?.length) el("p", "Try: " + guide.settings.join(" · "));
}

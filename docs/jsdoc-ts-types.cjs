/**
 * JSDoc plugin for `npm run docs`: the sources use TypeScript-style type expressions in some tags
 * (`{() => void}`, `{{a?: T}}`, `{(x: T) => U}`), which JSDoc's type parser (catharsis) rejects; JSDoc
 * then drops the tag's type and exits 1. This plugin keeps the sources as they are: before a comment
 * is parsed, each type that catharsis cannot read becomes `function`, `Object` or `*`, and the
 * original expression is kept in the tag's description, so the generated page still shows it.
 */
const catharsis = require("catharsis");

const TYPED_TAG = /@(param|arg|argument|returns?|type|typedef|property|prop|this|throws|exception|yields?|callback|member|var|const|constant|enum)(\s*)\{/g;

/** the end of a `{...}` type that starts at `start` (the `{`), counting nested braces; -1 when unbalanced */
function typeEnd(text, start) {
    let depth = 0;
    for (let i = start; i < text.length; i++) {
        if (text[i] === "{") depth++;
        else if (text[i] === "}" && --depth === 0) return i;
    }
    return -1;
}

function parses(type) {
    try {
        catharsis.parse(type, { jsdoc: true });
        return true;
    } catch {
        return false;
    }
}

/** a readable stand-in that catharsis accepts */
function standIn(type) {
    const t = type.trim().replace(/\s*\*\s*/g, " ").trim();
    if (/^\(?\s*\([^)]*\)\s*=>/.test(t) || /^\(\s*\(/.test(t)) return "function";
    if (t.startsWith("{")) return "Object";
    return "*";
}

/** the tag's name (for param-like tags) and where its description starts */
function afterName(text, from, tag) {
    if (!/^(param|arg|argument|property|prop|typedef|callback)$/.test(tag)) return from;
    const m = /^\s+(\[[^\]]*\]|[^\s]+)/.exec(text.slice(from));
    return m ? from + m[0].length : from;
}

function rewrite(comment) {
    let out = "";
    let last = 0;
    TYPED_TAG.lastIndex = 0;
    let m;
    while ((m = TYPED_TAG.exec(comment))) {
        const open = m.index + m[0].length - 1;
        const close = typeEnd(comment, open);
        if (close < 0) break;
        const type = comment.slice(open + 1, close);
        TYPED_TAG.lastIndex = close + 1;
        if (parses(type)) continue;
        const original = type.replace(/\s*\n\s*\*\s*/g, " ").trim();
        const descAt = afterName(comment, close + 1, m[1]);
        out += comment.slice(last, open) + "{" + standIn(type) + "}" + comment.slice(close + 1, descAt) + " (type `" + original + "`)";
        last = descAt;
    }
    return out + comment.slice(last);
}

exports.handlers = {
    jsdocCommentFound(e) {
        if (e.comment && e.comment.includes("{")) e.comment = rewrite(e.comment);
    },
};

exports.rewrite = rewrite; // for a quick check from node

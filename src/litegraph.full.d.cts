// Additional exports included in the node catalog bundles.
export * from './litegraph.cjs';
import { LGraphNode, LGraph } from './litegraph.cjs';
export declare class DOMSelector extends LGraphNode {}
export declare class DOMSelectorAll extends LGraphNode {}
export declare class HtmlNode extends LGraphNode {
    static size: [number, number];
    setHtml(html: string): void;
    htmlCreateElement(): void;
    htmlRefreshElement(): void;
    htmlRemoveElement(): void;
}
export declare class JsonViewerNode extends LGraphNode {
    static size: [number, number];
    setHtml(html: string): void;
    htmlCreateElement(): void;
    htmlRefreshElement(): void;
    htmlRemoveElement(): void;
}
export declare class HtmlEventListener extends LGraphNode {}
export declare class HtmlEventListenerRemove extends LGraphNode {}
export declare class HtmlValue extends LGraphNode {}
export declare class HtmlValueSet extends LGraphNode {}
export declare class HtmlCreateElement extends LGraphNode {}
export declare class HtmlAppendChild extends LGraphNode {}
export declare class HtmlRemoveElement extends LGraphNode {}
export declare class HtmlElementStyle extends LGraphNode {}
/** Texture objects are supplied by the host's optional LiteGL integration. */
export declare class LGraphTexture extends LGraphNode {
    static image_preview_size: number;
    static loadTextureCallback: ((name: string, options?: object) => unknown) | null;
    static UNDEFINED: 0;
    static PASS_THROUGH: 1;
    static COPY: 2;
    static LOW: 3;
    static HIGH: 4;
    static REUSE: 5;
    static DEFAULT: 2;
    static replaceCode(code: string, context: Record<string, string>): string;
    static getTexturesContainer(): Record<string, unknown>;
    static getTexture(name: string): unknown;
    static loadTexture(name: string, options?: object): unknown;
}
export declare class LGShaderContext {
    vs_template: string;
    fs_template: string;
    buffer_names: Record<string, string>;
    extra: Record<string, unknown>;
    clear(): void;
    addUniform(name: string, type: string, value?: unknown): void;
    addFunction(name: string, code: string): void;
    addCode(hook: string, code: string, destinations?: Record<string, unknown>): void;
    computeCodeBlocks(graph: LGraph, extraUniforms?: Record<string, string>): unknown;
}
export declare function valueToGLSL(value: number | ArrayLike<number>, type?: string, precision?: number): string;

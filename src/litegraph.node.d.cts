// The Node full bundle also exports the optional browser editor and extensions.
export * from './litegraph.full.cjs';
import { LGraph, LGraphNode, LGraphCanvas, ExtensionDefinition } from './litegraph.cjs';
export declare class Editor {
    constructor(containerId: string, options?: { skip_livemode?: boolean; skip_maximize?: boolean; miniwindow?: boolean; skip_persistence?: boolean });
    root: HTMLDivElement;
    canvas: HTMLCanvasElement;
    graph: LGraph;
    graphcanvas: LGraphCanvas;
    onPlayButton(): void;
    onPlayStepButton(): void;
    onLiveButton(): void;
    addMiniWindow(width: number, height: number): void;
    toggleMultiview(): void;
    goFullscreen(): void;
    exitFullscreen(): void;
    isFullscreen(): boolean;
}
/** Registers the built-in extension once; a canvas argument is attached to the extension registry. */
export declare function registerExtension_autoconnect(canvas?: LGraphCanvas): void;
export declare function registerExtension_keyhelper(canvas?: LGraphCanvas): void;
export declare function registerExtension_renamer(canvas?: LGraphCanvas): void;
export declare function registerExtension_quickConnect(canvas?: LGraphCanvas): void;
export declare function registerExtension_subgraphTools(canvas?: LGraphCanvas): void;
/** Extension definitions, for re-registering after LiteGraph.extensions.unregister(name). */
export declare const autoconnectExtension: ExtensionDefinition;
export declare const keyboardHelperExtension: ExtensionDefinition;
export declare const renamerExtension: ExtensionDefinition;
export declare const quickConnectExtension: ExtensionDefinition;
export declare const subgraphToolsExtension: ExtensionDefinition;
/** Connects nodes in order (each to the next through its first output with a compatible free input), one undo step; returns the links created. */
export declare function chainNodes(graph: LGraph, nodes: LGraphNode[]): number;
/** Ids of subgraph definitions in the root registry that no instance uses (directly or through another definition). */
export declare function unusedDefinitionIds(rootGraph: LGraph): string[];
/** Removes the unused subgraph definitions (one undo step); returns their ids. */
export declare function removeUnusedDefinitions(graph: LGraph): string[];

/** Optional ComfyUI workflow interoperability (schema 0.4 and 1). */
export declare const ComfyInterop: {
    COMFY_MODE: { ALWAYS: 0; ON_EVENT: 1; NEVER: 2; ON_TRIGGER: 3; BYPASS: 4 };
    CORE_NODE_FIELDS: string[];
    isComfyWorkflow(json: unknown): boolean;
    ensurePlaceholderType(type: string): boolean;
    importWorkflow(graph: LGraph, json: object, options?: { placeholders?: boolean }): {
        error: boolean;
        placeholderTypes: string[];
        bypassed: Array<number | string>;
    };
    toComfyMode(mode: number): number;
    exportWorkflow(graph: LGraph, options?: { version?: 0.4 | 1 }): Record<string, unknown>;
};

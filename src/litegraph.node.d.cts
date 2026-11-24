// The Node full bundle also exports the optional browser editor and extensions.
export * from './litegraph.full.cjs';
import { LGraph, LGraphNode, LGraphCanvas, ExtensionDefinition } from './litegraph.cjs';
export declare class Editor {
    constructor(containerId: string, options?: { skip_livemode?: boolean; skip_maximize?: boolean; miniwindow?: boolean; skip_persistence?: boolean; skip_autosave?: boolean; draft_storage?: DraftStorage; skip_palette?: boolean });
    autosave?: DraftAutosave;
    setupModifiedMarker(): void;
    setupAutosave(storage?: DraftStorage): void;
    offerDraftRestore(draft: Draft): HTMLDivElement;
    restoreDraft(draft: Draft): void;
    palette_panel?: NodePalettePanel | null;
    setupPalette(): void;
    togglePalette(open?: boolean): boolean;
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
export interface DraftStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export interface Draft { time: number; id: string; revision: number; doc: { nodes: object[]; [key: string]: unknown } }
/** The Editor's node palette panel (drag to the canvas, favourites, recent, preview). */
export declare class NodePalettePanel {
    constructor(graphcanvas: LGraphCanvas, container: HTMLElement);
    root: HTMLDivElement;
    query: string;
    favoritesOnly: boolean;
    render(): void;
    showPreview(type: string, anchor: HTMLElement): void;
    dispose(): void;
}
/** Draft autosave: the modified document is written after each change (debounced); markSaved removes it. */
export declare class DraftAutosave {
    static KEY: string;
    static defaultStorage(): DraftStorage | null;
    constructor(graph: LGraph, options?: { storage?: DraftStorage; key?: string; delay?: number });
    graph: LGraph;
    key: string;
    delay: number;
    storage: DraftStorage | null;
    start(): this;
    schedule(): void;
    save(force?: boolean): boolean;
    load(): Draft | null;
    clear(): void;
    dispose(): void;
}
/** Registers the built-in extension once; a canvas argument is attached to the extension registry. */
export declare function registerExtension_autoconnect(canvas?: LGraphCanvas): void;
export declare function registerExtension_keyhelper(canvas?: LGraphCanvas): void;
export declare function registerExtension_renamer(canvas?: LGraphCanvas): void;
export declare function registerExtension_quickConnect(canvas?: LGraphCanvas): void;
export declare function registerExtension_subgraphTools(canvas?: LGraphCanvas): void;
export declare function registerExtension_nodePacks(canvas?: LGraphCanvas): void;
export declare function registerExtension_viewTools(canvas?: LGraphCanvas): void;
export declare function registerExtension_nodePin(canvas?: LGraphCanvas): void;
export declare function registerExtension_graphStatus(canvas?: LGraphCanvas): void;
/** how each mode looks in the "modes" pin style */
export declare const NODE_PIN_MODE_LOOKS: Record<number, { shape: string; color: string; fill: boolean; mark?: string }>;
/** how long the pin glows after a run (ms) */
export declare const NODE_PIN_RUN_GLOW_MS: number;
/** the "modes" pin style */
export declare function modesPinStyle(node: LGraphNode, canvas?: LGraphCanvas): object;
/** sets the mode of nodes as one undo step; refusals shown by the canvas */
export declare function setNodesMode(ctx: { graph?: LGraph; canvas?: LGraphCanvas }, nodes: LGraphNode[], mode: number): boolean;
export declare const GRAPH_STATUS_SETTING: string;
/** the graph status chip text: the execution model's title */
export declare function graphStatusLabel(graph: LGraph): string;
export declare function drawGraphStatus(canvas: LGraphCanvas, ctx: CanvasRenderingContext2D): void;
/** the chip's menu: the models (current checked), then Start or Stop */
export declare function graphStatusMenu(canvas: LGraphCanvas): Array<object | null>;
export declare function isOverGraphStatus(canvas: LGraphCanvas, x: number, y: number): boolean;
/** true when a link style is in the setting LiteGraph.Canvas.LinkStyles */
export declare function isLinkStyleActive(name: string): boolean;
/** adds or removes a link style in the setting; returns whether it is now active */
export declare function toggleLinkStyle(name: string, on?: boolean): boolean;
/** Extension definitions, for re-registering after LiteGraph.extensions.unregister(name). */
export declare const autoconnectExtension: ExtensionDefinition;
export declare const keyboardHelperExtension: ExtensionDefinition;
export declare const renamerExtension: ExtensionDefinition;
export declare const quickConnectExtension: ExtensionDefinition;
export declare const subgraphToolsExtension: ExtensionDefinition;
export declare const nodePacksExtension: ExtensionDefinition;
export declare const viewToolsExtension: ExtensionDefinition;
export declare const nodePinExtension: ExtensionDefinition;
export declare const graphStatusExtension: ExtensionDefinition;
/** Shows the missing-nodes report of a graph in a canvas panel; null without DOM or when nothing is missing. */
export declare function showMissingNodesPanel(canvas: LGraphCanvas, graph?: LGraph, report?: object[]): HTMLElement | null;
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

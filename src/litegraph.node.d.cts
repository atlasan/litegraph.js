// The Node full bundle also exports the optional browser editor and extensions.
export * from './litegraph.full.cjs';
import { LGraph, LGraphCanvas } from './litegraph.cjs';
export declare class Editor {
    constructor(containerId: string, options?: { skip_livemode?: boolean; skip_maximize?: boolean; miniwindow?: boolean });
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
export declare function registerExtension_autoconnect(canvas: LGraphCanvas): void;
export declare function registerExtension_keyhelper(canvas: LGraphCanvas): void;
export declare function registerExtension_renamer(canvas: LGraphCanvas): void;

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

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

# LiteGraph.js - AUTOMATED Comprehensive Project Analysis by AGENT

## Overview

LiteGraph.js is a powerful, lightweight node-based visual programming library for creating interactive flow graphs in web browsers. This analysis provides an automated comprehensive examination of the project's architecture, components, and capabilities.

## Project Structure

### Core Architecture

The project follows a modular architecture with clear separation of concerns:

```
src/
├── litegraph.js          # Main library entry point and core utilities
├── lgraph.js             # Graph container and execution engine
├── lgraphnode.js         # Base node class and node management
├── lgraphcanvas.js       # Canvas rendering and interaction system
├── lgraphgroup.js        # Node grouping functionality
├── llink.js              # Connection/link management
├── subgraph.js           # Nested graph support
├── contextmenu.js        # Context menu system
├── dragandscale.js       # Canvas navigation utilities
├── curveeditor.js        # Curve editing widgets
├── callbackhandler.js    # Event handling system
├── librarymanager.js     # Node library management
└── nodes/                # Built-in node implementations
    ├── base.js           # Basic utility nodes
    ├── math.js           # Mathematical operations
    ├── logic.js          # Boolean logic operations
    ├── interface.js      # UI widgets and controls
    ├── graphics.js       # Canvas and WebGL graphics
    ├── audio.js          # Web Audio API nodes
    ├── events.js         # Event handling nodes
    └── ...
```

### Key Features

- **Canvas-based Rendering**: Uses HTML5 Canvas for high-performance 2D rendering
- **Modular Node System**: Extensible architecture for custom node types
- **Real-time Execution**: Live graph execution with data flow
- **Interactive Editor**: Full-featured visual editor with drag-and-drop
- **Cross-platform**: Works in browsers and Node.js environments

## Analysis Documents

This directory contains comprehensive analysis of the LiteGraph.js codebase, validated against actual source files:

### Core System Analysis
- **[Core Architecture](core-architecture.md)** - Main classes (LiteGraph, LGraph, LGraphNode, LGraphCanvas) and system design ✓ Validated
- **[Node System](node-system.md)** - Built-in node types in `src/nodes/` and extensibility patterns ✓ Validated
- **[Canvas Rendering](canvas-rendering.md)** - HTML5 Canvas rendering pipeline and visual system ✓ Validated
- **[Build System](build-system.md)** - Python build script (`build.py`) and 6 distribution targets ✓ Validated
- **[Editor Functionality](editor-functionality.md)** - UI components and editor features (`litegraph-editor.js`) ✓ Validated

### Additional Documentation
- **[Testing Framework](testing-framework.md)** - Test structure and coverage analysis
- **[Cross-Platform Integration](cross-platform-integration.md)** - Node.js and browser compatibility
- **[Library Management Guide](library-management-guide.md)** - Dependency and extension management

## Quick Start

### Basic Usage

```javascript
import { LiteGraph } from "./src/litegraph.js";
import { LGraph } from "./src/lgraph.js";
import { LGraphCanvas } from "./src/lgraphcanvas.js";

// Create a graph
const graph = new LGraph();

// Create a canvas to render the graph
const canvas = document.getElementById("mycanvas");
const graphcanvas = new LGraphCanvas(canvas, graph);

// Start the graph execution
graph.start();
```

### Creating Custom Nodes

```javascript
class MyCustomNode {
    static title = "My Node";
    static desc = "A custom node example";
    
    constructor() {
        this.addInput("input", "number");
        this.addOutput("output", "number");
        this.addProperty("multiplier", 1.0);
    }
    
    onExecute() {
        const input = this.getInputData(0);
        if (input != null) {
            this.setOutputData(0, input * this.properties.multiplier);
        }
    }
}

LiteGraph.registerNodeType("custom/my_node", MyCustomNode);
```

## Version Information

- **Current Version**: 0.10.10
- **License**: MIT
- **Repository**: https://github.com/atlasan/litegraph.js
- **NPM Package**: @litegraph/litegraph

## Build Variants

LiteGraph.js provides 6 build configurations via `build.py`:

### Browser Builds
- **litegraph.js** - Core library + all node types
- **litegraph.mini.js** - Minified core + nodes
- **litegraph.full.js** - Core + nodes + editor + extensions
- **litegraph.full.mini.js** - Minified full build
- **litegraph.core.js** - Core library only (no nodes)

### Node.js Builds
- **litegraph_nodejs.full.js** - Full build with Node.js-specific nodes
- **CommonJS (.cjs)** versions for all builds

## Dependencies

LiteGraph.js is designed to be dependency-free for the core functionality. Development dependencies include:

- ESLint for code quality
- Jest for testing
- JSDoc for documentation generation
- UglifyJS for minification
- Express for development server

This analysis was generated through comprehensive code examination and provides detailed insights into every aspect of the LiteGraph.js project.
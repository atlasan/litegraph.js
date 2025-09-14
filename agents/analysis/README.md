# LiteGraph.js - Comprehensive Project Analysis

## Overview

LiteGraph.js is a powerful, lightweight node-based visual programming library for creating interactive flow graphs in web browsers. This analysis provides a comprehensive examination of the project's architecture, components, and capabilities.

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
- **TypeScript Support**: Complete type definitions included
- **Cross-platform**: Works in browsers and Node.js environments
- **Customizable Themes**: Flexible styling and appearance options

## Analysis Documents

This analysis is organized into the following detailed documents:

1. **[Core Architecture](./core-architecture.md)** - Deep dive into the main classes and their relationships
2. **[Node System](./node-system.md)** - Comprehensive guide to the node architecture and built-in nodes
3. **[Canvas Rendering](./canvas-rendering.md)** - Analysis of the rendering system and visual components
4. **[Editor Features](./editor-features.md)** - Documentation of the interactive editor capabilities
5. **[Build System](./build-system.md)** - Overview of the build process and distribution
6. **[API Reference](./api-reference.md)** - Complete API documentation and usage examples
7. **[Extension Points](./extension-points.md)** - Guide for extending and customizing LiteGraph

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

The project provides multiple build variants:

- **litegraph.js** - Core library with built-in nodes
- **litegraph.mini.js** - Minified version
- **litegraph.full.js** - Complete package with editor and extensions
- **litegraph.core.js** - Core library only (no built-in nodes)
- **litegraph_nodejs.full.js** - Node.js compatible version

## Dependencies

LiteGraph.js is designed to be dependency-free for the core functionality. Development dependencies include:

- ESLint for code quality
- Jest for testing
- JSDoc for documentation generation
- UglifyJS for minification
- Express for development server

This analysis was generated through comprehensive code examination and provides detailed insights into every aspect of the LiteGraph.js project.
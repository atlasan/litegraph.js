# Cross-Platform Integration Guide

## Overview

LiteGraph.js is designed as a cross-platform visual programming framework that runs seamlessly across multiple environments including browsers, Node.js, Unity (C#), and mobile platforms. This guide documents the architecture, implementation patterns, and integration strategies for each supported platform.

## Platform Support Matrix

| Platform | Status | Runtime | Build Target | Notes |
|----------|--------|---------|--------------|-------|
| **Browser** | ✅ Full Support | ES6 Modules | `litegraph.js` | Primary platform |
| **Node.js** | ✅ Full Support | CommonJS | `litegraph.node.js` | Server-side execution |
| **Unity C#** | ⚠️ Partial Support | .NET | Custom | Subset implementation |
| **Mobile Web** | ✅ Full Support | ES6 Modules | `litegraph.js` | Touch optimized |
| **Electron** | ✅ Full Support | ES6/CommonJS | Both targets | Desktop apps |
| **Bun** | ✅ Experimental | ES6 Modules | `litegraph.js` | Alternative runtime |

## Architecture Overview

### Runtime Detection System

**File**: `src/global.js`

LiteGraph automatically detects the execution environment and adapts accordingly:

```javascript
// Environment detection
if (typeof window !== "undefined") {
    // Browser environment
    globalThis.LiteGraph = LiteGraph;
} else if (typeof global !== "undefined") {
    // Node.js environment
    global.LiteGraph = LiteGraph;
} else if (typeof self !== "undefined") {
    // Web Worker environment
    self.LiteGraph = LiteGraph;
}
```

### Platform-Specific Adaptations

#### 1. Module System Compatibility

**Browser (ES6 Modules)**:
```javascript
// Native ES6 import/export
import { LiteGraph } from './litegraph.js';
export { LGraphNode } from './lgraphnode.js';
```

**Node.js (CommonJS)**:
```javascript
// Build system converts to CommonJS
const { LiteGraph } = require('./litegraph.node.js');
module.exports = { LGraphNode };
```

#### 2. Canvas and Rendering

**Browser**:
- Native HTML5 Canvas API
- WebGL support for 3D nodes
- HiDPI/Retina display handling

**Node.js**:
- Canvas polyfill via `node-canvas`
- Headless rendering capabilities
- Image export functionality

**Unity C#**:
- Custom rendering pipeline
- Unity UI integration
- Native performance optimization

## Platform-Specific Implementation

### 1. Browser Platform

#### Features
- **Full Feature Set**: Complete LiteGraph functionality
- **Interactive Editor**: Visual node editor with drag-and-drop
- **Real-time Execution**: Live graph processing
- **Extension System**: Full extension support
- **WebGL Integration**: 3D graphics capabilities

#### Integration Example
```html
<!DOCTYPE html>
<html>
<head>
    <script type="module" src="litegraph.js"></script>
    <link rel="stylesheet" href="litegraph.css">
</head>
<body>
    <canvas id="mycanvas" width="800" height="600"></canvas>
    <script type="module">
        import { LiteGraph, LGraph, LGraphCanvas } from './litegraph.js';
        
        const graph = new LGraph();
        const canvas = new LGraphCanvas("#mycanvas", graph);
        
        // Add nodes and start execution
        const node = LiteGraph.createNode("basic/const");
        graph.add(node);
        graph.start();
    </script>
</body>
</html>
```

#### Mobile Web Optimizations

**File**: `editor/editor_mobile.html`

- **Touch Interface**: Optimized for touch interactions
- **Responsive Design**: Adaptive layout for different screen sizes
- **Performance**: Reduced feature set for mobile performance
- **Debug Console**: HTML-based console for mobile debugging

```css
/* Mobile-specific styles */
.console-container {
    min-width: 200px;
    background: rgba(255,255,255,0.1);
    position: fixed;
    top: 38px;
    left: 0;
    overflow: auto;
    height: calc(100% - 38px);
}

.console-container.small {
    max-width: 30%;
}
```

### 2. Node.js Platform

#### Features
- **Headless Execution**: Server-side graph processing
- **File System Access**: Direct file operations
- **Network Integration**: HTTP/WebSocket servers
- **Process Management**: System integration capabilities
- **CLI Tools**: Command-line graph execution

#### Server Integration

**File**: `headless/server.js`

```javascript
const express = require('express');
const { Server } = require('socket.io');
const { LiteGraph, LGraph } = require('../build/litegraph.node.js');

const app = express();
const server = require('http').createServer(app);
const io = new Server(server);

// Graph execution endpoint
app.post('/execute', (req, res) => {
    const graph = new LGraph();
    graph.configure(req.body.graphData);
    
    // Execute graph
    graph.runStep();
    
    res.json({
        success: true,
        outputs: graph.getOutputs()
    });
});

// WebSocket for real-time execution
io.on('connection', (socket) => {
    const graph = new LGraph();
    
    socket.on('graph-update', (data) => {
        graph.configure(data);
        graph.runStep();
        socket.emit('graph-result', graph.getOutputs());
    });
});

server.listen(3000, () => {
    console.log('LiteGraph server running on port 3000');
});
```

#### Node.js-Specific Nodes

**File**: `src/nodes/nodejs_only/nodejs_network.js`

```javascript
// File system operations
class FileRead extends LGraphNode {
    constructor() {
        super();
        this.addInput("path", "string");
        this.addOutput("content", "string");
    }
    
    onExecute() {
        const fs = require('fs');
        const path = this.getInputData(0);
        if (path) {
            try {
                const content = fs.readFileSync(path, 'utf8');
                this.setOutputData(0, content);
            } catch (error) {
                console.error('File read error:', error);
            }
        }
    }
}

LiteGraph.registerNodeType("nodejs/file_read", FileRead);
```

### 3. Unity C# Platform

#### Architecture

**Location**: `csharp/` directory

The Unity implementation provides a subset of LiteGraph functionality optimized for game development:

```csharp
// Core graph system
public class LiteGraph : MonoBehaviour
{
    public List<LGraphNode> nodes = new List<LGraphNode>();
    public List<LGraphConnection> connections = new List<LGraphConnection>();
    
    public void ExecuteGraph()
    {
        foreach (var node in nodes)
        {
            if (node.enabled)
            {
                node.OnExecute();
            }
        }
    }
}

// Base node class
public abstract class LGraphNode : MonoBehaviour
{
    public List<LGraphInput> inputs = new List<LGraphInput>();
    public List<LGraphOutput> outputs = new List<LGraphOutput>();
    
    public abstract void OnExecute();
    
    protected T GetInputValue<T>(int index)
    {
        if (index < inputs.Count && inputs[index].connection != null)
        {
            return inputs[index].connection.GetValue<T>();
        }
        return default(T);
    }
    
    protected void SetOutputValue<T>(int index, T value)
    {
        if (index < outputs.Count)
        {
            outputs[index].SetValue(value);
        }
    }
}
```

#### Unity Integration Features

1. **GameObject Integration**: Nodes as Unity GameObjects
2. **Inspector Support**: Visual node configuration
3. **Serialization**: Unity's serialization system
4. **Performance**: Native C# execution speed
5. **Unity APIs**: Access to Unity-specific functionality

#### Supported Node Types

- **Math Nodes**: Basic mathematical operations
- **Logic Nodes**: Boolean logic and conditions
- **Unity Nodes**: GameObject manipulation, Transform operations
- **Event Nodes**: Unity event system integration
- **Animation Nodes**: Unity Animation system

### 4. Electron Platform

#### Integration Strategy

```javascript
// Main process (main.js)
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        }
    });
    
    mainWindow.loadFile('editor/index.html');
}

app.whenReady().then(createWindow);

// Renderer process can use both browser and Node.js APIs
const { LiteGraph } = require('./build/litegraph.node.js');
const fs = require('fs');

// File operations with native dialogs
function saveGraph(graph) {
    const { dialog } = require('electron').remote;
    const result = dialog.showSaveDialogSync({
        filters: [{ name: 'LiteGraph', extensions: ['json'] }]
    });
    
    if (result) {
        fs.writeFileSync(result, JSON.stringify(graph.serialize()));
    }
}
```

## Build System Integration

### Platform-Specific Builds

**File**: `build.py`

The Python build system generates platform-specific distributions:

```python
# Build targets
BUILD_TARGETS = {
    'core': {
        'files': ['litegraph.js', 'lgraphnode.js', 'lgraph.js'],
        'output': 'litegraph.core.js',
        'platform': 'browser'
    },
    'full': {
        'files': ['litegraph.js', 'nodes/*.js'],
        'output': 'litegraph.js',
        'platform': 'browser'
    },
    'node': {
        'files': ['litegraph.js', 'nodes/*.js'],
        'output': 'litegraph.node.js',
        'platform': 'nodejs',
        'transform': 'commonjs'
    }
}

def build_for_platform(target):
    config = BUILD_TARGETS[target]
    
    # Platform-specific transformations
    if config.get('transform') == 'commonjs':
        convert_to_commonjs(config['files'])
    
    # Concatenate and minify
    concatenate_files(config['files'], config['output'])
    
    if config['platform'] == 'browser':
        add_browser_polyfills(config['output'])
    elif config['platform'] == 'nodejs':
        add_nodejs_exports(config['output'])
```

### ES6 to CommonJS Conversion

```python
def convert_to_commonjs(content):
    # Convert ES6 imports to require()
    content = re.sub(
        r'import\s+{([^}]+)}\s+from\s+["\']([^"\']+)["\'];',
        r'const {\1} = require("\2");',
        content
    )
    
    # Convert ES6 exports to module.exports
    content = re.sub(
        r'export\s+{([^}]+)};',
        r'module.exports = {\1};',
        content
    )
    
    return content
```

## Cross-Platform Development Guidelines

### 1. Code Compatibility

#### Platform Detection
```javascript
// Use runtime detection for platform-specific code
function getPlatform() {
    if (typeof window !== 'undefined') return 'browser';
    if (typeof global !== 'undefined') return 'nodejs';
    if (typeof importScripts !== 'undefined') return 'webworker';
    return 'unknown';
}

// Platform-specific implementations
function createCanvas(width, height) {
    const platform = getPlatform();
    
    switch (platform) {
        case 'browser':
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            return canvas;
            
        case 'nodejs':
            const { createCanvas } = require('canvas');
            return createCanvas(width, height);
            
        default:
            throw new Error(`Canvas not supported on ${platform}`);
    }
}
```

#### Feature Detection
```javascript
// Check for specific APIs before using
function hasWebGL() {
    if (typeof WebGLRenderingContext === 'undefined') return false;
    
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
}

function hasFileSystem() {
    return typeof require !== 'undefined' && 
           typeof require('fs') !== 'undefined';
}
```

### 2. Node Development Best Practices

#### Cross-Platform Node Template
```javascript
class CrossPlatformNode extends LGraphNode {
    constructor() {
        super();
        this.addInput("input", "*");
        this.addOutput("output", "*");
        
        // Platform-specific initialization
        this.initializePlatform();
    }
    
    initializePlatform() {
        const platform = this.getPlatform();
        
        switch (platform) {
            case 'browser':
                this.initializeBrowser();
                break;
            case 'nodejs':
                this.initializeNodeJS();
                break;
            case 'unity':
                this.initializeUnity();
                break;
        }
    }
    
    onExecute() {
        const input = this.getInputData(0);
        const result = this.processData(input);
        this.setOutputData(0, result);
    }
    
    // Platform-specific processing
    processData(data) {
        const platform = this.getPlatform();
        
        if (platform === 'browser' && this.useWebGL) {
            return this.processWithWebGL(data);
        } else if (platform === 'nodejs' && this.useNative) {
            return this.processWithNative(data);
        } else {
            return this.processGeneric(data);
        }
    }
}
```

### 3. Testing Across Platforms

#### Test Configuration
```javascript
// Jest configuration for cross-platform testing
module.exports = {
    testEnvironment: 'jsdom', // Browser simulation
    setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
    testMatch: [
        '<rootDir>/test/**/*.test.js',
        '<rootDir>/test/platforms/**/*.test.js'
    ],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/platforms/unity/**', // Exclude Unity C# files
    ]
};
```

#### Platform-Specific Tests
```javascript
describe('Cross-platform compatibility', () => {
    test('Node.js environment', () => {
        // Mock Node.js environment
        global.window = undefined;
        global.global = global;
        
        const node = new CrossPlatformNode();
        expect(node.getPlatform()).toBe('nodejs');
    });
    
    test('Browser environment', () => {
        // Mock browser environment
        global.window = { document: {} };
        
        const node = new CrossPlatformNode();
        expect(node.getPlatform()).toBe('browser');
    });
});
```

## Deployment Strategies

### 1. Web Deployment
- **CDN Distribution**: Global content delivery
- **Module Bundlers**: Webpack, Rollup, Vite integration
- **Progressive Web Apps**: Offline capability

### 2. Node.js Deployment
- **NPM Package**: Standard Node.js distribution
- **Docker Containers**: Containerized deployment
- **Serverless Functions**: AWS Lambda, Vercel integration

### 3. Desktop Deployment
- **Electron Apps**: Cross-platform desktop applications
- **Tauri**: Rust-based desktop framework
- **Native Wrappers**: Platform-specific packaging

### 4. Mobile Deployment
- **Progressive Web Apps**: Mobile web applications
- **Cordova/PhoneGap**: Hybrid mobile apps
- **React Native**: Native mobile integration

## Performance Considerations

### Platform-Specific Optimizations

1. **Browser**: WebGL acceleration, Web Workers
2. **Node.js**: Native modules, clustering
3. **Unity**: Native C# performance, job system
4. **Mobile**: Reduced feature sets, touch optimization

### Memory Management

```javascript
// Platform-aware memory management
class PlatformOptimizedGraph extends LGraph {
    constructor() {
        super();
        this.setupPlatformOptimizations();
    }
    
    setupPlatformOptimizations() {
        const platform = this.getPlatform();
        
        if (platform === 'mobile') {
            // Reduce memory usage for mobile
            this.max_nodes = 50;
            this.enable_gc = true;
        } else if (platform === 'nodejs') {
            // Optimize for server performance
            this.enable_clustering = true;
            this.worker_threads = true;
        }
    }
}
```

## Future Platform Support

### Planned Platforms
1. **WebAssembly**: High-performance execution
2. **Deno**: Modern JavaScript runtime
3. **React Native**: Native mobile development
4. **Flutter**: Cross-platform UI framework

### Integration Roadmap
1. **Phase 1**: Improve Unity C# implementation
2. **Phase 2**: Add WebAssembly compilation target
3. **Phase 3**: Develop React Native bindings
4. **Phase 4**: Create Flutter plugin

This comprehensive cross-platform integration ensures LiteGraph.js can be deployed and executed across diverse environments while maintaining consistent functionality and performance.
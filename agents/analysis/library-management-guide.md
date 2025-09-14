# Library Management Guide

## Overview

LiteGraph.js features a sophisticated library management system that handles dynamic loading, registration, and integration of external JavaScript libraries. This system enables seamless integration with popular libraries like Three.js, Socket.IO, OSC.js, and custom libraries while maintaining cross-platform compatibility.

## Architecture

### LibraryManager Class

**File**: `src/library-manager.js`

The `LibraryManager` class provides centralized library management with the following capabilities:

- **Dynamic Loading**: Runtime library loading from CDN or local sources
- **Version Control**: Specific version targeting and compatibility checking
- **Environment Detection**: Browser vs Node.js library handling
- **Dependency Resolution**: Automatic dependency management
- **Global Object Management**: Namespace handling and conflict resolution

```javascript
class LibraryManager {
    constructor() {
        this.libraries = new Map();
        this.loadedLibraries = new Set();
        this.loadingPromises = new Map();
        this.globalObjects = new Map();
    }
    
    // Register a library for dynamic loading
    registerLibrary(name, config) {
        this.libraries.set(name, {
            name,
            version: config.version,
            urls: config.urls || [],
            globalName: config.globalName,
            dependencies: config.dependencies || [],
            nodeModule: config.nodeModule,
            checkFunction: config.checkFunction,
            onLoad: config.onLoad
        });
    }
    
    // Load library dynamically
    async loadLibrary(name) {
        if (this.loadedLibraries.has(name)) {
            return this.globalObjects.get(name);
        }
        
        if (this.loadingPromises.has(name)) {
            return this.loadingPromises.get(name);
        }
        
        const promise = this._loadLibraryInternal(name);
        this.loadingPromises.set(name, promise);
        
        try {
            const result = await promise;
            this.loadedLibraries.add(name);
            return result;
        } finally {
            this.loadingPromises.delete(name);
        }
    }
}
```

### Library Registration System

#### 1. Built-in Library Configurations

**Three.js Integration**:
```javascript
LiteGraph.LibraryManager.registerLibrary('threejs', {
    version: '0.158.0',
    urls: [
        'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.158.0/three.min.js',
        'https://unpkg.com/three@0.158.0/build/three.min.js'
    ],
    globalName: 'THREE',
    nodeModule: 'three',
    checkFunction: () => typeof THREE !== 'undefined',
    onLoad: (THREE) => {
        // Initialize Three.js specific nodes
        LiteGraph.registerNodeType('3d/scene', Scene3D);
        LiteGraph.registerNodeType('3d/mesh', Mesh3D);
        LiteGraph.registerNodeType('3d/camera', Camera3D);
    }
});
```

**Socket.IO Integration**:
```javascript
LiteGraph.LibraryManager.registerLibrary('socketio', {
    version: '4.7.2',
    urls: [
        'https://cdn.socket.io/4.7.2/socket.io.min.js'
    ],
    globalName: 'io',
    nodeModule: 'socket.io-client',
    checkFunction: () => typeof io !== 'undefined',
    onLoad: (io) => {
        // Register Socket.IO nodes
        LiteGraph.registerNodeType('network/socket_emit', SocketEmit);
        LiteGraph.registerNodeType('network/socket_on', SocketOn);
    }
});
```

**OSC.js Integration**:
```javascript
LiteGraph.LibraryManager.registerLibrary('osc', {
    version: '2.4.1',
    urls: [
        'https://unpkg.com/osc-js@2.4.1/dist/osc.min.js'
    ],
    globalName: 'OSC',
    nodeModule: 'osc-js',
    dependencies: ['websocket'],
    checkFunction: () => typeof OSC !== 'undefined',
    onLoad: (OSC) => {
        // Register OSC nodes
        LiteGraph.registerNodeType('osc/send', OSCSend);
        LiteGraph.registerNodeType('osc/receive', OSCReceive);
    }
});
```

#### 2. Custom Library Registration

```javascript
// Register a custom library
LiteGraph.LibraryManager.registerLibrary('myLibrary', {
    version: '1.0.0',
    urls: [
        'https://cdn.example.com/my-library.js',
        '/local/path/my-library.js'
    ],
    globalName: 'MyLib',
    nodeModule: 'my-library',
    dependencies: ['jquery'],
    checkFunction: () => typeof MyLib !== 'undefined' && MyLib.version === '1.0.0',
    onLoad: (MyLib) => {
        // Custom initialization
        MyLib.configure({
            apiKey: 'your-api-key',
            debug: LiteGraph.debug
        });
        
        // Register custom nodes
        LiteGraph.registerNodeType('custom/my_node', MyCustomNode);
    }
});
```

## Platform-Specific Loading

### Browser Environment

#### Dynamic Script Loading
```javascript
class BrowserLibraryLoader {
    async loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load ${url}`));
            document.head.appendChild(script);
        });
    }
    
    async loadLibrary(config) {
        // Try multiple URLs until one succeeds
        for (const url of config.urls) {
            try {
                await this.loadScript(url);
                
                // Verify library loaded correctly
                if (config.checkFunction && config.checkFunction()) {
                    const globalObj = window[config.globalName];
                    if (config.onLoad) {
                        config.onLoad(globalObj);
                    }
                    return globalObj;
                }
            } catch (error) {
                console.warn(`Failed to load from ${url}:`, error);
                continue;
            }
        }
        
        throw new Error(`Failed to load library ${config.name}`);
    }
}
```

#### ES6 Module Loading
```javascript
class ModuleLibraryLoader {
    async loadModule(url) {
        try {
            const module = await import(url);
            return module;
        } catch (error) {
            throw new Error(`Failed to import module from ${url}: ${error.message}`);
        }
    }
    
    async loadLibrary(config) {
        for (const url of config.urls) {
            try {
                const module = await this.loadModule(url);
                
                // Handle different export patterns
                const library = module.default || module[config.globalName] || module;
                
                if (config.onLoad) {
                    config.onLoad(library);
                }
                
                return library;
            } catch (error) {
                console.warn(`Failed to load module from ${url}:`, error);
                continue;
            }
        }
        
        throw new Error(`Failed to load module ${config.name}`);
    }
}
```

### Node.js Environment

#### NPM Module Loading
```javascript
class NodeLibraryLoader {
    async loadLibrary(config) {
        if (!config.nodeModule) {
            throw new Error(`No Node.js module specified for ${config.name}`);
        }
        
        try {
            // Try to require the module
            const library = require(config.nodeModule);
            
            // Handle different module export patterns
            const actualLibrary = library.default || library;
            
            if (config.onLoad) {
                config.onLoad(actualLibrary);
            }
            
            return actualLibrary;
        } catch (error) {
            if (error.code === 'MODULE_NOT_FOUND') {
                throw new Error(
                    `Module ${config.nodeModule} not found. ` +
                    `Install with: npm install ${config.nodeModule}`
                );
            }
            throw error;
        }
    }
}
```

## Library-Specific Node Implementations

### Three.js Nodes

**File**: `src/nodes/threejs.js`

```javascript
// 3D Scene Node
class Scene3D extends LGraphNode {
    constructor() {
        super();
        this.addOutput("scene", "THREE.Scene");
        this.addProperty("background_color", "#000000");
        
        this.scene = null;
    }
    
    async onStart() {
        // Ensure Three.js is loaded
        const THREE = await LiteGraph.LibraryManager.loadLibrary('threejs');
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.properties.background_color);
    }
    
    onExecute() {
        if (this.scene) {
            this.setOutputData(0, this.scene);
        }
    }
    
    onPropertyChanged(name, value) {
        if (name === "background_color" && this.scene) {
            this.scene.background.setHex(value.replace('#', '0x'));
        }
    }
}

// 3D Mesh Node
class Mesh3D extends LGraphNode {
    constructor() {
        super();
        this.addInput("geometry", "THREE.Geometry");
        this.addInput("material", "THREE.Material");
        this.addOutput("mesh", "THREE.Mesh");
        
        this.mesh = null;
    }
    
    async onStart() {
        const THREE = await LiteGraph.LibraryManager.loadLibrary('threejs');
        this.THREE = THREE;
    }
    
    onExecute() {
        const geometry = this.getInputData(0);
        const material = this.getInputData(1);
        
        if (geometry && material && this.THREE) {
            if (!this.mesh) {
                this.mesh = new this.THREE.Mesh(geometry, material);
            } else {
                this.mesh.geometry = geometry;
                this.mesh.material = material;
            }
            
            this.setOutputData(0, this.mesh);
        }
    }
}

// Register nodes after Three.js loads
LiteGraph.LibraryManager.onLibraryLoad('threejs', (THREE) => {
    LiteGraph.registerNodeType("3d/scene", Scene3D);
    LiteGraph.registerNodeType("3d/mesh", Mesh3D);
    LiteGraph.registerNodeType("3d/box_geometry", BoxGeometry3D);
    LiteGraph.registerNodeType("3d/material_basic", BasicMaterial3D);
});
```

### Socket.IO Nodes

**File**: `src/nodes/libraries/socketio.js`

```javascript
// Socket Connection Node
class SocketConnection extends LGraphNode {
    constructor() {
        super();
        this.addOutput("socket", "socket");
        this.addProperty("url", "http://localhost:3000");
        this.addProperty("auto_connect", true);
        
        this.socket = null;
    }
    
    async onStart() {
        const io = await LiteGraph.LibraryManager.loadLibrary('socketio');
        
        if (this.properties.auto_connect) {
            this.connect();
        }
    }
    
    connect() {
        if (this.socket) {
            this.socket.disconnect();
        }
        
        this.socket = io(this.properties.url);
        
        this.socket.on('connect', () => {
            console.log('Socket connected');
            this.boxcolor = "#0F0";
        });
        
        this.socket.on('disconnect', () => {
            console.log('Socket disconnected');
            this.boxcolor = "#F00";
        });
    }
    
    onExecute() {
        this.setOutputData(0, this.socket);
    }
    
    onAction(action, param) {
        if (action === "connect") {
            this.connect();
        } else if (action === "disconnect" && this.socket) {
            this.socket.disconnect();
        }
    }
}

// Socket Emit Node
class SocketEmit extends LGraphNode {
    constructor() {
        super();
        this.addInput("socket", "socket");
        this.addInput("event", "string");
        this.addInput("data", "*");
        this.addInput("trigger", LiteGraph.ACTION);
        
        this.addProperty("event_name", "message");
    }
    
    onAction(action, param) {
        if (action === "trigger") {
            this.emit();
        }
    }
    
    emit() {
        const socket = this.getInputData(0);
        const event = this.getInputData(1) || this.properties.event_name;
        const data = this.getInputData(2);
        
        if (socket && socket.connected && event) {
            socket.emit(event, data);
            console.log(`Emitted ${event}:`, data);
        }
    }
}

// Socket On Node
class SocketOn extends LGraphNode {
    constructor() {
        super();
        this.addInput("socket", "socket");
        this.addInput("event", "string");
        this.addOutput("data", "*");
        this.addOutput("trigger", LiteGraph.EVENT);
        
        this.addProperty("event_name", "message");
        this.currentSocket = null;
        this.listener = null;
    }
    
    onExecute() {
        const socket = this.getInputData(0);
        const event = this.getInputData(1) || this.properties.event_name;
        
        if (socket !== this.currentSocket || event !== this.currentEvent) {
            this.setupListener(socket, event);
        }
    }
    
    setupListener(socket, event) {
        // Remove old listener
        if (this.currentSocket && this.listener) {
            this.currentSocket.off(this.currentEvent, this.listener);
        }
        
        this.currentSocket = socket;
        this.currentEvent = event;
        
        if (socket && event) {
            this.listener = (data) => {
                this.setOutputData(0, data);
                this.triggerSlot(1, data);
            };
            
            socket.on(event, this.listener);
        }
    }
}

// Register Socket.IO nodes
LiteGraph.LibraryManager.onLibraryLoad('socketio', (io) => {
    LiteGraph.registerNodeType("network/socket_connection", SocketConnection);
    LiteGraph.registerNodeType("network/socket_emit", SocketEmit);
    LiteGraph.registerNodeType("network/socket_on", SocketOn);
});
```

### OSC.js Integration

**File**: `src/nodes/libraries/osc.js`

```javascript
// OSC Client Node
class OSCClient extends LGraphNode {
    constructor() {
        super();
        this.addOutput("client", "osc_client");
        this.addProperty("host", "localhost");
        this.addProperty("port", 8080);
        this.addProperty("protocol", "ws");
        
        this.client = null;
    }
    
    async onStart() {
        const OSC = await LiteGraph.LibraryManager.loadLibrary('osc');
        
        const config = {
            type: 'ws',
            options: {
                host: this.properties.host,
                port: this.properties.port
            }
        };
        
        this.client = new OSC(config);
        
        this.client.on('open', () => {
            console.log('OSC Client connected');
            this.boxcolor = "#0F0";
        });
        
        this.client.on('close', () => {
            console.log('OSC Client disconnected');
            this.boxcolor = "#F00";
        });
        
        this.client.open();
    }
    
    onExecute() {
        this.setOutputData(0, this.client);
    }
}

// OSC Send Node
class OSCSend extends LGraphNode {
    constructor() {
        super();
        this.addInput("client", "osc_client");
        this.addInput("address", "string");
        this.addInput("value", "*");
        this.addInput("trigger", LiteGraph.ACTION);
        
        this.addProperty("address", "/test");
    }
    
    onAction(action, param) {
        if (action === "trigger") {
            this.send();
        }
    }
    
    send() {
        const client = this.getInputData(0);
        const address = this.getInputData(1) || this.properties.address;
        const value = this.getInputData(2);
        
        if (client && address) {
            const message = {
                address: address,
                args: value !== undefined ? [value] : []
            };
            
            client.send(message);
            console.log('OSC sent:', message);
        }
    }
}

// Register OSC nodes
LiteGraph.LibraryManager.onLibraryLoad('osc', (OSC) => {
    LiteGraph.registerNodeType("osc/client", OSCClient);
    LiteGraph.registerNodeType("osc/send", OSCSend);
    LiteGraph.registerNodeType("osc/receive", OSCReceive);
});
```

## Advanced Library Management

### Dependency Resolution

```javascript
class DependencyResolver {
    constructor(libraryManager) {
        this.libraryManager = libraryManager;
        this.loadOrder = new Map();
    }
    
    async resolveDependencies(libraryName) {
        const visited = new Set();
        const loading = new Set();
        const loadOrder = [];
        
        const visit = async (name) => {
            if (loading.has(name)) {
                throw new Error(`Circular dependency detected: ${name}`);
            }
            
            if (visited.has(name)) {
                return;
            }
            
            loading.add(name);
            
            const config = this.libraryManager.libraries.get(name);
            if (!config) {
                throw new Error(`Library not found: ${name}`);
            }
            
            // Visit dependencies first
            for (const dep of config.dependencies) {
                await visit(dep);
            }
            
            loading.delete(name);
            visited.add(name);
            loadOrder.push(name);
        };
        
        await visit(libraryName);
        return loadOrder;
    }
    
    async loadWithDependencies(libraryName) {
        const loadOrder = await this.resolveDependencies(libraryName);
        
        for (const name of loadOrder) {
            await this.libraryManager.loadLibrary(name);
        }
        
        return this.libraryManager.getLibrary(libraryName);
    }
}
```

### Version Management

```javascript
class VersionManager {
    constructor() {
        this.versionCache = new Map();
    }
    
    parseVersion(versionString) {
        const parts = versionString.split('.').map(Number);
        return {
            major: parts[0] || 0,
            minor: parts[1] || 0,
            patch: parts[2] || 0,
            string: versionString
        };
    }
    
    isCompatible(required, available) {
        const req = this.parseVersion(required);
        const avail = this.parseVersion(available);
        
        // Major version must match
        if (req.major !== avail.major) {
            return false;
        }
        
        // Available version must be >= required version
        if (avail.minor < req.minor) {
            return false;
        }
        
        if (avail.minor === req.minor && avail.patch < req.patch) {
            return false;
        }
        
        return true;
    }
    
    validateLibraryVersion(config, actualLibrary) {
        if (!config.version) {
            return true; // No version requirement
        }
        
        const actualVersion = this.getLibraryVersion(actualLibrary);
        if (!actualVersion) {
            console.warn(`Cannot determine version for ${config.name}`);
            return true;
        }
        
        if (!this.isCompatible(config.version, actualVersion)) {
            throw new Error(
                `Version mismatch for ${config.name}: ` +
                `required ${config.version}, got ${actualVersion}`
            );
        }
        
        return true;
    }
    
    getLibraryVersion(library) {
        // Try common version properties
        return library.version || 
               library.VERSION || 
               library._version ||
               (library.REVISION && `0.0.${library.REVISION}`);
    }
}
```

### Error Handling and Fallbacks

```javascript
class LibraryErrorHandler {
    constructor(libraryManager) {
        this.libraryManager = libraryManager;
        this.fallbacks = new Map();
        this.retryAttempts = 3;
        this.retryDelay = 1000;
    }
    
    registerFallback(libraryName, fallbackConfig) {
        this.fallbacks.set(libraryName, fallbackConfig);
    }
    
    async loadWithFallback(libraryName) {
        let lastError;
        
        // Try main library
        try {
            return await this.libraryManager.loadLibrary(libraryName);
        } catch (error) {
            lastError = error;
            console.warn(`Failed to load ${libraryName}:`, error);
        }
        
        // Try fallback
        const fallback = this.fallbacks.get(libraryName);
        if (fallback) {
            try {
                return await this.libraryManager.loadLibrary(fallback.name);
            } catch (error) {
                console.warn(`Fallback also failed for ${libraryName}:`, error);
            }
        }
        
        throw new Error(
            `Failed to load ${libraryName} and all fallbacks: ${lastError.message}`
        );
    }
    
    async loadWithRetry(libraryName) {
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                return await this.libraryManager.loadLibrary(libraryName);
            } catch (error) {
                if (attempt === this.retryAttempts) {
                    throw error;
                }
                
                console.warn(
                    `Attempt ${attempt} failed for ${libraryName}, retrying...`
                );
                
                await this.delay(this.retryDelay * attempt);
            }
        }
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
```

## Usage Examples

### Basic Library Loading

```javascript
// Load Three.js and create a 3D scene
async function create3DScene() {
    try {
        const THREE = await LiteGraph.LibraryManager.loadLibrary('threejs');
        
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 800/600, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer();
        
        renderer.setSize(800, 600);
        document.body.appendChild(renderer.domElement);
        
        // Create nodes that use Three.js
        const sceneNode = LiteGraph.createNode('3d/scene');
        const meshNode = LiteGraph.createNode('3d/mesh');
        
        return { scene, camera, renderer };
    } catch (error) {
        console.error('Failed to initialize 3D scene:', error);
    }
}
```

### Custom Library Integration

```javascript
// Register and use a custom library
async function setupCustomLibrary() {
    // Register the library
    LiteGraph.LibraryManager.registerLibrary('myCustomLib', {
        version: '2.1.0',
        urls: [
            'https://cdn.example.com/my-custom-lib.js',
            '/assets/js/my-custom-lib.js'
        ],
        globalName: 'MyCustomLib',
        nodeModule: 'my-custom-lib',
        checkFunction: () => {
            return typeof MyCustomLib !== 'undefined' && 
                   MyCustomLib.version >= '2.0.0';
        },
        onLoad: (lib) => {
            // Configure the library
            lib.configure({
                apiEndpoint: 'https://api.example.com',
                timeout: 5000
            });
            
            // Register custom nodes
            LiteGraph.registerNodeType('custom/api_call', APICallNode);
            LiteGraph.registerNodeType('custom/data_processor', DataProcessorNode);
        }
    });
    
    // Load and use the library
    const lib = await LiteGraph.LibraryManager.loadLibrary('myCustomLib');
    
    // Create nodes that use the custom library
    const apiNode = LiteGraph.createNode('custom/api_call');
    const processorNode = LiteGraph.createNode('custom/data_processor');
    
    return lib;
}
```

### Node.js Environment

```javascript
// Node.js specific library loading
const { LiteGraph } = require('./litegraph.node.js');

// Register Node.js specific libraries
LiteGraph.LibraryManager.registerLibrary('fs-extra', {
    nodeModule: 'fs-extra',
    onLoad: (fs) => {
        LiteGraph.registerNodeType('nodejs/file_operations', FileOperationsNode);
    }
});

LiteGraph.LibraryManager.registerLibrary('axios', {
    nodeModule: 'axios',
    onLoad: (axios) => {
        LiteGraph.registerNodeType('nodejs/http_request', HTTPRequestNode);
    }
});

// Load libraries and create graph
async function createServerGraph() {
    const fs = await LiteGraph.LibraryManager.loadLibrary('fs-extra');
    const axios = await LiteGraph.LibraryManager.loadLibrary('axios');
    
    const graph = new LiteGraph.LGraph();
    
    // Add nodes that use the loaded libraries
    const fileNode = LiteGraph.createNode('nodejs/file_operations');
    const httpNode = LiteGraph.createNode('nodejs/http_request');
    
    graph.add(fileNode);
    graph.add(httpNode);
    
    return graph;
}
```

## Best Practices

### 1. Library Registration
- Register libraries early in application initialization
- Provide multiple URL sources for reliability
- Include version requirements for compatibility
- Implement proper error handling

### 2. Node Development
- Always check if library is loaded before using
- Handle library loading failures gracefully
- Use async/await for library loading in nodes
- Provide fallback functionality when possible

### 3. Performance Optimization
- Load libraries only when needed
- Cache loaded libraries for reuse
- Use CDN sources for better performance
- Implement lazy loading for large libraries

### 4. Cross-Platform Compatibility
- Provide both browser and Node.js module paths
- Test library loading in all target environments
- Handle environment-specific differences
- Document platform-specific requirements

This comprehensive library management system enables LiteGraph.js to integrate seamlessly with external libraries while maintaining performance, reliability, and cross-platform compatibility.
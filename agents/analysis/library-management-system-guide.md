# Library Management System Guide

## Overview

LiteGraph.js features a sophisticated LibraryManager system that handles dynamic loading, registration, and integration of external JavaScript libraries. This system enables seamless integration with popular libraries like Three.js, Socket.IO, OSC.js, and custom libraries while maintaining cross-platform compatibility between browser and Node.js environments.

## LibraryManager Architecture

### Core Class Structure

**File**: `src/librarymanager.js`

The `LibraryManager` class provides centralized library management with the following capabilities:

```javascript
export class LibraryManager {
    constructor() {
        this.libraries_known = {};      // Registry of all known libraries
        this.libraries_loaded = {};     // Cache of loaded library instances
        this.libraries_to_load = [];    // Queue of libraries to load
        this.libraries_state = {};      // Loading state tracking
        this.loading_promises = {};     // Promise management for async loading
        this.fs = null;                 // Node.js filesystem module
        this.path = null;               // Node.js path module
    }
}
```

### Key Features

- **Dynamic Loading**: Runtime library loading from CDN or local sources
- **Version Control**: Specific version targeting and compatibility checking
- **Environment Detection**: Browser vs Node.js library handling
- **Dependency Resolution**: Automatic dependency management
- **Global Object Management**: Namespace handling and conflict resolution
- **Promise-Based Loading**: Asynchronous loading with proper error handling
- **State Management**: Comprehensive loading state tracking

## Library Registration

### Registration Methods

#### Structured Object Registration (Recommended)
```javascript
LiteGraph.LibraryManager.registerLibrary({
    key: "three",
    version: "0.158.0",
    globalObject: "THREE",
    browser: {
        local: ["./libs/three.min.js"],
        remote: ["https://cdnjs.cloudflare.com/ajax/libs/three.js/0.158.0/three.min.js"],
        target: "client" // "client", "server", or "both"
    },
    server: {
        npm: ["three"],
        remote: ["https://cdn.skypack.dev/three@0.158.0"],
        target: "server"
    },
    defaultExport: "default"
});
```

#### Legacy Parameter Registration
```javascript
LiteGraph.LibraryManager.registerLibrary(
    "jquery",                    // key
    "3.6.0",                    // version
    "$",                        // globalObject
    ["./libs/jquery.min.js"],   // localPaths
    ["https://code.jquery.com/jquery-3.6.0.min.js"], // remoteUrls
    ["jquery"],                 // npmPackages
    [],                         // serverRemoteUrls
    "default"                   // defaultExport
);
```

### Registration Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | string | Unique identifier for the library |
| `version` | string | Library version (for compatibility checking) |
| `globalObject` | string | Global variable name to expose the library |
| `browser.local` | array | Local file paths for browser environment |
| `browser.remote` | array | CDN URLs for browser environment |
| `browser.target` | string | Target environment: "client", "server", "both" |
| `server.npm` | array | NPM package names for Node.js environment |
| `server.remote` | array | Remote URLs for server environment |
| `server.target` | string | Target environment: "client", "server", "both" |
| `defaultExport` | string | Default export property name |

## Library Loading

### Basic Loading
```javascript
// Load a single library
LiteGraph.LibraryManager.loadLibrary("three")
    .then(library => {
        console.log("Three.js loaded:", library);
        // Access via global object
        const scene = new THREE.Scene();
    })
    .catch(error => {
        console.error("Failed to load Three.js:", error);
    });

// Load with callback
LiteGraph.LibraryManager.loadLibrary("jquery", (library) => {
    console.log("jQuery loaded:", library);
    $(document).ready(() => {
        console.log("DOM ready with jQuery");
    });
});
```

### Batch Loading
```javascript
// Load all registered libraries
LiteGraph.LibraryManager.loadAllLibraries()
    .then(() => {
        console.log("All libraries loaded");
    })
    .catch(error => {
        console.error("Some libraries failed to load:", error);
    });

// Load multiple specific libraries
Promise.all([
    LiteGraph.LibraryManager.loadLibrary("three"),
    LiteGraph.LibraryManager.loadLibrary("jquery"),
    LiteGraph.LibraryManager.loadLibrary("socket.io")
]).then(libraries => {
    console.log("All specified libraries loaded:", libraries);
});
```

## Environment-Specific Loading

### Browser Environment

In browsers, the LibraryManager loads libraries as script tags:

```javascript
// Browser-specific loading logic
async loadBrowserLibrary(library) {
    const loadedScripts = [];
    
    // Try local paths first
    for (const localPath of library.localPaths) {
        try {
            loadedScripts.push(await this.loadScript(localPath, library.globalObject));
            return loadedScripts; // Return on first success
        } catch (error) {
            console.warn(`Failed to load local file: ${localPath}`);
        }
    }
    
    // Fallback to remote URLs
    for (const remoteUrl of library.remoteUrls) {
        try {
            loadedScripts.push(await this.loadScript(remoteUrl, library.globalObject));
            return loadedScripts; // Return on first success
        } catch (error) {
            console.warn(`Failed to load remote script: ${remoteUrl}`);
        }
    }
    
    throw new Error(`Could not load any files for ${library.key}`);
}
```

### Node.js Environment

In Node.js, the LibraryManager uses dynamic imports and NPM packages:

```javascript
// Server-specific loading logic
async loadServerLibrary(library) {
    const loadedModules = [];
    
    for (const npmPackage of library.npmPackages) {
        try {
            let module = await import(npmPackage);
            
            // Handle default exports
            if (library.defaultExport && typeof module === "object") {
                if (typeof module[library.defaultExport] !== "undefined") {
                    module = module[library.defaultExport];
                }
            }
            
            // Set global object
            if (library.globalObject) {
                setGlobalVariable(library.globalObject, module);
            }
            
            loadedModules.push(module);
        } catch (error) {
            console.error(`Failed to load NPM package ${npmPackage}:`, error);
        }
    }
    
    return loadedModules;
}
```

## State Management

### Library States

The LibraryManager tracks the following states for each library:

| State | Description |
|-------|-------------|
| `not_loaded` | Library is registered but not loaded |
| `loading` | Library is currently being loaded |
| `loaded` | Library has been successfully loaded |
| `error` | Library failed to load |

### State Checking
```javascript
// Check if library is loaded
if (LiteGraph.LibraryManager.isLibraryLoaded("three")) {
    const THREE = LiteGraph.LibraryManager.getLib("three");
    // Use the library
}

// Get library state
const state = LiteGraph.LibraryManager.getLibraryState("jquery");
console.log(`jQuery state: ${state}`);

// Get all registered libraries
const libraries = LiteGraph.LibraryManager.getRegisteredLibraries();
console.log("Registered libraries:", libraries);
```

## Advanced Features

### Module Detection and Loading

The LibraryManager can detect and handle both ES6 modules and CommonJS scripts:

```javascript
// Automatic module detection
async loadScript(url, globalObject = "library_last") {
    const isModule = await this.isESModule(url);
    
    if (isModule) {
        // Load as ES6 module
        const script = document.createElement("script");
        script.type = "module";
        script.textContent = `
            import * as ${globalObject} from '${url}';
            if (LibraryManager) {
                LibraryManager.${globalObject} = ${globalObject};
            }
        `;
        document.head.appendChild(script);
    } else {
        // Load as regular script
        const script = document.createElement("script");
        script.src = url;
        document.head.appendChild(script);
    }
}
```

### CSS Loading Support

```javascript
// Load CSS files
LiteGraph.LibraryManager.loadCSS("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css")
    .then(() => {
        console.log("CSS loaded successfully");
    })
    .catch(error => {
        console.error("Failed to load CSS:", error);
    });
```

### Library Unloading

```javascript
// Unload a specific library
LiteGraph.LibraryManager.unloadLibrary("three");

// Unload all libraries
LiteGraph.LibraryManager.unloadAllLibraries();
```

## Integration with Node System

### Library Nodes

**File**: `src/nodes/libraries.js`

LiteGraph provides built-in nodes for library management:

#### CDN Library Include Node
```javascript
class CDNLibInclude {
    static title = "CDN Lib Include";
    static desc = "Include a JS library from CDN or local";
    
    constructor() {
        this.addInput("load", LiteGraph.ACTION);
        this.addInput("url", "string,url");
        this.addOutput("ready", LiteGraph.EVENT);
        this.addOutput("error", LiteGraph.EVENT);
        this.addOutput("library", "object");
    }
}
```

#### Library Registration Node
```javascript
class CDNLibRegister {
    static title = "Lib Register";
    static desc = "Register a JS library (by url or object)";
    
    constructor() {
        this.addInput("load", LiteGraph.ACTION);
        this.addInput("lib_spec", "object,cdn_lib");
        this.addInput("url", "string,url");
        this.addInput("name", "string");
        this.addOutput("ready", LiteGraph.EVENT);
        this.addOutput("error", LiteGraph.EVENT);
    }
}
```

#### CDN Search Node
```javascript
class CDNLibSearch {
    static title = "CDN Search";
    static desc = "Search and fetch CDN libraries";
    
    constructor() {
        this.addInput("search", LiteGraph.ACTION);
        this.addProperty("name", "", "string");
        this.addOutput("ready", LiteGraph.EVENT);
        this.addOutput("results", "array");
        this.addOutput("first name", "string");
        this.addOutput("first object", "object");
    }
}
```

## Common Library Registrations

### Popular Libraries

```javascript
// Three.js for 3D graphics
LiteGraph.LibraryManager.registerLibrary({
    key: "three",
    version: "0.158.0",
    globalObject: "THREE",
    browser: {
        remote: ["https://cdnjs.cloudflare.com/ajax/libs/three.js/0.158.0/three.min.js"]
    },
    server: {
        npm: ["three"]
    }
});

// Socket.IO for real-time communication
LiteGraph.LibraryManager.registerLibrary({
    key: "socket.io",
    version: "4.7.4",
    globalObject: "io",
    browser: {
        remote: ["https://cdn.socket.io/4.7.4/socket.io.min.js"]
    },
    server: {
        npm: ["socket.io-client"]
    }
});

// D3.js for data visualization
LiteGraph.LibraryManager.registerLibrary({
    key: "d3",
    version: "7.8.5",
    globalObject: "d3",
    browser: {
        remote: ["https://d3js.org/d3.v7.min.js"]
    },
    server: {
        npm: ["d3"]
    }
});

// Tone.js for audio synthesis
LiteGraph.LibraryManager.registerLibrary({
    key: "tone",
    version: "14.7.77",
    globalObject: "Tone",
    browser: {
        remote: ["https://cdnjs.cloudflare.com/ajax/libs/tone/14.7.77/Tone.js"]
    },
    server: {
        npm: ["tone"]
    }
});
```

### Node.js System Libraries

**File**: `src/nodes/nodejs_only/nodejs_sys.js`

```javascript
// Operating System utilities
LiteGraph.LibraryManager.registerLibrary({
    key: "os",
    globalObject: "os",
    server: { npm: ["os"] }
});

// File System operations
LiteGraph.LibraryManager.registerLibrary({
    key: "fs",
    globalObject: "fs",
    server: { npm: ["fs"] }
});

// Process management
LiteGraph.LibraryManager.registerLibrary({
    key: "child_process",
    globalObject: "child_process",
    server: { npm: ["child_process"] }
});

// System monitoring
LiteGraph.LibraryManager.registerLibrary({
    key: "node-os-utils",
    version: "0.3.4",
    globalObject: "nodeOsUtils",
    server: { npm: ["node-os-utils"] }
});
```

## Error Handling and Fallbacks

### Fallback Strategy

The LibraryManager implements a comprehensive fallback strategy:

1. **Local Files First**: Try loading from local paths
2. **CDN Fallback**: Fall back to remote CDN URLs
3. **Multiple Sources**: Try multiple URLs until one succeeds
4. **Error Reporting**: Comprehensive error logging and reporting

### Error Handling Example

```javascript
// Robust library loading with error handling
async function loadLibraryWithFallback(libraryKey) {
    try {
        const library = await LiteGraph.LibraryManager.loadLibrary(libraryKey);
        console.log(`Successfully loaded ${libraryKey}:`, library);
        return library;
    } catch (error) {
        console.error(`Failed to load ${libraryKey}:`, error);
        
        // Implement custom fallback logic
        if (libraryKey === "three") {
            // Try alternative Three.js source
            LiteGraph.LibraryManager.registerLibrary({
                key: "three-fallback",
                globalObject: "THREE",
                browser: {
                    remote: ["https://unpkg.com/three@0.158.0/build/three.min.js"]
                }
            });
            
            return await LiteGraph.LibraryManager.loadLibrary("three-fallback");
        }
        
        throw error;
    }
}
```

## Best Practices

### 1. Library Registration
- Register libraries early in application initialization
- Use specific version numbers for production
- Provide both local and remote sources for reliability
- Use meaningful global object names

### 2. Loading Strategy
- Load critical libraries synchronously during initialization
- Use lazy loading for optional libraries
- Implement proper error handling and fallbacks
- Monitor loading performance and optimize as needed

### 3. Environment Compatibility
- Test library loading in both browser and Node.js environments
- Use environment-specific configurations when needed
- Handle module format differences (ES6 vs CommonJS)
- Provide appropriate fallbacks for each environment

### 4. Performance Optimization
- Load libraries only when needed
- Cache loaded libraries for reuse
- Use CDN sources for better performance
- Implement lazy loading for large libraries

### 5. Error Handling
- Always provide error callbacks or catch promises
- Implement fallback loading strategies
- Log errors appropriately for debugging
- Gracefully handle missing libraries

## Integration Examples

### Custom Node with Library Dependency

```javascript
class ThreeJSSceneNode extends LGraphNode {
    constructor() {
        super();
        this.title = "3D Scene";
        this.addOutput("scene", "object");
        
        // Ensure Three.js is loaded
        this.loadDependencies();
    }
    
    async loadDependencies() {
        try {
            await LiteGraph.LibraryManager.loadLibrary("three");
            this.onLibrariesLoaded();
        } catch (error) {
            console.error("Failed to load Three.js:", error);
            this.boxcolor = "#F00";
        }
    }
    
    onLibrariesLoaded() {
        this.scene = new THREE.Scene();
        this.boxcolor = "#0F0";
    }
    
    onExecute() {
        if (this.scene) {
            this.setOutputData(0, this.scene);
        }
    }
}

LiteGraph.registerNodeType("3d/scene", ThreeJSSceneNode);
```

### Dynamic Library Loading Node

```javascript
class DynamicLibraryLoader extends LGraphNode {
    constructor() {
        super();
        this.title = "Dynamic Loader";
        this.addInput("load", LiteGraph.ACTION);
        this.addInput("library_key", "string");
        this.addOutput("loaded", LiteGraph.EVENT);
        this.addOutput("library", "object");
        this.addOutput("error", LiteGraph.EVENT);
    }
    
    onAction(action, param) {
        if (action === "load") {
            this.loadLibrary();
        }
    }
    
    async loadLibrary() {
        const libraryKey = this.getInputData(1);
        if (!libraryKey) {
            this.triggerSlot(2); // Error
            return;
        }
        
        try {
            const library = await LiteGraph.LibraryManager.loadLibrary(libraryKey);
            this.setOutputData(1, library);
            this.triggerSlot(0); // Loaded
        } catch (error) {
            console.error(`Failed to load library ${libraryKey}:`, error);
            this.triggerSlot(2); // Error
        }
    }
}

LiteGraph.registerNodeType("system/dynamic_loader", DynamicLibraryLoader);
```

This comprehensive LibraryManager system enables LiteGraph.js to integrate seamlessly with external libraries while maintaining performance, reliability, and cross-platform compatibility.
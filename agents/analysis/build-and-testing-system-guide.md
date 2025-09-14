# LiteGraph Build and Testing System Guide

## Overview

LiteGraph uses a custom Python-based build system (`build.py`) combined with Jest for testing. The system supports multiple build targets, cross-platform compatibility, and automated testing workflows.

## Build System Architecture

### Core Build Script (`build.py`)

The build system is implemented in Python and provides comprehensive bundling capabilities:

```python
# Build targets configuration
js_files_lists = [
    {
        "output_filename": "litegraph.js",
        "js_files": lib_js_files + lib_nodes_files
    },
    {
        "output_filename": "litegraph.mini.js",
        "js_files": lib_js_files + lib_nodes_files
    },
    {
        "output_filename": "litegraph.full.js",
        "js_files": lib_js_files + lib_nodes_files + lib_editor_files + lib_extensions_files
    },
    {
        "output_filename": "litegraph_nodejs.full.js",
        "js_files": lib_js_files + lib_nodes_files + lib_nodejs_nodes_files + lib_editor_files + lib_extensions_files
    },
    {
        "output_filename": "litegraph.full.mini.js",
        "js_files": lib_js_files + lib_nodes_files + lib_editor_files + lib_extensions_files
    },
    {
        "output_filename": "litegraph.core.js",
        "js_files": lib_js_files
    }
]
```

### Build Targets

1. **litegraph.js**: Core library + standard nodes
2. **litegraph.mini.js**: Minified version of core + nodes
3. **litegraph.full.js**: Complete bundle with editor and extensions
4. **litegraph_nodejs.full.js**: Node.js compatible version with all features
5. **litegraph.full.mini.js**: Minified complete bundle
6. **litegraph.core.js**: Core library only

### Source File Organization

#### Core Library Files
```python
lib_js_files = [
    "./src/global.js",
    "./src/litegraph.js",
    "./src/callbackhandler.js",
    "./src/contextmenu.js",
    "./src/curveeditor.js",
    "./src/dragandscale.js",
    "./src/lgraph.js",
    "./src/lgraphcanvas.js",
    "./src/lgraphgroup.js",
    "./src/lgraphnode.js",
    "./src/llink.js",
    "./src/subgraph.js",
    "./src/librarymanager.js",
    "./src/init_litegraph.js"
]
```

#### Node Libraries
```python
lib_nodes_files = [
    "./src/nodes/base.js",
    "./src/nodes/events.js",
    "./src/nodes/interface.js",
    "./src/nodes/input.js",
    "./src/nodes/math.js",
    "./src/nodes/math3d.js",
    "./src/nodes/strings.js",
    "./src/nodes/logic.js",
    "./src/nodes/graphics.js",
    "./src/nodes/gltextures.js",
    "./src/nodes/glshaders.js",
    "./src/nodes/geometry.js",
    "./src/nodes/glfx.js",
    "./src/nodes/midi.js",
    "./src/nodes/audio.js",
    "./src/nodes/network.js",
    "./src/nodes/objects.js",
    "./src/nodes/libraries.js",
    "./src/nodes/html.js",
    "./src/nodes/watch.js",
    "./src/nodes/litegraph_nodes.js",
    "./src/nodes/libraries/socketio.js",
    "./src/nodes/others.js"
]
```

#### Node.js Specific Files
```python
lib_nodejs_nodes_files = [
    "./src/nodes/nodejs_only/nodejs_network.js",
    "./src/nodes/nodejs_only/process.js",
    "./src/nodes/nodejs_only/nodejs_sys.js"
]
```

#### Extensions
```python
lib_extensions_files = [
    "./editor/js/defaults_debug.js",
    "./src/extensions/autoconnect.js",
    "./src/extensions/keyboard_helper.js",
    "./src/extensions/renamer.js"
]
```

### Build Process

#### 1. File Concatenation
```python
def concatenate_js_files(js_files, output_filename, output_folder, remove_imports=False):
    # Combines multiple JS files into single bundle
    # Optionally removes ES6 import/export statements
```

#### 2. Minification and Optimization
```python
def pack_js_files(input_filepath, output_filename, output_folder, minify=True):
    # Uses uglify-js for minification
    # Applies js-beautify for readable output
```

#### 3. CommonJS Conversion
```python
def convert_es6_to_commonjs(data):
    # Converts ES6 modules to CommonJS for Node.js compatibility
    # Handles import/export transformations
```

#### 4. Version Management
```python
def update_version_in_files(version, files):
    # Updates version numbers in source files and package.json
    # Maintains version consistency across builds
```

### Build Options

```bash
# Standard build
python build.py

# Build without minification
python build.py --no-minify

# Build without prettification
python build.py --no-prettify

# Update version numbers
python build.py --update-version
```

### Output Structure

```
build/
├── litegraph.js
├── litegraph.mini.js
├── litegraph.full.js
├── litegraph.full.mini.js
└── litegraph.core.js

build_node/
├── litegraph.cjs
├── litegraph.mini.cjs
├── litegraph.full.cjs
├── litegraph_nodejs.full.cjs
├── litegraph.full.mini.cjs
└── litegraph.core.cjs
```

## Testing System

### Jest Configuration

The project uses Jest for testing with ES6 module support:

```json
{
  "scripts": {
    "test": "node --experimental-vm-modules node_modules/jest-cli/bin/jest.js"
  },
  "devDependencies": {
    "@types/jest": "^28.1.3",
    "jest-cli": "^28.1.3",
    "eslint-plugin-jest": "^27.2.1",
    "jsdom": "^17.0.0"
  }
}
```

### Test Structure

#### Main Test File (`test/litegraph.test.js`)

```javascript
import { jest } from "@jest/globals";
import { LiteGraph } from "../src/litegraph.js";
import { LGraphNode } from "../src/lgraphnode.js";

describe("register node types", () => {
    let Sum;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();

        // Reset LiteGraph state for each test
        LiteGraph.registered_node_types = {};
        LiteGraph.registered_slot_in_types = {};
        LiteGraph.registered_slot_out_types = {};

        // Define test node
        Sum = function Sum() {
            this.addInput("a", "number");
            this.addInput("b", "number");
            this.addOutput("sum", "number");
        };
        Sum.prototype.onExecute = function (a, b) {
            this.setOutputData(0, a + b);
        };
    });

    test("normal case", () => {
        LiteGraph.registerNodeType("math/sum", Sum);
        
        let node = LiteGraph.registered_node_types["math/sum"];
        expect(node).toBeTruthy();
        expect(node.type).toBe("math/sum");
        expect(node.title).toBe("Sum");
        expect(node.category).toBe("math");
    });
});
```

### Test Categories

1. **Node Registration Tests**
   - Normal registration cases
   - Callback trigger verification
   - Error handling for invalid nodes
   - Shape mapping validation

2. **Node Unregistration Tests**
   - Proper cleanup verification
   - State reset validation

### Testing Best Practices

#### State Management
```javascript
beforeEach(() => {
    // Always reset LiteGraph state
    LiteGraph.registered_node_types = {};
    LiteGraph.registered_slot_in_types = {};
    LiteGraph.registered_slot_out_types = {};
    
    // Clear Jest mocks
    jest.clearAllMocks();
    jest.resetModules();
});
```

#### Mock Usage
```javascript
test("callback triggers", () => {
    const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

    LiteGraph.onNodeTypeRegistered = jest.fn();
    LiteGraph.onNodeTypeReplaced = jest.fn();
    
    // Test implementation
    LiteGraph.registerNodeType("math/sum", Sum);
    
    expect(LiteGraph.onNodeTypeRegistered).toHaveBeenCalled();
});
```

## Package.json Integration

### Scripts Configuration
```json
{
  "scripts": {
    "build": "python3 build.py",
    "test": "node --experimental-vm-modules node_modules/jest-cli/bin/jest.js",
    "lint": "npx eslint src",
    "lint:fix": "npx eslint --fix src",
    "docs": "jsdoc -c ./docs/.jsdoc.config -d ./docs -r --verbose --debug"
  }
}
```

### Development Dependencies
```json
{
  "devDependencies": {
    "@types/jest": "^28.1.3",
    "eslint": "^8.37.0",
    "eslint-plugin-jest": "^27.2.1",
    "jest-cli": "^28.1.3",
    "jsdom": "^17.0.0",
    "uglify-js": "^3.0.0"
  }
}
```

## CI/CD Integration

### GitHub Actions Workflow

The project includes automated testing and building:

```yaml
name: Build and Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test
      - name: Build project
        run: npm run build
```

## Common Issues and Solutions

### Build Issues

1. **Python Version Compatibility**
   ```bash
   # Ensure Python 3 is available
   python3 --version
   # or use python if python3 is not available
   python --version
   ```

2. **Missing Dependencies**
   ```bash
   # Install required global packages
   npm install -g js-beautify uglify-js
   ```

3. **Import/Export Issues**
   - The build system automatically handles ES6 to CommonJS conversion
   - Ensure proper import/export syntax in source files

### Testing Issues

1. **ES6 Module Support**
   ```bash
   # Use experimental VM modules flag
   node --experimental-vm-modules node_modules/jest-cli/bin/jest.js
   ```

2. **State Isolation**
   ```javascript
   // Always reset LiteGraph state between tests
   beforeEach(() => {
       LiteGraph.registered_node_types = {};
       // ... other resets
   });
   ```

## Performance Considerations

### Build Optimization
- Minification reduces bundle size by ~60%
- Tree shaking removes unused code
- CommonJS builds enable Node.js compatibility

### Test Performance
- State reset ensures test isolation
- Mock usage prevents external dependencies
- Parallel test execution when possible

## Extension Points

### Custom Build Targets
```python
# Add new build configuration
custom_build = {
    "output_filename": "litegraph.custom.js",
    "js_files": custom_file_list
}
js_files_lists.append(custom_build)
```

### Additional Test Suites
```javascript
// Create new test files following the pattern
// test/feature-name.test.js
import { jest } from "@jest/globals";
import { LiteGraph } from "../src/litegraph.js";

describe("feature tests", () => {
    // Test implementation
});
```

## Best Practices

### Build Process
1. Always run tests before building
2. Use version management for releases
3. Validate all build targets
4. Check CommonJS compatibility for Node.js builds

### Testing
1. Maintain test isolation with proper setup/teardown
2. Use descriptive test names and organize by feature
3. Mock external dependencies
4. Test both success and error cases
5. Maintain high code coverage

### Development Workflow
```bash
# Standard development cycle
npm test          # Run tests
npm run lint      # Check code style
npm run build     # Create distribution files
npm run docs      # Generate documentation
```

This comprehensive build and testing system ensures reliable, cross-platform distribution of LiteGraph while maintaining code quality through automated testing and consistent build processes.
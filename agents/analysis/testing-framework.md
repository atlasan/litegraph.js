# Testing Framework Documentation

## Overview

LiteGraph.js uses Jest as its primary testing framework with ES6 module support. The testing setup is configured for modern JavaScript development with comprehensive node type registration and lifecycle testing.

## Test Configuration

### Framework: Jest
- **Version Detection**: Dynamic Jest version logging
- **Module System**: ES6 modules with `import`/`export`
- **Test Runner**: `@jest/globals` for Jest utilities
- **File Structure**: Single test file `test/litegraph.test.js`

### Test Setup

```javascript
import { jest } from "@jest/globals";
import { LiteGraph } from "../src/litegraph.js";
import { LGraphNode } from "../src/lgraphnode.js";
```

## Current Test Coverage

### 1. Node Type Registration Tests

**Test Suite**: `"register node types"`

#### Test Cases:

**Normal Case Registration**:
```javascript
test("normal case", () => {
    LiteGraph.registerNodeType("math/sum", Sum);
    
    let node = LiteGraph.registered_node_types["math/sum"];
    expect(node).toBeTruthy();
    expect(node.type).toBe("math/sum");
    expect(node.title).toBe("Sum");
    expect(node.category).toBe("math");
    expect(node.prototype.configure).toBe(LGraphNode.prototype.configure);
});
```

**Callback Triggers**:
- Tests `LiteGraph.onNodeTypeRegistered` callback execution
- Tests `LiteGraph.onNodeTypeReplaced` callback on re-registration
- Verifies console logging for node type replacement

**Custom Node Titles**:
```javascript
test("node with title", () => {
    Sum.title = "The sum title";
    LiteGraph.registerNodeType("math/sum", Sum);
    let node = LiteGraph.registered_node_types["math/sum"];
    expect(node.title).toBe("The sum title");
    expect(node.title).not.toBe(node.name);
});
```

**Error Handling**:
- Tests rejection of simple objects (non-constructor functions)
- Validates proper error messages

**Shape Mapping**:
- Tests node shape inheritance and mapping
- Verifies `LiteGraph.BOX_SHAPE` constant mapping

### 2. Node Type Unregistration Tests

**Test Suite**: `"unregister node types"`
- Tests removal of registered node types
- Validates cleanup of type registry

## Test Utilities

### Mock Node Implementation

```javascript
Sum = function Sum() {
    this.addInput("a", "number");
    this.addInput("b", "number");
    this.addOutput("sum", "number");
};
Sum.prototype.onExecute = function (a, b) {
    this.setOutputData(0, a + b);
};
```

### Test Isolation

**beforeEach Setup**:
```javascript
beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    
    // Reset LiteGraph state
    LiteGraph.registered_node_types = {};
    LiteGraph.registered_slot_in_types = {};
    LiteGraph.registered_slot_out_types = {};
    
    // Recreate test node
    Sum = function Sum() { /* ... */ };
});
```

### Spy and Mock Usage

```javascript
const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
LiteGraph.onNodeTypeRegistered = jest.fn();
LiteGraph.onNodeTypeReplaced = jest.fn();
```

## Testing Gaps and Recommendations

### Current Limitations

1. **Limited Scope**: Only tests node registration/unregistration
2. **No Integration Tests**: Missing canvas, graph, and rendering tests
3. **No Performance Tests**: No benchmarking or performance regression tests
4. **No Extension Tests**: Extension system not covered
5. **No Headless Tests**: Server-side execution not tested
6. **No UI Tests**: Editor and canvas interactions not tested

### Recommended Test Additions

#### 1. Core Graph System Tests

```javascript
describe("LGraph functionality", () => {
    test("graph creation and node addition", () => {
        const graph = new LGraph();
        const node = LiteGraph.createNode("math/sum");
        graph.add(node);
        expect(graph.nodes.length).toBe(1);
    });
    
    test("node connections", () => {
        const graph = new LGraph();
        const node1 = LiteGraph.createNode("basic/const");
        const node2 = LiteGraph.createNode("math/sum");
        graph.add(node1);
        graph.add(node2);
        
        node1.connect(0, node2, 0);
        expect(node2.inputs[0].link).toBeTruthy();
    });
    
    test("graph execution", () => {
        const graph = new LGraph();
        // Test graph execution flow
    });
});
```

#### 2. Node Lifecycle Tests

```javascript
describe("Node lifecycle", () => {
    test("node creation and initialization", () => {
        const node = LiteGraph.createNode("math/sum");
        expect(node.inputs.length).toBe(2);
        expect(node.outputs.length).toBe(1);
    });
    
    test("node execution", () => {
        const node = LiteGraph.createNode("math/sum");
        node.setInputData(0, 5);
        node.setInputData(1, 3);
        node.onExecute();
        expect(node.getOutputData(0)).toBe(8);
    });
    
    test("node serialization", () => {
        const node = LiteGraph.createNode("math/sum");
        const serialized = node.serialize();
        expect(serialized.type).toBe("math/sum");
    });
});
```

#### 3. Canvas and Rendering Tests

```javascript
describe("LGraphCanvas", () => {
    let canvas, ctx;
    
    beforeEach(() => {
        // Mock canvas and context
        canvas = document.createElement('canvas');
        ctx = canvas.getContext('2d');
        jest.spyOn(ctx, 'fillRect');
    });
    
    test("canvas initialization", () => {
        const graphCanvas = new LGraphCanvas(canvas);
        expect(graphCanvas.canvas).toBe(canvas);
    });
    
    test("node rendering", () => {
        const graphCanvas = new LGraphCanvas(canvas);
        const graph = new LGraph();
        const node = LiteGraph.createNode("math/sum");
        graph.add(node);
        graphCanvas.graph = graph;
        
        graphCanvas.draw();
        expect(ctx.fillRect).toHaveBeenCalled();
    });
});
```

#### 4. Extension System Tests

```javascript
describe("Extension system", () => {
    test("extension registration", () => {
        const mockCanvas = { registerCallbackHandler: jest.fn() };
        registerExtension_autoconnect(mockCanvas);
        expect(mockCanvas.registerCallbackHandler).toHaveBeenCalled();
    });
    
    test("callback handler execution", () => {
        // Test callback system
    });
});
```

#### 5. Headless Execution Tests

```javascript
describe("Headless execution", () => {
    test("graph runner initialization", () => {
        // Test server-side graph execution
    });
    
    test("worker thread communication", () => {
        // Test worker-based execution
    });
});
```

#### 6. Performance Tests

```javascript
describe("Performance", () => {
    test("large graph execution time", () => {
        const start = performance.now();
        // Create and execute large graph
        const end = performance.now();
        expect(end - start).toBeLessThan(1000); // 1 second threshold
    });
    
    test("memory usage", () => {
        // Test memory consumption
    });
});
```

## Test Infrastructure Improvements

### 1. Test Configuration Enhancement

**package.json additions**:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:headless": "jest --testPathPattern=headless"
  },
  "jest": {
    "testEnvironment": "jsdom",
    "setupFilesAfterEnv": ["<rootDir>/test/setup.js"],
    "collectCoverageFrom": [
      "src/**/*.js",
      "!src/**/*.test.js"
    ]
  }
}
```

### 2. Test Utilities File

**test/utils.js**:
```javascript
export const createMockCanvas = () => {
    const canvas = document.createElement('canvas');
    const ctx = {
        fillRect: jest.fn(),
        strokeRect: jest.fn(),
        beginPath: jest.fn(),
        // ... other canvas methods
    };
    canvas.getContext = jest.fn(() => ctx);
    return { canvas, ctx };
};

export const createTestGraph = () => {
    const graph = new LGraph();
    const node1 = LiteGraph.createNode("basic/const");
    const node2 = LiteGraph.createNode("math/sum");
    graph.add(node1);
    graph.add(node2);
    return { graph, node1, node2 };
};
```

### 3. Continuous Integration

**GitHub Actions workflow**:
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

## Testing Best Practices

### 1. Test Organization
- Group related tests in describe blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

### 2. Mock Strategy
- Mock external dependencies
- Use spies for behavior verification
- Reset mocks between tests

### 3. Coverage Goals
- Aim for >80% code coverage
- Focus on critical paths
- Test error conditions

### 4. Performance Considerations
- Keep tests fast (<100ms each)
- Use beforeAll for expensive setup
- Parallelize independent tests

## Integration with Build System

The testing framework should integrate with the existing `build.py` system:

```python
# Add to build.py
def run_tests():
    """Run the test suite"""
    import subprocess
    result = subprocess.run(['npm', 'test'], capture_output=True, text=True)
    if result.returncode != 0:
        print("Tests failed:")
        print(result.stdout)
        print(result.stderr)
        return False
    return True

if __name__ == "__main__":
    if not run_tests():
        exit(1)
    # Continue with build process
```

This comprehensive testing framework will ensure LiteGraph.js maintains high quality and reliability across all its components and use cases.
/**
 * LiteGraph Node Testing Framework
 * Core testing infrastructure for node validation and execution
 */

function TestFramework() {
    this.tests = {};
    this.results = {};
    this.complexGenerator = null; // Will be initialized when needed
    this.config = {
        timeout: 5000,
        stressIterations: 1000,
        performanceSamples: 100,
        validateInputs: true,
        validateOutputs: true,
        validateProperties: true,
        validateExecution: true,
        validateMemory: true,
        batchSize: 10, // Process tests in batches
        memoryThreshold: 50 * 1024 * 1024, // 50MB memory threshold
        gcInterval: 20, // Force GC every 20 tests
        useObjectPooling: true
    };
    this.stats = {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        coverage: 0
    };
    this.listeners = {};
    this.isRunning = false;
    this.currentTest = null;
    
    // Performance optimizations
    this.nodePool = {}; // Object pool for node instances
    this.graphPool = []; // Pool for graph instances
    this.testCounter = 0;
    this.memoryStats = {
        peak: 0,
        current: 0,
        gcCount: 0
    };
}

// Simple test method to verify the class works
TestFramework.prototype.test = function() {
    return "TestFramework is working";
};

// Export to global scope for ES5 compatibility
window.testFramework = new TestFramework();
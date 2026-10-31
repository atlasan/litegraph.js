/**
 * LiteGraph Node Testing Framework
 * Comprehensive testing system for validating node functionality
 */

import { LiteGraph } from '../../build/litegraph.js';
import { csvCell, escapeReportResult } from './report-utils.js';
import { setNodeInput } from './test-inputs.js';
const { LGraphNode } = LiteGraph;

export class TestFramework {
    constructor() {
        this.tests = new Map();
        this.results = new Map();
        this.config = {
            timeout: 5000,
            stressIterations: 1000,
            performanceSamples: 100,
            validateInputs: true,
            validateOutputs: true,
            validateProperties: true,
            validateExecution: true,
            validateMemory: true
        };
        this.stats = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            coverage: 0
        };
        this.listeners = new Map();
        this.isRunning = false;
        this.currentTest = null;
    }

    /**
     * Register a test case for a specific node type
     */
    registerTest(nodeType, testDefinition) {
        if (!this.tests.has(nodeType)) {
            this.tests.set(nodeType, []);
        }
        
        const test = {
            id: `${nodeType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            nodeType,
            name: testDefinition.name || `Test ${nodeType}`,
            description: testDefinition.description || '',
            category: testDefinition.category || 'general',
            priority: testDefinition.priority || 'medium',
            timeout: testDefinition.timeout || this.config.timeout,
            setup: testDefinition.setup || null,
            execute: testDefinition.execute || null,
            validate: testDefinition.validate || null,
            cleanup: testDefinition.cleanup || null,
            expectedInputs: testDefinition.expectedInputs || [],
            expectedOutputs: testDefinition.expectedOutputs || [],
            testData: testDefinition.testData || {},
            tags: testDefinition.tags || []
        };
        
        this.tests.get(nodeType).push(test);
        this.emit('testRegistered', { test });
        return test.id;
    }

    /**
     * Run all tests or specific test categories
     */
    async runTests(filter = {}) {
        if (this.isRunning) {
            throw new Error('Tests are already running');
        }

        this.isRunning = true;
        this.runController = new AbortController();
        this.results.clear();
        this.stats = { total: 0, passed: 0, failed: 0, skipped: 0, coverage: 0 };
        
        try {
            this.emit('testRunStarted', { filter });
            
            const testsToRun = this.getFilteredTests(filter);
            this.stats.total = testsToRun.length;
            
            for (const test of testsToRun) {
                if (this.runController.signal.aborted) break;
                
                this.currentTest = test;
                const result = await this.runSingleTest(test, { signal: this.runController.signal });
                this.results.set(test.id, result);
                
                if (result.status === 'passed') {
                    this.stats.passed++;
                } else if (result.status === 'failed') {
                    this.stats.failed++;
                } else {
                    this.stats.skipped++;
                }
                
                this.emit('testCompleted', { test, result });
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            
            this.calculateCoverage();
            this.emit('testRunCompleted', { stats: this.stats });
            
        } catch (error) {
            this.emit('testRunError', { error });
        } finally {
            this.isRunning = false;
            this.currentTest = null;
        }
        
        return this.stats;
    }

    /**
     * Run a single test case
     */
    async runSingleTest(test, { signal } = {}) {
        const phase = (fn, ...args) => this.executePhase(fn, test.timeout || this.config.timeout, signal, ...args);
        const startTime = performance.now();
        const result = {
            testId: test.id,
            nodeType: test.nodeType,
            status: 'running',
            startTime,
            endTime: null,
            duration: 0,
            errors: [],
            warnings: [],
            details: {},
            memoryUsage: null
        };

        let node;
        let graph;
        try {
            // Memory baseline
            const memoryBefore = this.getMemoryUsage();
            
            // Create test node instance
            const NodeClass = LiteGraph.registered_node_types[test.nodeType];
            if (!NodeClass) {
                throw new Error(`Node type '${test.nodeType}' not registered`);
            }
            
            node = LiteGraph.createNode(test.nodeType);
            if (!node) throw new Error(`Failed to create ${test.nodeType}`);
            graph = new LiteGraph.LGraph();
            graph.add(node);
            await phase(() => graph.whenReady());
            
            // Setup phase
            if (test.setup) {
                await phase(test.setup, node, graph, { signal });
            }
            
            // Validation phase
            if (this.config.validateInputs) {
                this.validateNodeInputs(node, test, result);
            }
            
            if (this.config.validateOutputs) {
                this.validateNodeOutputs(node, test, result);
            }
            
            if (this.config.validateProperties) {
                this.validateNodeProperties(node, test, result);
            }
            
            // Execution phase
            if (test.execute) {
                result.details.executionResult = await phase(test.execute, node, graph, { signal });
            } else if (this.config.validateExecution) {
                // Default execution test
                result.details.executionResult = this.testNodeExecution(node, graph);
                result.errors.push(...result.details.executionResult.errors);
            }
            
            // Custom validation
            if (test.validate) {
                result.details.validationResult = await phase(test.validate, node, graph, result.details.executionResult, { signal });
                const validation = result.details.validationResult;
                if (validation === false || validation?.passed === false || validation?.issues?.length) {
                    result.errors.push({ type: 'validation_error', message: validation?.issues?.join('; ') || 'Custom validation failed' });
                }
            }

            // Memory check
            if (this.config.validateMemory) {
                const memoryAfter = this.getMemoryUsage();
                result.memoryUsage = {
                    before: memoryBefore,
                    after: memoryAfter,
                    delta: memoryAfter - memoryBefore
                };
                
                if (result.memoryUsage.delta > 10 * 1024 * 1024) { // 10MB threshold
                    result.warnings.push(`High memory usage: ${(result.memoryUsage.delta / 1024 / 1024).toFixed(2)}MB`);
                }
            }
            
            
            result.status = result.errors.length > 0 ? 'failed' : 'passed';
            
        } catch (error) {
            result.status = signal?.aborted ? 'skipped' : 'failed';
            result.details.cancelled = !!signal?.aborted;
            if (signal?.aborted) result.warnings.push('Canceled by user');
            else result.errors.push({
                type: 'execution_error',
                message: error.message,
                stack: error.stack
            });
        } finally {
            try {
                if (test.cleanup && node && graph) await this.executeWithTimeout(test.cleanup, test.timeout, node, graph);
            } catch (error) {
                result.status = 'failed';
                result.errors.push({ type: 'cleanup_error', message: error.message });
            } finally {
                try { if (graph) await this.executeWithTimeout(() => graph.clearAsync(), test.timeout || this.config.timeout); } catch (error) {
                    result.status = 'failed';
                    result.errors.push({ type: 'cleanup_error', message: error.message });
                }
            }
        }

        result.endTime = performance.now();
        result.duration = result.endTime - result.startTime;
        
        return result;
    }

    /**
     * Validate node inputs match expected configuration
     */
    validateNodeInputs(node, test, result) {
        if (!test.expectedInputs.length) return;
        
        const actualInputs = node.inputs || [];
        const expected = test.expectedInputs;
        
        if (actualInputs.length !== expected.length) {
            result.errors.push({
                type: 'input_count_mismatch',
                message: `Expected ${expected.length} inputs, got ${actualInputs.length}`,
                expected: expected.length,
                actual: actualInputs.length
            });
        }
        
        for (let i = 0; i < Math.min(actualInputs.length, expected.length); i++) {
            const actual = actualInputs[i];
            const exp = expected[i];
            
            if (exp.name && actual.name !== exp.name) {
                result.errors.push({
                    type: 'input_name_mismatch',
                    message: `Input ${i}: expected name '${exp.name}', got '${actual.name}'`,
                    inputIndex: i,
                    expected: exp.name,
                    actual: actual.name
                });
            }
            
            if (exp.type && actual.type !== exp.type) {
                result.errors.push({
                    type: 'input_type_mismatch',
                    message: `Input ${i}: expected type '${exp.type}', got '${actual.type}'`,
                    inputIndex: i,
                    expected: exp.type,
                    actual: actual.type
                });
            }
        }
    }

    /**
     * Validate node outputs match expected configuration
     */
    validateNodeOutputs(node, test, result) {
        if (!test.expectedOutputs.length) return;
        
        const actualOutputs = node.outputs || [];
        const expected = test.expectedOutputs;
        
        if (actualOutputs.length !== expected.length) {
            result.errors.push({
                type: 'output_count_mismatch',
                message: `Expected ${expected.length} outputs, got ${actualOutputs.length}`,
                expected: expected.length,
                actual: actualOutputs.length
            });
        }
        
        for (let i = 0; i < Math.min(actualOutputs.length, expected.length); i++) {
            const actual = actualOutputs[i];
            const exp = expected[i];
            
            if (exp.name && actual.name !== exp.name) {
                result.errors.push({
                    type: 'output_name_mismatch',
                    message: `Output ${i}: expected name '${exp.name}', got '${actual.name}'`,
                    outputIndex: i,
                    expected: exp.name,
                    actual: actual.name
                });
            }
            
            if (exp.type && actual.type !== exp.type) {
                result.errors.push({
                    type: 'output_type_mismatch',
                    message: `Output ${i}: expected type '${exp.type}', got '${actual.type}'`,
                    outputIndex: i,
                    expected: exp.type,
                    actual: actual.type
                });
            }
        }
    }

    /**
     * Validate node properties
     */
    validateNodeProperties(node, test, result) {
        // Check if node has required methods
        const requiredMethods = ['onExecute'];
        for (const method of requiredMethods) {
            if (typeof node[method] !== 'function') {
                result.warnings.push(`Node missing recommended method: ${method}`);
            }
        }
        
        // Check properties structure
        if (node.properties && typeof node.properties !== 'object') {
            result.errors.push({
                type: 'invalid_properties',
                message: 'Node properties should be an object',
                actual: typeof node.properties
            });
        }
    }

    /**
     * Test basic node execution
     */
    testNodeExecution(node, graph) {
        const results = {
            executionCount: 0,
            errors: [],
            outputs: []
        };
        
        try {
            // Test basic execution
            if (typeof node.onExecute === 'function') {
                node.onExecute();
                results.executionCount++;
                
                // Capture outputs
                if (node.outputs) {
                    for (let i = 0; i < node.outputs.length; i++) {
                        results.outputs.push({
                            index: i,
                            name: node.outputs[i].name,
                            value: node.getOutputData(i)
                        });
                    }
                }
            }
            
            // Test with sample inputs
            if (node.inputs) {
                for (let i = 0; i < node.inputs.length; i++) {
                    const input = node.inputs[i];
                    const sampleValue = this.generateSampleValue(input.type);
                    if (input.type !== LiteGraph.ACTION) setNodeInput(node, i, sampleValue);
                }
                
                if (typeof node.onExecute === 'function') {
                    node.onExecute();
                    results.executionCount++;
                }
            }
            
        } catch (error) {
            results.errors.push({
                type: 'execution_error',
                message: error.message,
                stack: error.stack
            });
        }
        
        return results;
    }

    /**
     * Generate sample values for testing
     */
    generateSampleValue(type) {
        switch (type) {
            case 'number':
                return Math.random() * 100;
            case 'string':
                return 'test_string';
            case 'boolean':
                return Math.random() > 0.5;
            case 'array':
                return [1, 2, 3, 'test'];
            case 'object':
                return { test: 'value', number: 42 };
            case 'vec2':
                return new Float32Array([1.0, 2.0]);
            case 'vec3':
                return new Float32Array([1.0, 2.0, 3.0]);
            case 'vec4':
                return new Float32Array([1.0, 2.0, 3.0, 4.0]);
            default:
                return null;
        }
    }

    /**
     * Execute function with timeout
     */
    async executeWithTimeout(fn, timeout, ...args) {
        return this.executePhase(fn, timeout, undefined, ...args);
    }

    async executePhase(fn, timeout, signal, ...args) {
        return new Promise((resolve, reject) => {
            const finish = (callback, value) => {
                clearTimeout(timer);
                signal?.removeEventListener('abort', abort);
                callback(value);
            };
            const abort = () => finish(reject, Object.assign(new Error('Test canceled'), { name: 'AbortError' }));
            const timer = setTimeout(() => finish(reject, new Error(`Test timed out after ${timeout}ms`)), timeout);
            signal?.addEventListener('abort', abort, { once: true });
            if (signal?.aborted) { abort(); return; }
            Promise.resolve().then(() => {
                if (signal?.aborted) throw Object.assign(new Error('Test canceled'), { name: 'AbortError' });
                return fn(...args);
            }).then(value => finish(resolve, value), error => finish(reject, error));
        });
    }

    /**
     * Get filtered tests based on criteria
     */
    getFilteredTests(filter) {
        const allTests = [];
        
        for (const [nodeType, tests] of this.tests) {
            for (const test of tests) {
                let include = true;
                
                if (filter.nodeType && !nodeType.includes(filter.nodeType)) {
                    include = false;
                }
                
                if (filter.category && test.category !== filter.category) {
                    include = false;
                }
                
                if (filter.priority && test.priority !== filter.priority) {
                    include = false;
                }
                
                if (filter.tags && !filter.tags.some(tag => test.tags.includes(tag))) {
                    include = false;
                }
                
                if (include) {
                    allTests.push(test);
                }
            }
        }
        
        return allTests;
    }

    /**
     * Calculate test coverage
     */
    calculateCoverage() {
        const totalNodeTypes = Object.keys(LiteGraph.registered_node_types).length;
        const testedNodeTypes = new Set();
        
        for (const result of this.results.values()) {
            if (['passed', 'failed'].includes(result.status) && LiteGraph.registered_node_types[result.nodeType]) {
                testedNodeTypes.add(result.nodeType);
            }
        }
        
        this.stats.coverage = totalNodeTypes > 0 ? 
            Number(((testedNodeTypes.size / totalNodeTypes) * 100).toFixed(1)) : 0;
    }

    /**
     * Get memory usage (approximate)
     */
    getMemoryUsage() {
        if (performance.memory) {
            return performance.memory.usedJSHeapSize;
        }
        return 0;
    }

    /**
     * Stop running tests
     */
    stopTests() {
        this.runController?.abort();
        this.emit('testRunStopped');
    }

    /**
     * Get test results
     */
    getResults(filter = {}) {
        const results = [];
        
        for (const [testId, result] of this.results) {
            let include = true;
            
            if (filter.status && result.status !== filter.status) {
                include = false;
            }
            
            if (filter.nodeType && !result.nodeType.includes(filter.nodeType)) {
                include = false;
            }
            
            if (include) {
                results.push(result);
            }
        }
        
        return results;
    }

    /**
     * Clear all results
     */
    clearResults() {
        this.results.clear();
        this.stats = { total: 0, passed: 0, failed: 0, skipped: 0, coverage: 0 };
        this.emit('resultsCleared');
    }

    /**
     * Export test report
     */
    exportReport(format = 'json') {
        const report = {
            timestamp: new Date().toISOString(),
            stats: this.stats,
            config: this.config,
            results: Array.from(this.results.values()),
            nodeTypes: Object.keys(LiteGraph.registered_node_types)
        };
        
        switch (format) {
            case 'json':
                return JSON.stringify(report, null, 2);
            case 'csv':
                return this.exportCSV(report);
            case 'html':
                return this.exportHTML(report);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Export as CSV
     */
    exportCSV(report) {
        const headers = ['Test ID', 'Node Type', 'Status', 'Duration (ms)', 'Errors', 'Warnings'];
        const rows = [headers.join(',')];
        
        for (const result of report.results) {
            const row = [
                result.testId,
                result.nodeType,
                result.status,
                result.duration.toFixed(2),
                result.errors.length,
                result.warnings.length
            ];
            rows.push(row.map(csvCell).join(','));
        }
        
        return rows.join('\n');
    }

    /**
     * Export as HTML
     */
    exportHTML(report) {
        report = { ...report, results: report.results.map(escapeReportResult) };
        return `
<!DOCTYPE html>
<html>
<head>
    <title>LiteGraph Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .stats { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .passed { color: #4CAF50; }
        .failed { color: #F44336; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>LiteGraph Test Report</h1>
    <div class="stats">
        <h3>Test Statistics</h3>
        <p>Total Tests: ${report.stats.total}</p>
        <p class="passed">Passed: ${report.stats.passed}</p>
        <p class="failed">Failed: ${report.stats.failed}</p>
        <p>Coverage: ${report.stats.coverage}%</p>
        <p>Generated: ${report.timestamp}</p>
    </div>
    <table>
        <tr>
            <th>Test ID</th>
            <th>Node Type</th>
            <th>Status</th>
            <th>Duration (ms)</th>
            <th>Errors</th>
            <th>Warnings</th>
        </tr>
        ${report.results.map(result => `
        <tr>
            <td>${result.testId}</td>
            <td>${result.nodeType}</td>
            <td class="${result.status}">${result.status}</td>
            <td>${result.duration.toFixed(2)}</td>
            <td>${result.errors.length}</td>
            <td>${result.warnings.length}</td>
        </tr>
        `).join('')}
    </table>
</body>
</html>`;
    }

    /**
     * Event system
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            for (const callback of this.listeners.get(event)) {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for '${event}':`, error);
                }
            }
        }
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.emit('configUpdated', { config: this.config });
    }

    /**
     * Get current statistics
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Get registered node types for testing
     */
    getAvailableNodeTypes() {
        return Object.keys(LiteGraph.registered_node_types);
    }
}

// Export singleton instance
export const testFramework = new TestFramework();

// Make available globally for debugging
if (typeof window !== 'undefined') {
    window.TestFramework = TestFramework;
    window.testFramework = testFramework;
}

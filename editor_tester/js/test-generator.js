/**
 * Test Case Generator
 * Automatically generates test cases for LiteGraph nodes based on their structure
 */

import { LiteGraph } from "../../build/litegraph.js";

import { setNodeInput } from './test-inputs.js';
import { checkAbort, pause } from './test-control.js';

export class TestCaseGenerator {
    constructor() {
        this.testTemplates = new Map();
        this.nodeAnalysis = new Map();
        this.initializeTemplates();
    }

    /**
     * Initialize test templates for different node categories
     */
    initializeTemplates() {
        // Basic functionality tests
        this.testTemplates.set('basic', {
            name: 'Basic Functionality',
            description: 'Tests basic node creation, inputs, outputs, and execution',
            category: 'basic',
            priority: 'high',
            generate: (nodeType, analysis) => this.generateBasicTest(nodeType, analysis)
        });

        // Input validation tests
        this.testTemplates.set('input_validation', {
            name: 'Input Validation',
            description: 'Tests node behavior with various input types and edge cases',
            category: 'validation',
            priority: 'high',
            generate: (nodeType, analysis) => this.generateInputValidationTest(nodeType, analysis)
        });

        // Output validation tests
        this.testTemplates.set('output_validation', {
            name: 'Output Validation',
            description: 'Tests node output consistency and type correctness',
            category: 'validation',
            priority: 'medium',
            generate: (nodeType, analysis) => this.generateOutputValidationTest(nodeType, analysis)
        });

        // Performance tests
        this.testTemplates.set('performance', {
            name: 'Performance Test',
            description: 'Tests node execution performance and memory usage',
            category: 'performance',
            priority: 'medium',
            generate: (nodeType, analysis) => this.generatePerformanceTest(nodeType, analysis)
        });

        // Stress tests
        this.testTemplates.set('stress', {
            name: 'Stress Test',
            description: 'Tests node behavior under high load and extreme conditions',
            category: 'stress',
            priority: 'low',
            generate: (nodeType, analysis) => this.generateStressTest(nodeType, analysis)
        });

        // Error handling tests
        this.testTemplates.set('error_handling', {
            name: 'Error Handling',
            description: 'Tests node behavior with invalid inputs and error conditions',
            category: 'error',
            priority: 'high',
            generate: (nodeType, analysis) => this.generateErrorHandlingTest(nodeType, analysis)
        });

        // State management tests
        this.testTemplates.set('state_management', {
            name: 'State Management',
            description: 'Tests node property persistence and state changes',
            category: 'state',
            priority: 'medium',
            generate: (nodeType, analysis) => this.generateStateManagementTest(nodeType, analysis)
        });
    }

    /**
     * Generate basic test cases for a node type
     */
    generateBasicTests(nodeType) {
        const analysis = this.analyzeNodeType(nodeType);
        return [this.generateBasicTest(nodeType, analysis)];
    }

    /**
     * Generate input validation test cases for a node type
     */
    generateInputValidationTests(nodeType, nodeInfo) {
        const analysis = this.analyzeNodeType(nodeType);
        const test = this.generateInputValidationTest(nodeType, analysis);
        return test ? [test] : [];
    }

    /**
     * Generate output validation test cases for a node type
     */
    generateOutputValidationTests(nodeType, nodeInfo) {
        const analysis = this.analyzeNodeType(nodeType);
        const test = this.generateOutputValidationTest(nodeType, analysis);
        return test ? [test] : [];
    }

    /**
     * Generate performance test cases for a node type
     */
    generatePerformanceTests(nodeType, nodeInfo, settings = {}) {
        const analysis = this.analyzeNodeType(nodeType);
        const test = this.generatePerformanceTest(nodeType, analysis, settings);
        return test ? [test] : [];
    }

    /**
     * Generate stress test cases for a node type
     */
    generateStressTests(nodeType, nodeInfo) {
        const analysis = this.analyzeNodeType(nodeType);
        const test = this.generateStressTest(nodeType, analysis);
        return test ? [test] : [];
    }

    /**
     * Generate error handling test cases for a node type
     */
    generateErrorHandlingTests(nodeType, nodeInfo) {
        const analysis = this.analyzeNodeType(nodeType);
        const test = this.generateErrorHandlingTest(nodeType, analysis);
        return test ? [test] : [];
    }

    /**
     * Generate state management test cases for a node type
     */
    generateStateManagementTests(nodeType, nodeInfo) {
        const analysis = this.analyzeNodeType(nodeType);
        const test = this.generateStateManagementTest(nodeType, analysis);
        return test ? [test] : [];
    }

    /**
     * Analyze node type structure and capabilities
     */
    analyzeNodeType(nodeType) {
        if (this.nodeAnalysis.has(nodeType)) {
            return this.nodeAnalysis.get(nodeType);
        }
        
        const NodeClass = LiteGraph.registered_node_types[nodeType];
        if (!NodeClass) {
            throw new Error(`Node type '${nodeType}' not registered`);
        }
        
        // Create temporary instance for analysis
        let node;
        try {
            node = LiteGraph.createNode(nodeType);
            if (!node) throw new Error(`Failed to create ${nodeType}`);
        } catch (error) {
            console.warn(`Failed to create instance of ${nodeType}:`, error);
            throw error;
        }
        
        const analysis = {
            nodeType,
            className: NodeClass.name,
            title: node.title || nodeType,
            category: this.extractCategory(nodeType),
            inputs: this.analyzeInputs(node),
            outputs: this.analyzeOutputs(node),
            properties: this.analyzeProperties(node),
            methods: this.analyzeMethods(node),
            flags: this.analyzeFlags(node),
            widgets: this.analyzeWidgets(node),
            size: node.size ? [...node.size] : [140, 80],
            color: node.color || null,
            bgcolor: node.bgcolor || null,
            boxcolor: node.boxcolor || null,
            shape: node.shape || 'box',
            isAsync: this.detectAsyncBehavior(node),
            hasState: this.detectStatefulBehavior(node),
            complexity: this.calculateComplexity(node)
        };
        
        this.nodeAnalysis.set(nodeType, analysis);
        return analysis;
    }

    /**
     * Extract category from node type
     */
    extractCategory(nodeType) {
        const parts = nodeType.split('/');
        return parts.length > 1 ? parts[0] : 'other';
    }

    /**
     * Analyze node inputs
     */
    analyzeInputs(node) {
        if (!node.inputs) return [];
        
        return node.inputs.map((input, index) => ({
            index,
            name: input.name || `input_${index}`,
            type: input.type || 'any',
            link: input.link || null,
            optional: input.optional || false,
            defaultValue: input.default_value,
            description: input.description || ''
        }));
    }

    /**
     * Analyze node outputs
     */
    analyzeOutputs(node) {
        if (!node.outputs) return [];
        
        return node.outputs.map((output, index) => ({
            index,
            name: output.name || `output_${index}`,
            type: output.type || 'any',
            links: output.links ? [...output.links] : [],
            description: output.description || ''
        }));
    }

    /**
     * Analyze node properties
     */
    analyzeProperties(node) {
        if (!node.properties) return {};
        
        const analysis = {};
        
        for (const [key, value] of Object.entries(node.properties)) {
            analysis[key] = {
                value,
                type: typeof value,
                isArray: Array.isArray(value),
                isObject: typeof value === 'object' && value !== null && !Array.isArray(value)
            };
        }
        
        return analysis;
    }

    /**
     * Analyze node methods
     */
    analyzeMethods(node) {
        const methods = {
            lifecycle: [],
            execution: [],
            event: [],
            utility: [],
            custom: []
        };
        
        const lifecycleMethods = [
            'onAdded', 'onRemoved', 'onStart', 'onStop', 'onPause', 'onUnpause'
        ];
        
        const executionMethods = [
            'onExecute', 'onAction', 'onGetInputs', 'onGetOutputs'
        ];
        
        const eventMethods = [
            'onMouseDown', 'onMouseMove', 'onMouseUp', 'onMouseEnter', 'onMouseLeave',
            'onKeyDown', 'onKeyUp', 'onClick', 'onDblClick', 'onResize'
        ];
        
        const utilityMethods = [
            'getTitle', 'getInputData', 'setOutputData', 'trigger', 'triggerSlot'
        ];
        
        for (const prop in node) {
            if (typeof node[prop] === 'function') {
                if (lifecycleMethods.includes(prop)) {
                    methods.lifecycle.push(prop);
                } else if (executionMethods.includes(prop)) {
                    methods.execution.push(prop);
                } else if (eventMethods.includes(prop)) {
                    methods.event.push(prop);
                } else if (utilityMethods.includes(prop)) {
                    methods.utility.push(prop);
                } else {
                    methods.custom.push(prop);
                }
            }
        }
        
        return methods;
    }

    /**
     * Analyze node flags
     */
    analyzeFlags(node) {
        return {
            skip_repeated_outputs: node.skip_repeated_outputs || false,
            serialize_widgets: node.serialize_widgets || false,
            clip_area: node.clip_area || false,
            collapsable: node.collapsable !== false,
            resizable: node.resizable !== false,
            horizontal: node.horizontal || false,
            widgets_up: node.widgets_up || false,
            widgets_start_y: node.widgets_start_y || 4
        };
    }

    /**
     * Analyze node widgets
     */
    analyzeWidgets(node) {
        if (!node.widgets) return [];
        
        return node.widgets.map((widget, index) => ({
            index,
            name: widget.name || `widget_${index}`,
            type: widget.type || 'unknown',
            value: widget.value,
            options: widget.options || {},
            callback: typeof widget.callback === 'function'
        }));
    }

    /**
     * Detect if node has async behavior
     */
    detectAsyncBehavior(node) {
        // Check for async methods or patterns
        const asyncIndicators = [
            'onExecute', 'onAction', 'onStart'
        ];
        
        for (const method of asyncIndicators) {
            if (typeof node[method] === 'function') {
                const methodStr = node[method].toString();
                if (methodStr.includes('async') || methodStr.includes('await') || 
                    methodStr.includes('Promise') || methodStr.includes('setTimeout') ||
                    methodStr.includes('setInterval')) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Detect if node has stateful behavior
     */
    detectStatefulBehavior(node) {
        // Check for properties, widgets, or state-related methods
        return !!(node.properties && Object.keys(node.properties).length > 0) ||
               !!(node.widgets && node.widgets.length > 0) ||
               typeof node.onPropertyChanged === 'function' ||
               typeof node.onWidgetChanged === 'function';
    }

    /**
     * Calculate node complexity score
     */
    calculateComplexity(node) {
        let score = 0;
        
        // Base complexity
        score += 1;
        
        // Inputs/outputs complexity
        score += (node.inputs ? node.inputs.length : 0) * 0.5;
        score += (node.outputs ? node.outputs.length : 0) * 0.5;
        
        // Properties complexity
        score += (node.properties ? Object.keys(node.properties).length : 0) * 0.3;
        
        // Widgets complexity
        score += (node.widgets ? node.widgets.length : 0) * 0.4;
        
        // Method complexity
        let methodCount = 0;
        for (const prop in node) {
            if (typeof node[prop] === 'function' && !prop.startsWith('_')) {
                methodCount++;
            }
        }
        score += methodCount * 0.2;
        
        return Math.round(score * 10) / 10;
    }

    /**
     * Generate basic functionality test
     */
    generateBasicTest(nodeType, analysis) {
        return {
            name: `Basic Functionality - ${analysis.title}`,
            description: `Tests basic creation, inputs, outputs, and execution of ${nodeType}`,
            category: 'basic',
            priority: 'high',
            timeout: 5000,
            expectedInputs: analysis.inputs,
            expectedOutputs: analysis.outputs,
            setup: (node, graph) => {
                // Basic setup - node should be created and added to graph
                if (!node || !graph) {
                    throw new Error('Node or graph not provided');
                }
            },
            execute: (node, graph) => {
                const results = { executed: false, outputs: [] };
                
                // Test basic execution
                if (typeof node.onExecute === 'function') {
                    node.onExecute();
                    results.executed = true;
                }
                
                // Capture outputs
                if (node.outputs) {
                    for (let i = 0; i < node.outputs.length; i++) {
                        results.outputs.push({
                            index: i,
                            name: node.outputs[i].name,
                            type: node.outputs[i].type,
                            value: node.getOutputData(i)
                        });
                    }
                }
                
                return results;
            },
            validate: (node, graph, executionResult) => {
                const validation = { passed: true, issues: [] };
                
                // Validate node structure
                if (!node.title) {
                    validation.issues.push('Node missing title');
                }
                
                // Validate execution
                if (typeof node.onExecute === 'function' && !executionResult.executed) {
                    validation.issues.push('Node execution failed');
                    validation.passed = false;
                }
                
                return validation;
            }
        };
    }

    /**
     * Generate input validation test
     */
    generateInputValidationTest(nodeType, analysis) {
        if (!analysis.inputs.length) {
            return null; // Skip if no inputs
        }
        
        return {
            name: `Input Validation - ${analysis.title}`,
            description: `Tests input handling and validation for ${nodeType}`,
            category: 'validation',
            priority: 'high',
            timeout: 5000,
            expectedInputs: analysis.inputs,
            execute: (node, graph) => {
                const results = { inputTests: [] };
                
                // Test each input with various data types
                for (let i = 0; i < analysis.inputs.length; i++) {
                    const input = analysis.inputs[i];
                    const testValues = this.generateTestValues(input.type);
                    
                    const inputResult = {
                        index: i,
                        name: input.name,
                        type: input.type,
                        tests: []
                    };
                    
                    for (const testValue of testValues) {
                        try {
                            setNodeInput(node, i, testValue.value);
                            
                            if (typeof node.onExecute === 'function') {
                                node.onExecute();
                            }
                            
                            inputResult.tests.push({
                                value: testValue.value,
                                type: testValue.type,
                                description: testValue.description,
                                success: true,
                                error: null
                            });
                            
                        } catch (error) {
                            inputResult.tests.push({
                                value: testValue.value,
                                type: testValue.type,
                                description: testValue.description,
                                success: false,
                                error: error.message
                            });
                        }
                    }
                    
                    results.inputTests.push(inputResult);
                }
                
                return results;
            },
            validate: (node, graph, executionResult) => {
                const validation = { passed: true, issues: [] };
                
                for (const inputTest of executionResult.inputTests) {
                    const failedTests = inputTest.tests.filter(t => !t.success);
                    
                    if (failedTests.length > 0) {
                        validation.issues.push(
                            `Input ${inputTest.name} failed ${failedTests.length}/${inputTest.tests.length} tests`
                        );
                    }
                }
                
                return validation;
            }
        };
    }

    /**
     * Generate output validation test
     */
    generateOutputValidationTest(nodeType, analysis) {
        if (!analysis.outputs.length) {
            return null; // Skip if no outputs
        }
        
        return {
            name: `Output Validation - ${analysis.title}`,
            description: `Tests output consistency and type correctness for ${nodeType}`,
            category: 'validation',
            priority: 'medium',
            timeout: 5000,
            expectedOutputs: analysis.outputs,
            execute: (node, graph) => {
                const results = { outputTests: [] };
                
                // Execute multiple times and check output consistency
                const executions = 5;
                const outputHistory = [];
                
                for (let exec = 0; exec < executions; exec++) {
                    if (typeof node.onExecute === 'function') {
                        node.onExecute();
                    }
                    
                    const outputs = [];
                    if (node.outputs) {
                        for (let i = 0; i < node.outputs.length; i++) {
                            outputs.push({
                                index: i,
                                name: node.outputs[i].name,
                                type: node.outputs[i].type,
                                value: node.getOutputData(i)
                            });
                        }
                    }
                    
                    outputHistory.push(outputs);
                }
                
                results.outputHistory = outputHistory;
                return results;
            },
            validate: (node, graph, executionResult) => {
                const validation = { passed: true, issues: [] };
                
                if (executionResult.outputHistory.length < 2) {
                    return validation;
                }
                
                // Check output consistency
                const firstExecution = executionResult.outputHistory[0];
                
                for (let i = 1; i < executionResult.outputHistory.length; i++) {
                    const currentExecution = executionResult.outputHistory[i];
                    
                    if (firstExecution.length !== currentExecution.length) {
                        validation.issues.push('Output count inconsistent between executions');
                        validation.passed = false;
                        continue;
                    }
                    
                    for (let j = 0; j < firstExecution.length; j++) {
                        const firstOutput = firstExecution[j];
                        const currentOutput = currentExecution[j];
                        
                        if (firstOutput.type !== currentOutput.type) {
                            validation.issues.push(
                                `Output ${j} type changed from ${firstOutput.type} to ${currentOutput.type}`
                            );
                        }
                    }
                }
                
                return validation;
            }
        };
    }

    /**
     * Generate performance test
     */
    generatePerformanceTest(nodeType, analysis, settings = {}) {
        const { benchmarkIterations = 100, warmupIterations = 10, maxExecutionTime = 1000, maxMemoryUsage = 50 * 1024 * 1024 } = settings;
        if (!Number.isInteger(benchmarkIterations) || benchmarkIterations < 1 || benchmarkIterations > 1000 ||
            !Number.isInteger(warmupIterations) || warmupIterations < 0 || warmupIterations > 100 ||
            !Number.isFinite(maxExecutionTime) || maxExecutionTime <= 0 || !Number.isFinite(maxMemoryUsage) || maxMemoryUsage <= 0) {
            throw new Error('Invalid benchmark settings');
        }
        return {
            name: `Performance Test - ${analysis.title}`,
            description: `Measures synchronous node execution with representative inputs for ${nodeType}`,
            category: 'performance', priority: 'medium', timeout: 10000,
            execute: async (node, graph, { signal } = {}) => {
                this.prepareLoadInputs(node, analysis);
                const memorySupported = Number.isFinite(performance.memory?.usedJSHeapSize);
                const baseline = memorySupported ? performance.memory.usedJSHeapSize : null;
                const results = { executionTimes: [], memoryUsage: [], memorySupported, iterations: benchmarkIterations };
                for (let i = 0; i < warmupIterations + benchmarkIterations; i++) {
                    if (i % 25 === 0) await pause(0, signal);
                    checkAbort(signal);
                    const start = performance.now();
                    node.doExecute();
                    const duration = performance.now() - start;
                    if (i >= warmupIterations) {
                        results.executionTimes.push(duration);
                        if (memorySupported) results.memoryUsage.push(performance.memory.usedJSHeapSize - baseline);
                    }
                }
                return results;
            },
            validate: (node, graph, result) => {
                const times = result.executionTimes;
                const issues = [];
                if (!times.length) issues.push('No execution times recorded');
                const maximum = times.length ? Math.max(...times) : null;
                const memory = result.memorySupported && result.memoryUsage.length ? Math.max(...result.memoryUsage) : null;
                if (maximum > maxExecutionTime) issues.push(`Maximum execution time ${maximum.toFixed(2)}ms exceeds ${maxExecutionTime}ms`);
                if (memory > maxMemoryUsage) issues.push(`Observed heap growth ${memory} bytes exceeds ${maxMemoryUsage} bytes`);
                return { passed: issues.length === 0, issues, metrics: {
                    averageExecutionTime: times.length ? times.reduce((sum, time) => sum + time, 0) / times.length : null,
                    maxExecutionTime: maximum, minExecutionTime: times.length ? Math.min(...times) : null,
                    totalIterations: times.length, observedHeapGrowth: memory,
                } };
            }
        };
    }

    prepareLoadInputs(node, analysis) {
        if (typeof node.onExecute !== 'function') throw new Error('Load scenarios require a synchronous onExecute node');
        for (const input of analysis.inputs) {
            if (input.type === LiteGraph.EVENT || input.type === LiteGraph.ACTION) continue;
            const sample = this.generateTestValues(input.type).find(item => item.value != null);
            setNodeInput(node, input.index, input.defaultValue ?? sample?.value);
        }
    }

    /** Generated load scenarios yield in bounded batches so Stop and timeouts run. */
    generateStressTest(nodeType, analysis) {
        return {
            name: `Stress Test - ${analysis.title}`,
            description: `Tests repeated synchronous execution for ${nodeType}`,
            category: 'stress', priority: 'low', timeout: 30000,
            execute: async (node, graph, { signal } = {}) => {
                this.prepareLoadInputs(node, analysis);
                const results = { iterations: 1000, errors: [], completed: 0 };
                for (let i = 0; i < results.iterations; i++) {
                    if (i % 25 === 0) await pause(0, signal);
                    checkAbort(signal);
                    try { node.doExecute(); results.completed++; }
                    catch (error) { results.errors.push({ iteration: i, error: error.message }); }
                }
                return results;
            },
            validate: (node, graph, result) => {
                const errorRate = result.errors.length / result.iterations;
                const issues = errorRate > 0.01 ? [`High error rate under stress: ${(errorRate * 100).toFixed(2)}%`] : [];
                return { passed: issues.length === 0, issues };
            }
        };
    }

    /**
     * Generate error handling test
     */
    generateErrorHandlingTest(nodeType, analysis) {
        return {
            name: `Error Handling - ${analysis.title}`,
            description: `Tests node behavior with invalid inputs and error conditions for ${nodeType}`,
            category: 'error',
            priority: 'high',
            timeout: 5000,
            execute: (node, graph) => {
                const results = { errorTests: [] };
                
                // Test with invalid inputs
                if (analysis.inputs.length > 0) {
                    const invalidValues = [
                        { value: null, description: 'null value' },
                        { value: undefined, description: 'undefined value' },
                        { value: NaN, description: 'NaN value' },
                        { value: Infinity, description: 'Infinity value' },
                        { value: -Infinity, description: 'negative Infinity value' },
                        { value: {}, description: 'empty object' },
                        { value: [], description: 'empty array' },
                        { value: '', description: 'empty string' }
                    ];
                    
                    for (const invalidValue of invalidValues) {
                        try {
                            // Set invalid input
                            setNodeInput(node, 0, invalidValue.value);
                            
                            if (typeof node.onExecute === 'function') {
                                node.onExecute();
                            }
                            
                            results.errorTests.push({
                                test: invalidValue.description,
                                crashed: false,
                                error: null
                            });
                            
                        } catch (error) {
                            results.errorTests.push({
                                test: invalidValue.description,
                                crashed: true,
                                error: error.message
                            });
                        }
                    }
                }
                
                return results;
            },
            validate: (node, graph, executionResult) => {
                const validation = { passed: true, issues: [] };
                
                const crashedTests = executionResult.errorTests.filter(t => t.crashed);
                
                if (crashedTests.length > 0) {
                    validation.issues.push(
                        `Node crashed with ${crashedTests.length} invalid inputs`
                    );
                    // Note: This might not always be a failure - some crashes might be expected
                }
                
                return validation;
            }
        };
    }

    /**
     * Generate state management test
     */
    generateStateManagementTest(nodeType, analysis) {
        if (!analysis.hasState) {
            return null; // Skip if node has no state
        }
        
        return {
            name: `State Management - ${analysis.title}`,
            description: `Tests property persistence and state changes for ${nodeType}`,
            category: 'state',
            priority: 'medium',
            timeout: 5000,
            execute: (node, graph) => {
                const results = { stateTests: [] };
                
                // Test property changes
                if (node.properties) {
                    const originalProperties = JSON.parse(JSON.stringify(node.properties));
                    
                    for (const [key, value] of Object.entries(node.properties)) {
                        const originalValue = value;
                        let testValue;
                        
                        // Generate test value based on type
                        if (typeof value === 'number') {
                            testValue = value + 1;
                        } else if (typeof value === 'string') {
                            // Special handling for code properties to avoid syntax errors
                            if (key === 'code' && value.includes('function')) {
                                // For code properties, use a simple valid modification
                                testValue = '// Modified code\n' + value;
                            } else {
                                testValue = value + '_modified';
                            }
                        } else if (typeof value === 'boolean') {
                            testValue = !value;
                        } else {
                            continue; // Skip complex types
                        }
                        
                        try {
                            // Change property
                            node.properties[key] = testValue;
                            
                            // Trigger property change if method exists
                            if (typeof node.onPropertyChanged === 'function') {
                                node.onPropertyChanged(key, testValue, originalValue);
                            }
                            
                            // Execute node
                            if (typeof node.onExecute === 'function') {
                                node.onExecute();
                            }
                            
                            results.stateTests.push({
                                property: key,
                                originalValue,
                                testValue,
                                currentValue: node.properties[key],
                                success: true,
                                error: null
                            });
                            
                            // Restore original value
                            node.properties[key] = originalValue;
                            
                        } catch (error) {
                            results.stateTests.push({
                                property: key,
                                originalValue,
                                testValue,
                                currentValue: node.properties[key],
                                success: false,
                                error: error.message
                            });
                            
                            // Restore original value
                            node.properties[key] = originalValue;
                        }
                    }
                }
                
                return results;
            },
            validate: (node, graph, executionResult) => {
                const validation = { passed: true, issues: [] };
                
                const failedTests = executionResult.stateTests.filter(t => !t.success);
                
                if (failedTests.length > 0) {
                    validation.issues.push(
                        `${failedTests.length} property changes caused errors`
                    );
                }
                
                return validation;
            }
        };
    }

    /**
     * Generate test values for different data types
     */
    generateTestValues(type) {
        const baseValues = [
            { value: null, type: 'null', description: 'null value' },
            { value: undefined, type: 'undefined', description: 'undefined value' }
        ];
        
        switch (type) {
            case 'number':
                return baseValues.concat([
                    { value: 0, type: 'number', description: 'zero' },
                    { value: 1, type: 'number', description: 'positive integer' },
                    { value: -1, type: 'number', description: 'negative integer' },
                    { value: 3.14159, type: 'number', description: 'positive float' },
                    { value: -2.718, type: 'number', description: 'negative float' },
                    { value: NaN, type: 'number', description: 'NaN' },
                    { value: Infinity, type: 'number', description: 'Infinity' },
                    { value: -Infinity, type: 'number', description: 'negative Infinity' }
                ]);
                
            case 'string':
                return baseValues.concat([
                    { value: '', type: 'string', description: 'empty string' },
                    { value: 'test', type: 'string', description: 'simple string' },
                    { value: 'Hello, World!', type: 'string', description: 'string with punctuation' },
                    { value: '123', type: 'string', description: 'numeric string' },
                    { value: 'true', type: 'string', description: 'boolean string' },
                    { value: '\n\t\r', type: 'string', description: 'whitespace string' }
                ]);
                
            case 'boolean':
                return baseValues.concat([
                    { value: true, type: 'boolean', description: 'true' },
                    { value: false, type: 'boolean', description: 'false' }
                ]);
                
            case 'array':
                return baseValues.concat([
                    { value: [], type: 'array', description: 'empty array' },
                    { value: [1, 2, 3], type: 'array', description: 'number array' },
                    { value: ['a', 'b', 'c'], type: 'array', description: 'string array' },
                    { value: [1, 'two', true], type: 'array', description: 'mixed array' }
                ]);
                
            case 'object':
                return baseValues.concat([
                    { value: {}, type: 'object', description: 'empty object' },
                    { value: { a: 1, b: 2 }, type: 'object', description: 'simple object' },
                    { value: { nested: { value: 42 } }, type: 'object', description: 'nested object' }
                ]);
                
            default:
                return baseValues.concat([
                    { value: 42, type: 'number', description: 'number' },
                    { value: 'test', type: 'string', description: 'string' },
                    { value: true, type: 'boolean', description: 'boolean' },
                    { value: [], type: 'array', description: 'array' },
                    { value: {}, type: 'object', description: 'object' }
                ]);
        }
    }

    /**
     * Get analysis for a node type
     */
    getNodeAnalysis(nodeType) {
        return this.nodeAnalysis.get(nodeType);
    }

    /**
     * Clear analysis cache
     */
    clearCache() {
        this.nodeAnalysis.clear();
    }
}

export default TestCaseGenerator;
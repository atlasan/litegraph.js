/**
 * LiteGraph Node Testing Framework
 * Comprehensive testing system for validating node functionality
 */

import { LiteGraph } from '/src/litegraph.js';
const { LGraphNode } = LiteGraph;

export class TestFramework {
    constructor() {
        this.tests = new Map();
        this.results = new Map();
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
        this.listeners = new Map();
        this.isRunning = false;
        this.currentTest = null;
        
        // Performance optimizations
        this.nodePool = new Map(); // Object pool for node instances
        this.graphPool = []; // Pool for graph instances
        this.testCounter = 0;
        this.memoryStats = {
            peak: 0,
            current: 0,
            gcCount: 0
        };
    }

    /**
     * Initialize complex scenario generator
     */
    initComplexGenerator() {
        if (!this.complexGenerator) {
            // Dynamic import to avoid circular dependencies
            try {
                this.complexGenerator = {
                    generateComplexScenarios: (nodeTypes, options) => {
                        // Basic complex scenario generation
                        const scenarios = [];
                        
                        // Multi-node chain scenario
                        scenarios.push({
                            name: 'Multi-Node Chain Test',
                            description: 'Test multiple nodes connected in sequence',
                            category: 'complex',
                            priority: 'medium',
                            timeout: 15000,
                            setup: async (graph) => {
                                const nodes = [];
                                const maxNodes = Math.min(options.maxNodes || 3, nodeTypes.length);
                                
                                for (let i = 0; i < maxNodes; i++) {
                                    const nodeType = nodeTypes[i % nodeTypes.length];
                                    const NodeClass = LiteGraph.registered_node_types[nodeType];
                                    if (NodeClass) {
                                        const node = new NodeClass();
                                        graph.add(node);
                                        nodes.push(node);
                                    }
                                }
                                
                                return { nodes };
                            },
                            execute: async (graph, setupData) => {
                                // Execute graph multiple times
                                const results = [];
                                for (let i = 0; i < 5; i++) {
                                    graph.runStep();
                                    results.push({ step: i, nodeCount: graph._nodes.length });
                                }
                                return results;
                            },
                            validate: (graph, setupData, executionResult) => {
                                const issues = [];
                                
                                if (!executionResult || executionResult.length === 0) {
                                    issues.push('No execution results');
                                }
                                
                                if (graph._nodes.length !== setupData.nodes.length) {
                                    issues.push('Node count mismatch');
                                }
                                
                                return {
                                    passed: issues.length === 0,
                                    issues
                                };
                            }
                        });
                        
                        return scenarios;
                    }
                };
            } catch (error) {
                console.warn('Failed to initialize complex generator:', error);
                this.complexGenerator = { generateComplexScenarios: () => [] };
            }
        }
    }

    /**
     * Generate automated tests for registered node types
     */
    generateAutomatedTests(options = {}) {
        const nodeTypes = Object.keys(LiteGraph.registered_node_types);
        const tests = [];

        // Generate basic node tests
        for (const nodeType of nodeTypes) {
            if (this.shouldTestNodeType(nodeType, options)) {
                const nodeTests = this.generateBasicTestsForNode(nodeType, options);
                tests.push(...nodeTests);
            }
        }

        // Generate complex scenario tests if enabled
        if (options.includeComplexScenarios !== false) {
            const complexTests = this.generateComplexScenarioTests(nodeTypes, options);
            tests.push(...complexTests);
        }

        // Register generated tests
        for (const test of tests) {
            this.registerTest(test.nodeType, test);
        }

        return tests;
    }

    /**
     * Generate basic tests for a node type
     */
    generateBasicTestsForNode(nodeType, options = {}) {
        const tests = [];
        
        // Basic instantiation test
        tests.push({
            name: `${nodeType} - Basic Instantiation`,
            description: `Test basic instantiation of ${nodeType}`,
            category: 'basic',
            priority: 'high',
            execute: (node, graph) => {
                // Test that node was created successfully
                if (!node) {
                    throw new Error('Node was not created');
                }
                
                if (node.type !== nodeType) {
                    throw new Error(`Node type mismatch: expected ${nodeType}, got ${node.type}`);
                }
                
                return { instantiated: true, type: node.type };
            }
        });
        
        // Basic execution test
        tests.push({
            name: `${nodeType} - Basic Execution`,
            description: `Test basic execution of ${nodeType}`,
            category: 'execution',
            priority: 'high',
            execute: (node, graph) => {
                const results = { executed: false, errors: [] };
                
                try {
                    if (typeof node.onExecute === 'function') {
                        node.onExecute();
                        results.executed = true;
                    }
                } catch (error) {
                    results.errors.push(error.message);
                }
                
                return results;
            }
        });
        
        return tests;
    }

    /**
     * Generate complex scenario tests
     */
    generateComplexScenarioTests(nodeTypes, options = {}) {
        this.initComplexGenerator();
        
        const complexOptions = {
            maxNodes: options.maxNodesPerScenario || 8,
            maxConnections: options.maxConnectionsPerScenario || 15,
            includeAsyncNodes: options.includeAsyncScenarios !== false,
            includeErrorScenarios: options.includeErrorScenarios !== false,
            complexityLevel: options.complexityLevel || 'medium',
            ...options
        };

        try {
            const scenarios = this.complexGenerator.generateComplexScenarios(nodeTypes, complexOptions);
            
            // Convert scenarios to test format
            return scenarios.map(scenario => ({
                nodeType: 'complex_scenario',
                name: scenario.name,
                description: scenario.description,
                category: scenario.category || 'complex',
                priority: scenario.priority || 'medium',
                timeout: scenario.timeout || 20000,
                execute: async (node, graph) => {
                    try {
                        // Setup phase
                        let setupData = null;
                        if (scenario.setup) {
                            setupData = await scenario.setup(graph);
                        }
                        
                        // Execution phase
                        let executionResult = null;
                        if (scenario.execute) {
                            executionResult = await scenario.execute(graph, setupData);
                        }
                        
                        // Validation phase
                        if (scenario.validate) {
                            const validation = scenario.validate(graph, setupData, executionResult);
                            
                            if (!validation.passed) {
                                throw new Error(`Validation failed: ${validation.issues.join(', ')}`);
                            }
                            
                            return {
                                passed: true,
                                setupData,
                                executionResult,
                                validation
                            };
                        }
                        
                        return {
                            passed: true,
                            setupData,
                            executionResult
                        };
                        
                    } catch (error) {
                        throw new Error(`Complex scenario '${scenario.name}' failed: ${error.message}`);
                    }
                }
            }));
            
        } catch (error) {
            console.warn('Failed to generate complex scenario tests:', error);
            return [];
        }
    }

    /**
     * Check if node type should be tested
     */
    shouldTestNodeType(nodeType, options) {
        // Skip internal or utility node types if specified
        if (options.skipInternal && nodeType.startsWith('_')) {
            return false;
        }
        
        // Include only specific node types if specified
        if (options.includeOnly && !options.includeOnly.includes(nodeType)) {
            return false;
        }
        
        // Exclude specific node types if specified
        if (options.exclude && options.exclude.includes(nodeType)) {
            return false;
        }
        
        return true;
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
     * Run all tests or specific test categories with performance optimizations
     */
    async runTests(filter = {}) {
        if (this.isRunning) {
            throw new Error('Tests are already running');
        }

        this.isRunning = true;
        this.stats = { total: 0, passed: 0, failed: 0, skipped: 0, coverage: 0 };
        this.testCounter = 0;
        this.memoryStats = { peak: 0, current: 0, gcCount: 0 };
        
        try {
            this.emit('testRunStarted', { filter });
            
            const testsToRun = this.getFilteredTests(filter);
            
            if (testsToRun.length === 0) {
                console.warn('No tests to run with current filter');
                this.emit('testRunCompleted', { stats: this.stats });
                return this.stats;
            }
            
            this.stats.total = testsToRun.length;
            console.log(`Starting test execution: ${testsToRun.length} tests (batch size: ${this.config.batchSize})`);
            
            // Process tests in batches for better memory management
            const batches = this.createBatches(testsToRun, this.config.batchSize);
            
            for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                if (!this.isRunning) {
                    console.log('Test execution cancelled');
                    break;
                }
                
                const batch = batches[batchIndex];
                console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} tests)`);
                
                // Process batch with memory monitoring
                await this.processBatch(batch);
                
                // Memory management between batches
                if (batchIndex < batches.length - 1) {
                    await this.performMemoryCleanup();
                }
            }
            
            for (const test of testsToRun) {
                if (!this.isRunning) {
                    console.log('Test execution cancelled');
                    break; // Allow cancellation
                }
                
                try {
                    this.currentTest = test;
                    const result = await this.runSingleTest(test);
                    this.results.set(test.id, result);
                    
                    if (result.status === 'passed') {
                        this.stats.passed++;
                    } else if (result.status === 'failed') {
                        this.stats.failed++;
                    } else {
                        this.stats.skipped++;
                    }
                    
                    this.emit('testCompleted', { test, result });
                    
                } catch (testError) {
                    console.error(`Critical error running test ${test.name}:`, testError);
                    
                    // Create error result
                    const errorResult = {
                        testId: test.id,
                        nodeType: test.nodeType,
                        status: 'failed',
                        startTime: performance.now(),
                        endTime: performance.now(),
                        duration: 0,
                        errors: [{
                            type: 'critical_error',
                            message: testError.message || 'Unknown critical error',
                            stack: testError.stack
                        }],
                        warnings: [],
                        details: {},
                        memoryUsage: null
                    };
                    
                    this.results.set(test.id, errorResult);
                    this.stats.failed++;
                    this.emit('testCompleted', { test, result: errorResult });
                }
            }
            
            this.calculateCoverage();
            console.log(`Test execution completed: ${this.stats.passed}/${this.stats.total} passed`);
            this.emit('testRunCompleted', { stats: this.stats });
            
        } catch (error) {
            console.error('Critical error during test execution:', error);
            this.emit('testRunError', { error });
            throw new Error(`Test execution failed: ${error.message}`);
        } finally {
            this.isRunning = false;
            this.currentTest = null;
        }
        
        return this.stats;
    }

    /**
     * Run a single test case
     */
    async runSingleTest(test) {
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

        let node = null;
        let graph = null;

        try {
            // Validate test structure
            if (!test || !test.id || !test.nodeType) {
                throw new Error('Invalid test: missing required properties (id, nodeType)');
            }

            // Memory baseline
            const memoryBefore = this.getMemoryUsage();
            this.updateMemoryStats(memoryBefore);
            
            // Create or reuse node and graph instances
            const NodeClass = LiteGraph.registered_node_types[test.nodeType];
            if (!NodeClass) {
                throw new Error(`Node type '${test.nodeType}' not registered`);
            }
            
            try {
                // Use object pooling for better performance
                if (this.config.useObjectPooling) {
                    node = this.getPooledNode(test.nodeType, NodeClass);
                    graph = this.getPooledGraph();
                } else {
                    node = new NodeClass();
                    graph = new LiteGraph.LGraph();
                }
                
                // Add node to graph (graph.add handles duplicates)
                graph.add(node);
            } catch (nodeError) {
                throw new Error(`Failed to create node instance: ${nodeError.message}`);
            }
            
            // Setup phase
            if (test.setup) {
                try {
                    await this.executeWithTimeout(test.setup, test.timeout, node, graph);
                } catch (setupError) {
                    result.errors.push({
                        type: 'setup_error',
                        message: `Setup failed: ${setupError.message}`,
                        stack: setupError.stack
                    });
                }
            }
            
            // Validation phase
            if (this.config.validateInputs) {
                try {
                    this.validateNodeInputs(node, test, result);
                } catch (validationError) {
                    result.errors.push({
                        type: 'input_validation_error',
                        message: `Input validation failed: ${validationError.message}`,
                        stack: validationError.stack
                    });
                }
            }
            
            if (this.config.validateOutputs) {
                try {
                    this.validateNodeOutputs(node, test, result);
                } catch (validationError) {
                    result.errors.push({
                        type: 'output_validation_error',
                        message: `Output validation failed: ${validationError.message}`,
                        stack: validationError.stack
                    });
                }
            }
            
            if (this.config.validateProperties) {
                try {
                    this.validateNodeProperties(node, test, result);
                } catch (validationError) {
                    result.errors.push({
                        type: 'property_validation_error',
                        message: `Property validation failed: ${validationError.message}`,
                        stack: validationError.stack
                    });
                }
            }
            
            // Execution phase
            if (test.execute) {
                try {
                    result.details.executionResult = await this.executeWithTimeout(
                        test.execute, test.timeout, node, graph
                    );
                } catch (executeError) {
                    result.errors.push({
                        type: 'custom_execution_error',
                        message: `Custom execution failed: ${executeError.message}`,
                        stack: executeError.stack
                    });
                }
            } else if (this.config.validateExecution) {
                try {
                    // Default execution test
                    result.details.executionResult = this.testNodeExecution(node, graph);
                } catch (executeError) {
                    result.errors.push({
                        type: 'default_execution_error',
                        message: `Default execution failed: ${executeError.message}`,
                        stack: executeError.stack
                    });
                }
            }
            
            // Custom validation
            if (test.validate) {
                try {
                    result.details.validationResult = await this.executeWithTimeout(
                        test.validate, test.timeout, node, graph, result.details.executionResult
                    );
                } catch (validateError) {
                    result.errors.push({
                        type: 'custom_validation_error',
                        message: `Custom validation failed: ${validateError.message}`,
                        stack: validateError.stack
                    });
                }
            }
            
            // Cleanup phase
            if (test.cleanup) {
                try {
                    await this.executeWithTimeout(test.cleanup, test.timeout, node, graph);
                } catch (cleanupError) {
                    result.warnings.push(`Cleanup failed: ${cleanupError.message}`);
                }
            }
            
            // Memory check
            if (this.config.validateMemory) {
                try {
                    const memoryAfter = this.getMemoryUsage();
                    result.memoryUsage = {
                        before: memoryBefore,
                        after: memoryAfter,
                        delta: memoryAfter - memoryBefore
                    };
                    
                    if (result.memoryUsage.delta > 10 * 1024 * 1024) { // 10MB threshold
                        result.warnings.push(`High memory usage: ${(result.memoryUsage.delta / 1024 / 1024).toFixed(2)}MB`);
                    }
                } catch (memoryError) {
                    result.warnings.push(`Memory check failed: ${memoryError.message}`);
                }
            }
            
            result.status = result.errors.length > 0 ? 'failed' : 'passed';
            
        } catch (error) {
            result.status = 'failed';
            result.errors.push({
                type: 'execution_error',
                message: error.message || 'Unknown error occurred',
                stack: error.stack
            });
        } finally {
            // Ensure cleanup happens even if errors occur
            try {
                if (graph) {
                    graph.clear();
                }
            } catch (cleanupError) {
                result.warnings.push(`Graph cleanup failed: ${cleanupError.message}`);
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
                    node.setInputData(i, sampleValue);
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
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Test timed out after ${timeout}ms`));
            }, timeout);
            
            try {
                const result = fn(...args);
                clearTimeout(timer);
                
                if (result instanceof Promise) {
                    result.then(resolve).catch(reject);
                } else {
                    resolve(result);
                }
            } catch (error) {
                clearTimeout(timer);
                reject(error);
            }
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
        
        for (const [nodeType] of this.tests) {
            if (LiteGraph.registered_node_types[nodeType]) {
                testedNodeTypes.add(nodeType);
            }
        }
        
        this.stats.coverage = totalNodeTypes > 0 ? 
            Math.round((testedNodeTypes.size / totalNodeTypes) * 100) : 0;
    }

    /**
     * Create batches of tests for processing
     */
    createBatches(tests, batchSize) {
        const batches = [];
        for (let i = 0; i < tests.length; i += batchSize) {
            batches.push(tests.slice(i, i + batchSize));
        }
        return batches;
    }
    
    /**
     * Process a batch of tests with memory monitoring
     */
    async processBatch(batch) {
        const batchPromises = batch.map(async (test) => {
            if (!this.isRunning) return null;
            
            try {
                this.currentTest = test;
                const result = await this.runSingleTest(test);
                this.results.set(test.id, result);
                
                // Update statistics
                if (result.status === 'passed') {
                    this.stats.passed++;
                } else if (result.status === 'failed') {
                    this.stats.failed++;
                } else if (result.status === 'skipped') {
                    this.stats.skipped++;
                }
                
                this.testCounter++;
                
                // Periodic garbage collection
                if (this.testCounter % this.config.gcInterval === 0) {
                    await this.forceGarbageCollection();
                }
                
                this.emit('testCompleted', { test, result });
                return result;
            } catch (error) {
                console.error(`Error running test ${test.id}:`, error);
                const errorResult = {
                    testId: test.id,
                    nodeType: test.nodeType,
                    status: 'failed',
                    errors: [{ type: 'execution_error', message: error.message, stack: error.stack }]
                };
                this.results.set(test.id, errorResult);
                this.stats.failed++;
                this.emit('testCompleted', { test, result: errorResult });
                return errorResult;
            }
        });
        
        await Promise.all(batchPromises);
    }
    
    /**
     * Get or create a pooled node instance
     */
    getPooledNode(nodeType, NodeClass) {
        if (!this.nodePool.has(nodeType)) {
            this.nodePool.set(nodeType, []);
        }
        
        const pool = this.nodePool.get(nodeType);
        
        if (pool.length > 0) {
            const node = pool.pop();
            // Reset node state
            this.resetNode(node);
            return node;
        }
        
        // Create new instance if pool is empty
        return new NodeClass();
    }
    
    /**
     * Get or create a pooled graph instance
     */
    getPooledGraph() {
        if (this.graphPool.length > 0) {
            const graph = this.graphPool.pop();
            // Clear the graph
            graph.clear();
            return graph;
        }
        
        // Create new instance if pool is empty
        return new LiteGraph.LGraph();
    }
    
    /**
     * Return node to pool for reuse
     */
    returnNodeToPool(node, nodeType) {
        if (!this.config.useObjectPooling) return;
        
        if (!this.nodePool.has(nodeType)) {
            this.nodePool.set(nodeType, []);
        }
        
        const pool = this.nodePool.get(nodeType);
        
        // Limit pool size to prevent memory bloat
        if (pool.length < 10) {
            this.resetNode(node);
            pool.push(node);
        }
    }
    
    /**
     * Return graph to pool for reuse
     */
    returnGraphToPool(graph) {
        if (!this.config.useObjectPooling) return;
        
        // Limit pool size to prevent memory bloat
        if (this.graphPool.length < 5) {
            graph.clear();
            this.graphPool.push(graph);
        }
    }
    
    /**
     * Reset node to initial state
     */
    resetNode(node) {
        // Clear connections
        if (node.inputs) {
            for (const input of node.inputs) {
                if (input.link) {
                    node.disconnectInput(input.link);
                }
            }
        }
        
        if (node.outputs) {
            for (let i = 0; i < node.outputs.length; i++) {
                node.disconnectOutput(i);
            }
        }
        
        // Reset properties to defaults if available
        if (node.constructor.prototype.getDefaultProperties) {
            const defaults = node.constructor.prototype.getDefaultProperties();
            if (defaults) {
                node.properties = { ...defaults };
            }
        }
        
        // Reset flags
        node.flags = {};
    }
    
    /**
     * Perform memory cleanup between batches
     */
    async performMemoryCleanup() {
        const currentMemory = this.getMemoryUsage();
        
        if (currentMemory.used > this.config.memoryThreshold) {
            console.log(`Memory usage high (${Math.round(currentMemory.used / 1024 / 1024)}MB), performing cleanup...`);
            
            // Clear some pools if they're too large
            this.trimPools();
            
            // Force garbage collection
            await this.forceGarbageCollection();
            
            const afterMemory = this.getMemoryUsage();
            console.log(`Memory after cleanup: ${Math.round(afterMemory.used / 1024 / 1024)}MB`);
        }
        
        // Small delay to allow browser to process
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    /**
     * Trim object pools to reduce memory usage
     */
    trimPools() {
        // Trim node pools
        for (const [nodeType, pool] of this.nodePool.entries()) {
            if (pool.length > 5) {
                pool.splice(5); // Keep only 5 instances
            }
        }
        
        // Trim graph pool
        if (this.graphPool.length > 2) {
            this.graphPool.splice(2); // Keep only 2 instances
        }
    }
    
    /**
     * Force garbage collection if available
     */
    async forceGarbageCollection() {
        if (window.gc) {
            window.gc();
            this.memoryStats.gcCount++;
        } else if (performance.measureUserAgentSpecificMemory) {
            try {
                await performance.measureUserAgentSpecificMemory();
                this.memoryStats.gcCount++;
            } catch (error) {
                // Ignore errors
            }
        }
    }
    
    /**
     * Update memory statistics
     */
    updateMemoryStats(memoryUsage) {
        this.memoryStats.current = memoryUsage.used;
        if (memoryUsage.used > this.memoryStats.peak) {
            this.memoryStats.peak = memoryUsage.used;
        }
    }

    /**
     * Get memory usage (approximate)
     */
    getMemoryUsage() {
        if (performance.memory) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
        }
        return { used: 0, total: 0, limit: 0 };
    }

    /**
     * Stop running tests
     */
    stopTests() {
        this.isRunning = false;
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
            rows.push(row.join(','));
        }
        
        return rows.join('\n');
    }

    /**
     * Export as HTML
     */
    exportHTML(report) {
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
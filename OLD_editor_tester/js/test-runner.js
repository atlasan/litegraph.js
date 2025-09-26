/**
 * Test Runner
 * Handles test execution, coordination, and result collection
 */

import { testFramework } from './test-framework.js';
import TestCaseGenerator from './test-generator.js';
import testConfig from './test-config.js';

export class TestRunner {
    constructor(app) {
        this.app = app;
        this.framework = testFramework;
        this.generator = new TestCaseGenerator();
        this.isRunning = false;
        this.shouldStop = false;
        this.currentExecution = null;
        this.executionQueue = [];
        this.results = [];
        this.startTime = null;
        this.endTime = null;
        
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        testConfig.on('configChanged', (data) => {
            if (data.path.startsWith('execution.')) {
                this.updateExecutionSettings();
            }
        });
    }

    /**
     * Update execution settings based on configuration
     */
    updateExecutionSettings() {
        const config = testConfig.get('execution');
        
        // Update framework settings
        if (this.framework.updateConfig) {
            this.framework.updateConfig({
                timeout: config.timeout,
                memoryTracking: config.memoryTracking,
                coverageTracking: config.coverageTracking
            });
        }
    }

    /**
     * Run all available tests
     */
    async runAllTests(progressCallback) {
        if (this.isRunning) {
            throw new Error('Tests are already running');
        }

        try {
            this.startExecution();
            
            console.log('Starting test runner - running all tests');
            
            // Validate framework
            if (!this.framework) {
                throw new Error('Test framework not initialized');
            }
            
            // Get all available node types - no filtering for "run all"
            const nodeTypes = this.app.getAvailableNodeTypes();
            
            if (nodeTypes.length === 0) {
                throw new Error('No node types available for testing');
            }

            // Prioritize node types based on risk level and complexity
            const prioritizedNodeTypes = this.prioritizeNodeTypes(nodeTypes);

            console.log(`[TestRunner] Running ALL tests for ${nodeTypes.length} node types (prioritized by risk)`);
            
            // Generate and run tests for ALL nodes
            const results = await this.executeTestsForNodes(prioritizedNodeTypes, (progress, message) => {
                try {
                    if (progressCallback) {
                        progressCallback(progress, message);
                    }
                } catch (callbackError) {
                    console.warn('Progress callback error:', callbackError);
                }
            });
            
            // Update UI safely
            try {
                if (this.app.uiManager) {
                    this.app.uiManager.updateTestResults(results);
                    this.app.uiManager.updateStats(this.getExecutionStats());
                }
            } catch (uiError) {
                console.warn('Failed to update UI:', uiError);
            }
            
            this.endExecution();
            console.log(`Test run completed: ${results.filter(r => r.status === 'passed').length}/${results.length} passed`);
            return results;
            
        } catch (error) {
            console.error('Error running all tests:', error);
            
            // Try to update UI with error state
            try {
                if (this.app.uiManager) {
                    this.app.uiManager.showError(`Test execution failed: ${error.message}`);
                }
            } catch (uiError) {
                console.warn('Failed to show error in UI:', uiError);
            }
            
            this.endExecution();
            throw error;
        }
    }

    /**
     * Run tests for selected nodes
     */
    async runSelectedTests(nodeTypes, progressCallback) {
        if (this.isRunning) {
            throw new Error('Tests are already running');
        }

        try {
            this.startExecution();
            
            // Validate input
            if (!nodeTypes || nodeTypes.length === 0) {
                throw new Error('No node types selected for testing');
            }
            
            if (!Array.isArray(nodeTypes)) {
                throw new Error('Node types must be provided as an array');
            }
            
            console.log(`Starting test runner - running tests for ${nodeTypes.length} selected node types`);
            
            // Validate framework
            if (!this.framework) {
                throw new Error('Test framework not initialized');
            }
            
            // Check if node types exist
            const availableNodes = this.app.getAvailableNodeTypes();
            const invalidNodes = nodeTypes.filter(type => !availableNodes.includes(type));
            if (invalidNodes.length > 0) {
                console.warn(`Some node types not found: ${invalidNodes.join(', ')}`);
            }
            
            const validNodes = nodeTypes.filter(type => availableNodes.includes(type));
            if (validNodes.length === 0) {
                throw new Error('None of the selected node types are available');
            }
            
            // Prioritize selected node types based on risk level
            const prioritizedNodeTypes = this.prioritizeNodeTypes(validNodes);
            
            console.log(`Running tests for selected nodes: ${validNodes.join(', ')} (prioritized by risk)`);
            
            const results = await this.executeTestsForNodes(prioritizedNodeTypes, (progress, message) => {
                try {
                    if (progressCallback) {
                        progressCallback(progress, message);
                    }
                } catch (callbackError) {
                    console.warn('Progress callback error:', callbackError);
                }
            });
            
            // Update UI safely
            try {
                if (this.app.uiManager) {
                    this.app.uiManager.updateTestResults(results);
                    this.app.uiManager.updateStats(this.getExecutionStats());
                }
            } catch (uiError) {
                console.warn('Failed to update UI:', uiError);
            }
            
            this.endExecution();
            console.log(`Selected tests completed: ${results.filter(r => r.status === 'passed').length}/${results.length} passed`);
            return results;
            
        } catch (error) {
            console.error('Error running selected tests:', error);
            
            // Try to update UI with error state
            try {
                if (this.app.uiManager) {
                    this.app.uiManager.showError(`Selected test execution failed: ${error.message}`);
                }
            } catch (uiError) {
                console.warn('Failed to show error in UI:', uiError);
            }
            
            this.endExecution();
            throw error;
        }
    }

    /**
     * Run tests for specific node types
     */
    async runTestsForNodeTypes(nodeTypes, progressCallback) {
        if (this.isRunning) {
            throw new Error('Tests are already running');
        }

        try {
            console.log(`[TestRunner] Starting tests for ${nodeTypes.length} node types`);
            this.startExecution();
            
            const results = await this.executeTestsForNodes(nodeTypes, progressCallback);
            
            // Update UI safely
            try {
                if (this.app.uiManager) {
                    this.app.uiManager.updateTestResults(results);
                    this.app.uiManager.updateStats();
                }
            } catch (uiError) {
                console.warn('Failed to update UI:', uiError);
            }
            
            this.endExecution();
            console.log(`[TestRunner] Completed tests. ${results.length} results generated.`);
            return results;
            
        } catch (error) {
            console.error('[TestRunner] Test execution failed:', error);
            
            // Try to update UI with error state
            try {
                if (this.app.uiManager) {
                    this.app.uiManager.updateTestResults([]);
                    this.app.uiManager.updateStats();
                }
            } catch (uiError) {
                console.warn('Failed to update UI after error:', uiError);
            }
            
            this.endExecution();
            throw error;
        }
    }

    /**
     * Run tests for a single node
     */
    async runSingleNodeTest(nodeType) {
        if (this.isRunning) {
            throw new Error('Tests are already running');
        }

        try {
            this.startExecution();
            
            const results = await this.executeTestsForNodes([nodeType]);
            
            this.endExecution();
            return results;
            
        } catch (error) {
            this.endExecution();
            throw error;
        }
    }

    /**
     * Stop running tests
     */
    stopTests() {
        if (!this.isRunning) {
            return;
        }

        this.shouldStop = true;
        
        if (this.currentExecution) {
            this.currentExecution.abort();
        }
        
        this.endExecution();
    }

    /**
     * Check if tests are currently running
     */
    isTestsRunning() {
        return this.isRunning;
    }

    /**
     * Get current execution statistics
     */
    getExecutionStats() {
        return {
            isRunning: this.isRunning,
            startTime: this.startTime,
            endTime: this.endTime,
            duration: this.endTime && this.startTime ? this.endTime - this.startTime : null,
            totalResults: this.results.length,
            queueLength: this.executionQueue.length
        };
    }

    /**
     * Start test execution
     */
    startExecution() {
        this.isRunning = true;
        this.shouldStop = false;
        this.startTime = Date.now();
        this.endTime = null;
        this.results = [];
        this.executionQueue = [];
        
        // Clear previous test results in framework
        this.framework.clearResults();
    }

    /**
     * End test execution
     */
    endExecution() {
        this.isRunning = false;
        this.shouldStop = false;
        this.endTime = Date.now();
        this.currentExecution = null;
        this.executionQueue = [];
        
        // Update UI controls to reset button states
        if (this.app.uiManager) {
            this.app.uiManager.updateControls();
        }
    }

    /**
     * Execute tests for multiple nodes
     */
    async executeTestsForNodes(nodeTypes, progressCallback) {
        const config = testConfig.get();
        const allResults = [];
        let completedNodes = 0;
        
        // Update progress
        if (progressCallback) {
            progressCallback(0, `Preparing tests for ${nodeTypes.length} nodes...`);
        }

        for (const nodeType of nodeTypes) {
            if (this.shouldStop) {
                break;
            }

            try {
                // Update progress
                if (progressCallback) {
                    const progress = (completedNodes / nodeTypes.length) * 100;
                    progressCallback(progress, `Testing ${nodeType}...`);
                }

                // Generate tests for this node
                const testCases = await this.generateTestsForNode(nodeType, config);
                
                if (testCases.length === 0) {
                    console.warn(`No test cases generated for node: ${nodeType}`);
                    continue;
                }

                // Execute tests for this node
                const nodeResults = await this.executeNodeTests(nodeType, testCases, config);
                allResults.push(...nodeResults);
                
                completedNodes++;
                
                // Add delay between nodes if configured
                if (config.execution.delayBetweenTests > 0) {
                    await this.delay(config.execution.delayBetweenTests);
                }
                
            } catch (error) {
                console.error(`Failed to test node ${nodeType}:`, error);
                
                // Create error result
                const errorResult = {
                    testId: `${nodeType}_error`,
                    nodeType: nodeType,
                    status: 'failed',
                    duration: 0,
                    errors: [{
                        type: 'TestExecutionError',
                        message: error.message
                    }],
                    warnings: [],
                    timestamp: Date.now()
                };
                
                allResults.push(errorResult);
                completedNodes++;
            }
        }

        // Final progress update
        if (progressCallback) {
            progressCallback(100, `Completed ${completedNodes} nodes`);
        }

        this.results = allResults;
        return allResults;
    }

    /**
     * Generate tests for a specific node
     */
    async generateTestsForNode(nodeType, config) {
        try {
            // Get node information
            const nodeInfo = this.app.getNodeInfo(nodeType);
            if (!nodeInfo) {
                throw new Error(`Node information not available for: ${nodeType}`);
            }

            // Generate test cases based on configuration
            const testCases = [];
            
            if (config.testTypes.basic) {
                const basicTests = this.generator.generateBasicTests(nodeType);
                testCases.push(...basicTests);
            }
            
            if (config.testTypes.inputValidation) {
                const inputTests = this.generator.generateInputValidationTests(nodeType, nodeInfo);
                testCases.push(...inputTests);
            }
            
            if (config.testTypes.outputValidation) {
                const outputTests = this.generator.generateOutputValidationTests(nodeType, nodeInfo);
                testCases.push(...outputTests);
            }
            
            if (config.testTypes.performance) {
                const perfTests = this.generator.generatePerformanceTests(nodeType, nodeInfo);
                testCases.push(...perfTests);
            }
            
            if (config.testTypes.stress) {
                const stressTests = this.generator.generateStressTests(nodeType, nodeInfo);
                testCases.push(...stressTests);
            }
            
            if (config.testTypes.errorHandling) {
                const errorTests = this.generator.generateErrorHandlingTests(nodeType, nodeInfo);
                testCases.push(...errorTests);
            }
            
            if (config.testTypes.stateManagement) {
                const stateTests = this.generator.generateStateManagementTests(nodeType, nodeInfo);
                testCases.push(...stateTests);
            }

            console.log(`Generated ${testCases.length} test cases for ${nodeType}`);
            return testCases;
            
        } catch (error) {
            console.error(`Failed to generate tests for ${nodeType}:`, error);
            return [];
        }
    }

    /**
     * Execute tests for a specific node
     */
    async executeNodeTests(nodeType, testCases, config) {
        const results = [];
        const maxConcurrent = config.execution.maxConcurrentTests;
        
        if (maxConcurrent <= 1) {
            // Sequential execution
            for (const testCase of testCases) {
                if (this.shouldStop) break;
                
                const result = await this.executeTestCase(nodeType, testCase, config);
                results.push(result);
                
                // Add delay between tests if configured
                if (config.execution.delayBetweenTests > 0) {
                    await this.delay(config.execution.delayBetweenTests);
                }
            }
        } else {
            // Concurrent execution
            const batches = this.createBatches(testCases, maxConcurrent);
            
            for (const batch of batches) {
                if (this.shouldStop) break;
                
                const batchPromises = batch.map(testCase => 
                    this.executeTestCase(nodeType, testCase, config)
                );
                
                const batchResults = await Promise.allSettled(batchPromises);
                
                for (const result of batchResults) {
                    if (result.status === 'fulfilled') {
                        results.push(result.value);
                    } else {
                        // Handle rejected promise
                        results.push({
                            testId: 'unknown',
                            nodeType: nodeType,
                            status: 'failed',
                            duration: 0,
                            errors: [{
                                type: 'ExecutionError',
                                message: result.reason.message
                            }],
                            warnings: [],
                            timestamp: Date.now()
                        });
                    }
                }
                
                // Add delay between batches if configured
                if (config.execution.delayBetweenTests > 0) {
                    await this.delay(config.execution.delayBetweenTests);
                }
            }
        }

        return results;
    }

    /**
     * Execute a single test case
     */
    async executeTestCase(nodeType, testCase, config) {
        const startTime = performance.now();
        
        try {
            // Create execution context
            const context = this.createExecutionContext(nodeType, testCase, config);
            
            // Set up abort controller for timeout
            const abortController = new AbortController();
            const timeoutId = setTimeout(() => {
                abortController.abort();
            }, config.execution.timeout);
            
            this.currentExecution = abortController;
            
            try {
                // Execute the test
                const result = await this.runTestWithContext(context, abortController.signal);
                
                clearTimeout(timeoutId);
                
                const duration = performance.now() - startTime;
                
                return {
                    testId: testCase.id,
                    nodeType: nodeType,
                    status: result.success ? 'passed' : 'failed',
                    duration: duration,
                    errors: result.errors || [],
                    warnings: result.warnings || [],
                    memoryUsage: result.memoryUsage,
                    coverage: result.coverage,
                    timestamp: Date.now(),
                    testCase: testCase
                };
                
            } catch (error) {
                clearTimeout(timeoutId);
                
                if (error.name === 'AbortError') {
                    throw new Error(`Test timed out after ${config.execution.timeout}ms`);
                }
                
                throw error;
            }
            
        } catch (error) {
            const duration = performance.now() - startTime;
            
            return {
                testId: testCase.id,
                nodeType: nodeType,
                status: 'failed',
                duration: duration,
                errors: [{
                    type: error.constructor.name,
                    message: error.message,
                    stack: error.stack
                }],
                warnings: [],
                timestamp: Date.now(),
                testCase: testCase
            };
        } finally {
            this.currentExecution = null;
        }
    }

    /**
     * Create execution context for test
     */
    createExecutionContext(nodeType, testCase, config) {
        return {
            nodeType: nodeType,
            testCase: testCase,
            config: config,
            graph: this.app.getGraph(),
            canvas: this.app.getCanvas(),
            framework: this.framework,
            utils: {
                createNode: (type) => this.app.createNode(type),
                connectNodes: (nodeA, outputIndex, nodeB, inputIndex) => 
                    this.app.connectNodes(nodeA, outputIndex, nodeB, inputIndex),
                executeGraph: () => this.app.executeGraph(),
                clearGraph: () => this.app.clearGraph(),
                getNodeOutput: (node, index) => node.getOutputData(index),
                setNodeInput: (node, index, data) => node.setInputData(index, data),
                triggerNodeExecution: (node) => node.onExecute && node.onExecute()
            }
        };
    }

    /**
     * Run test with execution context
     */
    async runTestWithContext(context, abortSignal) {
        const { nodeType, testCase, config, utils } = context;
        
        // Check for abort signal
        if (abortSignal.aborted) {
            throw new Error('Test execution aborted');
        }

        const result = {
            success: true,
            errors: [],
            warnings: [],
            memoryUsage: null,
            coverage: null
        };

        try {
            // Memory tracking start
            let memoryStart = null;
            if (config.execution.memoryTracking && performance.memory) {
                memoryStart = {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize
                };
            }

            // Clear graph before test
            utils.clearGraph();
            
            // Check abort signal
            if (abortSignal.aborted) {
                throw new Error('Test execution aborted');
            }

            // Create node instance
            const node = utils.createNode(nodeType);
            if (!node) {
                throw new Error(`Failed to create node of type: ${nodeType}`);
            }

            // Execute test case specific logic
            await this.executeTestCaseLogic(node, testCase, utils, abortSignal);
            
            // Memory tracking end
            if (memoryStart && performance.memory) {
                const memoryEnd = {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize
                };
                
                result.memoryUsage = {
                    start: memoryStart,
                    end: memoryEnd,
                    delta: memoryEnd.used - memoryStart.used
                };
            }

            // Coverage tracking
            if (config.execution.coverageTracking) {
                result.coverage = this.calculateCoverage(node, testCase);
            }

        } catch (error) {
            result.success = false;
            result.errors.push({
                type: error.constructor.name,
                message: error.message,
                stack: error.stack
            });
        }

        return result;
    }

    /**
     * Execute test case specific logic
     */
    async executeTestCaseLogic(node, testCase, utils, abortSignal) {
        switch (testCase.type) {
            case 'basic':
                await this.executeBasicTest(node, testCase, utils, abortSignal);
                break;
                
            case 'input_validation':
                await this.executeInputValidationTest(node, testCase, utils, abortSignal);
                break;
                
            case 'output_validation':
                await this.executeOutputValidationTest(node, testCase, utils, abortSignal);
                break;
                
            case 'performance':
                await this.executePerformanceTest(node, testCase, utils, abortSignal);
                break;
                
            case 'stress':
                await this.executeStressTest(node, testCase, utils, abortSignal);
                break;
                
            case 'error_handling':
                await this.executeErrorHandlingTest(node, testCase, utils, abortSignal);
                break;
                
            case 'state_management':
                await this.executeStateManagementTest(node, testCase, utils, abortSignal);
                break;
                
            default:
                throw new Error(`Unknown test case type: ${testCase.type}`);
        }
    }

    /**
     * Execute basic functionality test
     */
    async executeBasicTest(node, testCase, utils, abortSignal) {
        // Set up inputs if specified
        if (testCase.inputs) {
            for (const [index, inputData] of testCase.inputs.entries()) {
                if (abortSignal.aborted) throw new Error('Aborted');
                utils.setNodeInput(node, index, inputData);
            }
        }

        // Set properties if specified
        if (testCase.properties) {
            for (const [key, value] of Object.entries(testCase.properties)) {
                if (abortSignal.aborted) throw new Error('Aborted');
                node.properties[key] = value;
            }
        }

        // Execute node
        if (abortSignal.aborted) throw new Error('Aborted');
        utils.triggerNodeExecution(node);

        // Validate outputs if specified and not null
        if (testCase.expectedOutputs) {
            for (const [index, expectedOutput] of testCase.expectedOutputs.entries()) {
                if (abortSignal.aborted) throw new Error('Aborted');
                
                // Skip validation if expected output is null (placeholder)
                if (expectedOutput === null) {
                    continue;
                }
                
                const actualOutput = utils.getNodeOutput(node, index);
                
                if (!this.compareValues(actualOutput, expectedOutput)) {
                    throw new Error(`Output ${index} mismatch. Expected: ${JSON.stringify(expectedOutput)}, Got: ${JSON.stringify(actualOutput)}`);
                }
            }
        }
    }

    /**
     * Execute input validation test
     */
    async executeInputValidationTest(node, testCase, utils, abortSignal) {
        const { invalidInputs, expectedBehavior } = testCase;

        for (const [index, invalidInput] of invalidInputs.entries()) {
            if (abortSignal.aborted) throw new Error('Aborted');
            
            try {
                utils.setNodeInput(node, index, invalidInput);
                utils.triggerNodeExecution(node);
                
                if (expectedBehavior === 'error') {
                    throw new Error(`Expected error for invalid input ${JSON.stringify(invalidInput)}, but node executed successfully`);
                }
                
            } catch (error) {
                if (expectedBehavior === 'error') {
                    // Expected error, test passes
                    continue;
                } else {
                    // Unexpected error
                    throw error;
                }
            }
        }
    }

    /**
     * Execute output validation test
     */
    async executeOutputValidationTest(node, testCase, utils, abortSignal) {
        const { inputs, outputValidators } = testCase;

        // Set inputs
        if (inputs) {
            for (const [index, inputData] of inputs.entries()) {
                if (abortSignal.aborted) throw new Error('Aborted');
                utils.setNodeInput(node, index, inputData);
            }
        }

        // Execute node
        if (abortSignal.aborted) throw new Error('Aborted');
        utils.triggerNodeExecution(node);

        // Validate outputs
        for (const [index, validator] of outputValidators.entries()) {
            if (abortSignal.aborted) throw new Error('Aborted');
            
            const output = utils.getNodeOutput(node, index);
            
            if (!this.validateOutput(output, validator)) {
                throw new Error(`Output ${index} validation failed. Output: ${JSON.stringify(output)}`);
            }
        }
    }

    /**
     * Execute performance test
     */
    async executePerformanceTest(node, testCase, utils, abortSignal) {
        const { iterations, maxExecutionTime, inputs } = testCase;
        const executionTimes = [];

        for (let i = 0; i < iterations; i++) {
            if (abortSignal.aborted) throw new Error('Aborted');
            
            // Set inputs
            if (inputs) {
                for (const [index, inputData] of inputs.entries()) {
                    utils.setNodeInput(node, index, inputData);
                }
            }

            // Measure execution time
            const startTime = performance.now();
            utils.triggerNodeExecution(node);
            const endTime = performance.now();
            
            const executionTime = endTime - startTime;
            executionTimes.push(executionTime);
            
            if (executionTime > maxExecutionTime) {
                throw new Error(`Execution time ${executionTime.toFixed(2)}ms exceeds maximum ${maxExecutionTime}ms`);
            }
        }

        // Calculate statistics
        const avgTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
        const maxTime = Math.max(...executionTimes);
        const minTime = Math.min(...executionTimes);
        
        console.log(`Performance test results - Avg: ${avgTime.toFixed(2)}ms, Min: ${minTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`);
    }

    /**
     * Execute stress test
     */
    async executeStressTest(node, testCase, utils, abortSignal) {
        const { stressType, parameters } = testCase;

        switch (stressType) {
            case 'high_frequency':
                await this.executeHighFrequencyStress(node, parameters, utils, abortSignal);
                break;
                
            case 'large_data':
                await this.executeLargeDataStress(node, parameters, utils, abortSignal);
                break;
                
            case 'memory_pressure':
                await this.executeMemoryPressureStress(node, parameters, utils, abortSignal);
                break;
                
            default:
                throw new Error(`Unknown stress test type: ${stressType}`);
        }
    }

    /**
     * Execute error handling test
     */
    async executeErrorHandlingTest(node, testCase, utils, abortSignal) {
        const { errorConditions, expectedRecovery } = testCase;

        for (const condition of errorConditions) {
            if (abortSignal.aborted) throw new Error('Aborted');
            
            try {
                // Apply error condition
                await this.applyErrorCondition(node, condition, utils);
                
                // Execute node
                utils.triggerNodeExecution(node);
                
                // Check if node recovered as expected
                if (expectedRecovery && !this.checkRecovery(node, expectedRecovery)) {
                    throw new Error(`Node did not recover as expected from error condition: ${condition.type}`);
                }
                
            } catch (error) {
                if (!condition.shouldThrow) {
                    throw error;
                }
                // Expected error, continue
            }
        }
    }

    /**
     * Execute state management test
     */
    async executeStateManagementTest(node, testCase, utils, abortSignal) {
        const { stateOperations, expectedStates } = testCase;

        for (const [index, operation] of stateOperations.entries()) {
            if (abortSignal.aborted) throw new Error('Aborted');
            
            // Apply state operation
            await this.applyStateOperation(node, operation, utils);
            
            // Validate expected state
            if (expectedStates[index]) {
                if (!this.validateNodeState(node, expectedStates[index])) {
                    throw new Error(`State validation failed after operation ${index}: ${operation.type}`);
                }
            }
        }
    }

    /**
     * Filter node types based on selection criteria
     */
    filterNodeTypes(nodeTypes, criteria) {
        let filtered = [...nodeTypes];

        // Apply inclusion filters
        if (criteria.selectedNodes && criteria.selectedNodes.length > 0) {
            filtered = filtered.filter(nodeType => criteria.selectedNodes.includes(nodeType));
        }

        if (criteria.categories && criteria.categories.length > 0) {
            filtered = filtered.filter(nodeType => {
                const category = this.extractCategory(nodeType);
                return criteria.categories.includes(category);
            });
        }

        if (criteria.namePattern) {
            const regex = new RegExp(criteria.namePattern, 'i');
            filtered = filtered.filter(nodeType => regex.test(nodeType));
        }

        // Apply exclusion filters
        if (criteria.excludedNodes && criteria.excludedNodes.length > 0) {
            filtered = filtered.filter(nodeType => !criteria.excludedNodes.includes(nodeType));
        }

        if (criteria.excludeCategories && criteria.excludeCategories.length > 0) {
            filtered = filtered.filter(nodeType => {
                const category = this.extractCategory(nodeType);
                return !criteria.excludeCategories.includes(category);
            });
        }

        return filtered;
    }

    /**
     * Extract category from node type
     */
    extractCategory(nodeType) {
        const parts = nodeType.split('/');
        return parts.length > 1 ? parts[0] : 'Other';
    }

    /**
     * Create batches for concurrent execution
     */
    createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * Compare two values for equality
     */
    compareValues(actual, expected) {
        if (typeof expected === 'object' && expected !== null) {
            if (expected.type === 'range') {
                return actual >= expected.min && actual <= expected.max;
            }
            if (expected.type === 'regex') {
                return new RegExp(expected.pattern).test(actual);
            }
            if (expected.type === 'function') {
                return expected.validator(actual);
            }
        }
        
        return JSON.stringify(actual) === JSON.stringify(expected);
    }

    /**
     * Validate output against validator
     */
    validateOutput(output, validator) {
        if (typeof validator === 'function') {
            return validator(output);
        }
        
        if (typeof validator === 'object' && validator !== null) {
            if (validator.type === 'type') {
                return typeof output === validator.expectedType;
            }
            if (validator.type === 'range') {
                return output >= validator.min && output <= validator.max;
            }
            if (validator.type === 'regex') {
                return new RegExp(validator.pattern).test(output);
            }
        }
        
        return this.compareValues(output, validator);
    }

    /**
     * Calculate test coverage
     */
    calculateCoverage(node, testCase) {
        const coverage = {
            inputs: 0,
            outputs: 0,
            properties: 0,
            methods: 0
        };

        // Calculate input coverage
        if (node.inputs && testCase.inputs) {
            coverage.inputs = Math.min(testCase.inputs.length / node.inputs.length, 1);
        }

        // Calculate output coverage
        if (node.outputs && testCase.expectedOutputs) {
            coverage.outputs = Math.min(testCase.expectedOutputs.length / node.outputs.length, 1);
        }

        // Calculate property coverage
        if (node.properties && testCase.properties) {
            const testedProps = Object.keys(testCase.properties).length;
            const totalProps = Object.keys(node.properties).length;
            coverage.properties = totalProps > 0 ? testedProps / totalProps : 0;
        }

        return coverage;
    }

    /**
     * Apply error condition to node
     */
    async applyErrorCondition(node, condition, utils) {
        switch (condition.type) {
            case 'invalid_input':
                utils.setNodeInput(node, condition.inputIndex, condition.invalidValue);
                break;
                
            case 'missing_property':
                delete node.properties[condition.propertyName];
                break;
                
            case 'network_error':
                // Simulate network error if applicable
                if (node.onNetworkError) {
                    node.onNetworkError(new Error('Simulated network error'));
                }
                break;
                
            default:
                throw new Error(`Unknown error condition: ${condition.type}`);
        }
    }

    /**
     * Check node recovery
     */
    checkRecovery(node, expectedRecovery) {
        switch (expectedRecovery.type) {
            case 'state_reset':
                return this.validateNodeState(node, expectedRecovery.expectedState);
                
            case 'error_cleared':
                return !node.hasError || node.hasError === false;
                
            default:
                return true;
        }
    }

    /**
     * Apply state operation to node
     */
    async applyStateOperation(node, operation, utils) {
        switch (operation.type) {
            case 'set_property':
                node.properties[operation.property] = operation.value;
                break;
                
            case 'trigger_method':
                if (node[operation.method]) {
                    node[operation.method](...(operation.args || []));
                }
                break;
                
            case 'set_input':
                utils.setNodeInput(node, operation.inputIndex, operation.value);
                break;
                
            case 'execute':
                utils.triggerNodeExecution(node);
                break;
                
            default:
                throw new Error(`Unknown state operation: ${operation.type}`);
        }
    }

    /**
     * Validate node state
     */
    validateNodeState(node, expectedState) {
        for (const [key, expectedValue] of Object.entries(expectedState)) {
            const actualValue = this.getNodeStateValue(node, key);
            if (!this.compareValues(actualValue, expectedValue)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Get node state value by key
     */
    getNodeStateValue(node, key) {
        const parts = key.split('.');
        let value = node;
        
        for (const part of parts) {
            if (value && typeof value === 'object' && part in value) {
                value = value[part];
            } else {
                return undefined;
            }
        }
        
        return value;
    }

    /**
     * Execute high frequency stress test
     */
    async executeHighFrequencyStress(node, parameters, utils, abortSignal) {
        const { frequency, duration, inputs } = parameters;
        const interval = 1000 / frequency; // ms between executions
        const endTime = Date.now() + duration;

        while (Date.now() < endTime && !abortSignal.aborted) {
            const startTime = Date.now();
            
            // Set inputs if provided
            if (inputs) {
                for (const [index, inputData] of inputs.entries()) {
                    utils.setNodeInput(node, index, inputData);
                }
            }
            
            // Execute node
            utils.triggerNodeExecution(node);
            
            // Wait for next execution
            const elapsed = Date.now() - startTime;
            const waitTime = Math.max(0, interval - elapsed);
            
            if (waitTime > 0) {
                await this.delay(waitTime);
            }
        }
    }

    /**
     * Execute large data stress test
     */
    async executeLargeDataStress(node, parameters, utils, abortSignal) {
        const { dataSize, dataType } = parameters;
        
        // Generate large data based on type
        let largeData;
        switch (dataType) {
            case 'array':
                largeData = new Array(dataSize).fill(0).map((_, i) => i);
                break;
                
            case 'string':
                largeData = 'x'.repeat(dataSize);
                break;
                
            case 'object':
                largeData = {};
                for (let i = 0; i < dataSize; i++) {
                    largeData[`key${i}`] = `value${i}`;
                }
                break;
                
            default:
                largeData = new Array(dataSize).fill(Math.random());
        }
        
        if (abortSignal.aborted) throw new Error('Aborted');
        
        // Set large data as input
        utils.setNodeInput(node, 0, largeData);
        
        // Execute node
        utils.triggerNodeExecution(node);
    }

    /**
     * Execute memory pressure stress test
     */
    async executeMemoryPressureStress(node, parameters, utils, abortSignal) {
        const { iterations, memoryPerIteration } = parameters;
        const allocatedMemory = [];

        try {
            for (let i = 0; i < iterations && !abortSignal.aborted; i++) {
                // Allocate memory
                const chunk = new Array(memoryPerIteration).fill(Math.random());
                allocatedMemory.push(chunk);
                
                // Execute node
                utils.triggerNodeExecution(node);
                
                // Small delay to allow garbage collection
                await this.delay(10);
            }
        } finally {
            // Clean up allocated memory
            allocatedMemory.length = 0;
        }
    }

    /**
     * Prioritize node types based on risk level and complexity
     */
    prioritizeNodeTypes(nodeTypes) {
        if (!this.generator) {
            return nodeTypes; // Return original order if no generator available
        }
        
        const nodeAnalyses = [];
        
        for (const nodeType of nodeTypes) {
            try {
                const analysis = this.generator.analyzeNodeType(nodeType);
                if (analysis) {
                    nodeAnalyses.push({ nodeType, analysis });
                }
            } catch (error) {
                console.warn(`Failed to analyze ${nodeType}:`, error);
                // Add to end with default priority
                nodeAnalyses.push({ 
                    nodeType, 
                    analysis: { riskLevel: 'low', complexity: 'low' } 
                });
            }
        }
        
        // Sort by risk level (critical > high > medium > low) then by complexity
        const riskOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        const complexityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        
        nodeAnalyses.sort((a, b) => {
            const aRisk = riskOrder[a.analysis.riskLevel] || 1;
            const bRisk = riskOrder[b.analysis.riskLevel] || 1;
            
            if (aRisk !== bRisk) {
                return bRisk - aRisk; // Higher risk first
            }
            
            const aComplexity = complexityOrder[a.analysis.complexity] || 1;
            const bComplexity = complexityOrder[b.analysis.complexity] || 1;
            
            return bComplexity - aComplexity; // Higher complexity first
        });
        
        return nodeAnalyses.map(item => item.nodeType);
    }
    
    /**
     * Get comprehensive test coverage report
     */
    getTestCoverageReport() {
        if (!this.generator) {
            return null;
        }
        
        const nodeTypes = this.app.getAvailableNodeTypes();
        const coverageReport = {
            totalNodes: nodeTypes.length,
            riskDistribution: { critical: 0, high: 0, medium: 0, low: 0 },
            complexityDistribution: { high: 0, medium: 0, low: 0 },
            testTypesCoverage: {
                basic: 0,
                input_validation: 0,
                output_validation: 0,
                performance: 0,
                stress: 0,
                error_handling: 0,
                state_management: 0,
                integration: 0,
                edge_cases: 0,
                memory_leak: 0,
                compatibility: 0
            },
            securityIssues: [],
            highRiskNodes: []
        };
        
        for (const nodeType of nodeTypes) {
            try {
                const analysis = this.generator.analyzeNodeType(nodeType);
                if (analysis) {
                    // Update risk distribution
                    coverageReport.riskDistribution[analysis.riskLevel]++;
                    
                    // Update complexity distribution
                    coverageReport.complexityDistribution[analysis.complexity]++;
                    
                    // Update test coverage
                    for (const [testType, shouldTest] of Object.entries(analysis.testCoverage)) {
                        if (shouldTest) {
                            coverageReport.testTypesCoverage[testType]++;
                        }
                    }
                    
                    // Collect security issues
                    if (analysis.security?.securityIssues?.length > 0) {
                        coverageReport.securityIssues.push({
                            nodeType,
                            issues: analysis.security.securityIssues
                        });
                    }
                    
                    // Collect high-risk nodes
                    if (analysis.riskLevel === 'critical' || analysis.riskLevel === 'high') {
                        coverageReport.highRiskNodes.push({
                            nodeType,
                            riskLevel: analysis.riskLevel,
                            complexity: analysis.complexity,
                            reasons: this.getRiskReasons(analysis)
                        });
                    }
                }
            } catch (error) {
                console.warn(`Failed to analyze ${nodeType} for coverage report:`, error);
            }
        }
        
        return coverageReport;
    }
    
    /**
     * Get reasons why a node is considered high risk
     */
    getRiskReasons(analysis) {
        const reasons = [];
        
        if (analysis.complexity === 'high') {
            reasons.push('High complexity');
        }
        
        if (analysis.isAsync) {
            reasons.push('Asynchronous behavior');
        }
        
        if (analysis.hasState) {
            reasons.push('Stateful behavior');
        }
        
        const ioCount = (analysis.inputs?.length || 0) + (analysis.outputs?.length || 0);
        if (ioCount > 5) {
            reasons.push('Many inputs/outputs');
        }
        
        if (analysis.security?.hasSecurityImplications) {
            reasons.push('Security implications');
        }
        
        if (analysis.performance?.cpuIntensive) {
            reasons.push('CPU intensive');
        }
        
        if (analysis.performance?.ioIntensive) {
            reasons.push('I/O intensive');
        }
        
        return reasons;
    }

    /**
     * Delay utility
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default TestRunner;
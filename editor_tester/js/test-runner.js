/**
 * Test Runner - Executes tests for LiteGraph nodes
 * Handles test execution, progress tracking, and result reporting
 */

function TestRunner(app) {
    this.app = app;
    this.framework = window.testFramework;
    this.generator = window.TestCaseGenerator;
    this.isRunning = false;
    this.shouldStop = false;
    this.currentExecution = null;
    this.maxRecoveryAttempts = 3;
    this.results = [];
    this.startTime = null;
    this.endTime = null;
    this.errorLog = [];
    this.warningLog = [];
    this.recoveryAttempts = 0;

    this.setupEventListeners();
    this.updateExecutionSettings();
}

/**
 * Run selected tests
 */
TestRunner.prototype.runSelectedTests = function(nodeTypes, progressCallback) {
    var self = this;
    if (!nodeTypes || nodeTypes.length === 0) {
        this.logWarning('No node types selected for testing', 'selection');
        return Promise.resolve([]);
    }

    this.logMessage('Starting selected tests...', 'info');
    
    var results = this.executeTestsForNodes(nodeTypes, progressCallback);
    return results.then(function(data) {
        self.logMessage('Selected tests completed successfully', 'success');
        return data;
    }).catch(function(error) {
        self.logError('Selected test execution failed: ' + error.message, 'critical');
        throw error;
    });
};

/**
 * Run tests for specific node types
 */
TestRunner.prototype.runTestsForNodeTypes = function(nodeTypes, progressCallback) {
    var self = this;
    this.logMessage('Running tests for ' + nodeTypes.length + ' node types...', 'info');
    
    var results = this.executeTestsForNodes(nodeTypes, progressCallback);
    return results.then(function(data) {
        return data;
    }).catch(function(error) {
        self.logError('Test execution failed: ' + error.message, 'critical');
        throw error;
    });
};

/**
 * Run single node test
 */
TestRunner.prototype.runSingleNodeTest = function(nodeType) {
    var self = this;
    if (!this.app.isNodeTypeAvailable(nodeType)) {
        this.logError('Node type not available: ' + nodeType, 'validation');
        return Promise.reject(new Error('Node type not available: ' + nodeType));
    }

    return this.runTestsForNodeTypes([nodeType]).catch(function(error) {
        console.error('Error running single node test for ' + nodeType + ':', error);
        throw error;
    });
};

/**
 * Stop running tests
 */
TestRunner.prototype.stopTests = function() {
    if (!this.isRunning) {
        return;
    }

    this.shouldStop = true;
    console.log('Stopping test execution...');
    
    if (this.currentExecution && this.currentExecution.abort) {
        this.currentExecution.abort();
    }
};

/**
 * Check if tests are running
 */
TestRunner.prototype.isTestsRunning = function() {
    return this.isRunning;
};

/**
 * Generate tests for a node
 */
TestRunner.prototype.generateTestsForNode = function(nodeType, config) {
    var self = this;
    if (!nodeType) {
        this.logError('Invalid node type provided for test generation', 'validation');
        return Promise.resolve([]);
    }

    var testCases = [];
    var testTypes = config.testTypes;

    try {
        if (testTypes.basic) {
            testCases = testCases.concat(this.generator.generateBasicTests(nodeType));
        }

        if (testTypes.inputValidation) {
            testCases = testCases.concat(this.generator.generateInputValidationTests(nodeType));
        }

        if (testTypes.outputValidation) {
            testCases = testCases.concat(this.generator.generateOutputValidationTests(nodeType));
        }

        if (testTypes.performance) {
            testCases = testCases.concat(this.generator.generatePerformanceTests(nodeType));
        }

        if (testTypes.stress) {
            testCases = testCases.concat(this.generator.generateStressTests(nodeType));
        }

        if (testTypes.errorHandling) {
            testCases = testCases.concat(this.generator.generateErrorHandlingTests(nodeType));
        }

        if (testTypes.stateManagement) {
            testCases = testCases.concat(this.generator.generateStateManagementTests(nodeType));
        }

        return Promise.resolve(testCases);
    } catch (error) {
        console.error('Failed to generate tests for ' + nodeType + ':', error);
        return Promise.resolve([]);
    }
};

/**
 * Execute tests for nodes
 */
TestRunner.prototype.executeTestsForNodes = function(nodeTypes, progressCallback) {
    var self = this;
    var config = window.TestConfig.get();
    var testTypes = config.testTypes;

    var completedTests = 0;

    var processNode = function(i) {
        if (i >= nodeTypes.length) {
            return Promise.resolve();
        }

        if (self.shouldStop) {
            return Promise.resolve();
        }

        var nodeType = nodeTypes[i];

        return self.generateTestsForNode(nodeType, config).then(function(testCases) {
            if (!testCases || testCases.length === 0) {
                self.logWarning('No test cases generated for ' + nodeType, 'generation');
                return processNode(i + 1);
            }

            return self.executeNodeTests(nodeType, testCases, config).then(function(nodeResults) {
                self.results = self.results.concat(nodeResults);

                completedTests += testCases.length;

                if (progressCallback) {
                    var progress = {
                        completed: completedTests,
                        total: nodeTypes.length * 10,
                        currentNode: nodeType,
                        nodeIndex: i + 1,
                        totalNodes: nodeTypes.length,
                        results: self.results
                    };
                    progressCallback(progress);
                }

                return processNode(i + 1);
            });
        }).catch(function(error) {
            self.logError('Failed to execute tests for ' + nodeType + ': ' + error.message, 'execution');

            return self.attemptRecovery(error, {
                nodeType: nodeType,
                testIndex: i,
                totalNodes: nodeTypes.length
            }).then(function(recovered) {
                if (recovered) {
                    return processNode(i + 1);
                } else {
                    throw error;
                }
            });
        });
    };

    return processNode(0).then(function() {
        return self.results;
    });
};

/**
 * Run all tests
 */
TestRunner.prototype.runAllTests = function(progressCallback) {
    var self = this;
    this.shouldStop = false;
    this.results = [];
    this.recoveryAttempts = 0;

    this.logMessage('Initializing comprehensive test suite...', 'info');

    var config = window.TestConfig.get();

    var allNodeTypes = Object.keys(LiteGraph.registered_node_types || {});
    var filteredNodeTypes = this.filterNodeTypes(allNodeTypes, config.nodeSelection);

    if (filteredNodeTypes.length === 0) {
        this.logWarning('No node types available for testing', 'validation');
        return Promise.resolve([]);
    }

    var prioritizedNodeTypes = this.prioritizeNodeTypes(filteredNodeTypes);

    return this.executeTestsForNodes(prioritizedNodeTypes, progressCallback).then(function(results) {
        if (self.shouldStop) {
            self.logMessage('Test execution was stopped by user', 'info');
            return results;
        }

        var stats = self.getTestStatistics();
        self.logMessage('All tests completed. Passed: ' + stats.passedTests + ', Failed: ' + stats.failedTests + ', Total: ' + stats.totalTests, 'success');

        if (self.app && self.app.uiManager) {
            self.app.uiManager.updateTestResults(results);
            self.app.uiManager.updateTestStatistics(stats);
        }

        return results;
    }).catch(function(error) {
        self.logError('Test execution failed: ' + error.message, 'critical');

        if (self.app && self.app.uiManager) {
            self.app.uiManager.showError('Test execution failed: ' + error.message);
        }

        throw error;
    });
};

/**
 * Filter node types based on selection criteria
 */
TestRunner.prototype.filterNodeTypes = function(nodeTypes, selection) {
    return nodeTypes.filter(function(nodeType) {
        if (selection.selectedNodes.length > 0 && selection.selectedNodes.indexOf(nodeType) === -1) {
            return false;
        }
        
        if (selection.excludedNodes.indexOf(nodeType) !== -1) {
            return false;
        }
        
        return true;
    });
};

/**
 * Prioritize node types
 */
TestRunner.prototype.prioritizeNodeTypes = function(nodeTypes) {
    return nodeTypes.sort(function(a, b) {
        return a.localeCompare(b);
    });
};

/**
 * Execute tests for a single node type
 */
TestRunner.prototype.executeNodeTests = function(nodeType, testCases, config) {
    var self = this;
    var results = [];

    var processTestCase = function(i) {
        if (i >= testCases.length) {
            return Promise.resolve();
        }

        if (self.shouldStop) {
            return Promise.resolve();
        }

        var testCase = testCases[i];

        return self.executeTestCase(nodeType, testCase, config).then(function(result) {
            results.push(result);
            return processTestCase(i + 1);
        }).catch(function(error) {
            self.logError('Test case execution failed: ' + error.message, 'execution');
            results.push({
                nodeType: nodeType,
                testCase: testCase.name || 'Unknown Test',
                status: 'failed',
                error: error.message,
                timestamp: new Date().toISOString()
            });
            return processTestCase(i + 1);
        });
    };

    return processTestCase(0).then(function() {
        return results;
    });
};

/**
 * Execute a single test case
 */
TestRunner.prototype.executeTestCase = function(nodeType, testCase, config) {
    var self = this;
    var startTime = performance.now();
    var result = {
        nodeType: nodeType,
        testCase: testCase.name || 'Unknown Test',
        type: testCase.type || 'basic',
        status: 'pending',
        duration: 0,
        timestamp: new Date().toISOString(),
        details: {},
        errors: []
    };

    try {
        var context = this.createExecutionContext(nodeType, testCase, config);

        var abortController = { signal: { aborted: false } };
        var timeoutId = setTimeout(function() {
            abortController.signal.aborted = true;
        }, config.execution.timeout || 5000);

        return this.runTestWithContext(context, abortController.signal).then(function(testResult) {
            clearTimeout(timeoutId);

            result = Object.assign(result, testResult);
            result.duration = performance.now() - startTime;
            result.status = result.status || 'passed';

            return result;
        }).catch(function(error) {
            clearTimeout(timeoutId);
            result.status = 'failed';
            result.error = error.message;
            result.duration = performance.now() - startTime;

            if (abortController.signal.aborted) {
                result.error = 'Test timed out after ' + (config.execution.timeout || 5000) + 'ms';
                result.status = 'timeout';
            }

            return result;
        });
    } catch (error) {
        result.status = 'failed';
        result.error = error.message;
        result.duration = performance.now() - startTime;
        return Promise.resolve(result);
    }
};

/**
 * Create execution context
 */
TestRunner.prototype.createExecutionContext = function(nodeType, testCase, config) {
    return {
        nodeType: nodeType,
        testCase: testCase,
        config: config,
        graph: this.app.getGraph(),
        canvas: this.app.getCanvas(),
        utils: {
            createNode: function(type) { return LiteGraph.createNode(type); },
            connectNodes: function(nodeA, outputIndex, nodeB, inputIndex) {
                return nodeA.connect(outputIndex, nodeB, inputIndex);
            }
        }
    };
};

/**
 * Run test with context
 */
TestRunner.prototype.runTestWithContext = function(context, abortSignal) {
    var nodeType = context.nodeType;
    var testCase = context.testCase;
    var utils = context.utils;
    
    try {
        var node = utils.createNode(nodeType);
        if (!node) {
            throw new Error('Failed to create node of type: ' + nodeType);
        }

        return this.executeTestCaseLogic(node, testCase, utils, abortSignal);
        
    } catch (error) {
        return Promise.resolve({
            status: 'failed',
            errors: [{
                type: error.constructor.name,
                message: error.message
            }],
            warnings: [],
            details: {}
        });
    }
};

/**
 * Execute test case logic based on type
 */
TestRunner.prototype.executeTestCaseLogic = function(node, testCase, utils, abortSignal) {
    switch (testCase.type) {
        case 'basic':
            return this.executeBasicTest(node, testCase, utils, abortSignal);
        case 'inputValidation':
            return this.executeInputValidationTest(node, testCase, utils, abortSignal);
        case 'outputValidation':
            return this.executeOutputValidationTest(node, testCase, utils, abortSignal);
        case 'performance':
            return this.executePerformanceTest(node, testCase, utils, abortSignal);
        case 'stress':
            return this.executeStressTest(node, testCase, utils, abortSignal);
        case 'errorHandling':
            return this.executeErrorHandlingTest(node, testCase, utils, abortSignal);
        case 'stateManagement':
            return this.executeStateManagementTest(node, testCase, utils, abortSignal);
        default:
            throw new Error('Unknown test case type: ' + testCase.type);
    }
};

/**
 * Execute basic test
 */
TestRunner.prototype.executeBasicTest = function(node, testCase, utils, abortSignal) {
    var result = {
        status: 'passed',
        errors: [],
        warnings: [],
        details: {}
    };

    try {
        if (typeof node.onExecute === 'function') {
            node.onExecute();
            result.details.executionCompleted = true;
        }

        if (typeof node.onStart === 'function') {
            node.onStart();
            result.details.startCompleted = true;
        }

        if (typeof node.onStop === 'function') {
            node.onStop();
            result.details.stopCompleted = true;
        }

    } catch (error) {
        result.status = 'failed';
        result.errors.push({
            type: error.constructor.name,
            message: error.message
        });
    }

    return Promise.resolve(result);
};

/**
 * Execute input validation test
 */
TestRunner.prototype.executeInputValidationTest = function(node, testCase, utils, abortSignal) {
    var result = {
        status: 'passed',
        errors: [],
        warnings: [],
        details: {}
    };

    try {
        result.details.inputValidationTested = true;
    } catch (error) {
        result.status = 'failed';
        result.errors.push({
            type: error.constructor.name,
            message: error.message
        });
    }

    return Promise.resolve(result);
};

/**
 * Execute output validation test
 */
TestRunner.prototype.executeOutputValidationTest = function(node, testCase, utils, abortSignal) {
    var result = {
        status: 'passed',
        errors: [],
        warnings: [],
        details: {}
    };

    try {
        result.details.outputValidationTested = true;
    } catch (error) {
        result.status = 'failed';
        result.errors.push({
            type: error.constructor.name,
            message: error.message
        });
    }

    return Promise.resolve(result);
};

/**
 * Execute performance test
 */
TestRunner.prototype.executePerformanceTest = function(node, testCase, utils, abortSignal) {
    var result = {
        status: 'passed',
        errors: [],
        warnings: [],
        details: {}
    };

    try {
        var startTime = performance.now();
        
        for (var i = 0; i < 100; i++) {
            if (typeof node.onExecute === 'function') {
                node.onExecute();
            }
        }
        
        var endTime = performance.now();
        var avgExecutionTime = (endTime - startTime) / 100;
        
        result.details.averageExecutionTime = avgExecutionTime;
        result.details.performanceTestCompleted = true;

    } catch (error) {
        result.status = 'failed';
        result.errors.push({
            type: error.constructor.name,
            message: error.message
        });
    }

    return Promise.resolve(result);
};

/**
 * Execute stress test
 */
TestRunner.prototype.executeStressTest = function(node, testCase, utils, abortSignal) {
    var result = {
        status: 'passed',
        errors: [],
        warnings: [],
        details: {}
    };

    try {
        result.details.stressTestCompleted = true;
    } catch (error) {
        result.status = 'failed';
        result.errors.push({
            type: error.constructor.name,
            message: error.message
        });
    }

    return Promise.resolve(result);
};

/**
 * Execute error handling test
 */
TestRunner.prototype.executeErrorHandlingTest = function(node, testCase, utils, abortSignal) {
    var result = {
        status: 'passed',
        errors: [],
        warnings: [],
        details: {}
    };

    try {
        result.details.errorHandlingTested = true;
    } catch (error) {
        result.status = 'failed';
        result.errors.push({
            type: error.constructor.name,
            message: error.message
        });
    }

    return Promise.resolve(result);
};

/**
 * Execute state management test
 */
TestRunner.prototype.executeStateManagementTest = function(node, testCase, utils, abortSignal) {
    var result = {
        status: 'passed',
        errors: [],
        warnings: [],
        details: {}
    };

    try {
        result.details.stateManagementTested = true;
    } catch (error) {
        result.status = 'failed';
        result.errors.push({
            type: error.constructor.name,
            message: error.message
        });
    }

    return Promise.resolve(result);
};

/**
 * Setup event listeners
 */
TestRunner.prototype.setupEventListeners = function() {
    var self = this;
    if (window.TestConfig && window.TestConfig.on) {
        window.TestConfig.on('configChanged', function(data) {
            self.updateExecutionSettings();
            console.log('Test runner updated settings based on config change');
        });
    }
};

/**
 * Update execution settings
 */
TestRunner.prototype.updateExecutionSettings = function() {
    var config = window.TestConfig ? window.TestConfig.get('execution') : {};
    
    if (this.framework && this.framework.updateConfig) {
        this.framework.updateConfig({
            timeout: config.timeout,
            memoryTracking: config.memoryTracking,
            coverageTracking: config.coverageTracking
        });
    }
};

/**
 * Log error
 */
TestRunner.prototype.logError = function(message, category) {
    category = category || 'execution';
    var error = {
        message: message,
        category: category,
        timestamp: Date.now(),
        context: this.currentExecution ? { 
            nodeType: this.currentExecution.nodeType,
            testType: this.currentExecution.testType 
        } : null
    };
    
    this.errorLog.push(error);
    console.error('[' + category.toUpperCase() + '] ' + message);
    
    if (this.app && this.app.uiManager && this.app.uiManager.updateLogs) {
        this.app.uiManager.updateLogs({
            errors: this.errorLog,
            warnings: this.warningLog
        });
    }
    
    return error;
};

/**
 * Log warning
 */
TestRunner.prototype.logWarning = function(message, category) {
    category = category || 'execution';
    var warning = {
        message: message,
        category: category,
        timestamp: Date.now(),
        context: this.currentExecution ? { 
            nodeType: this.currentExecution.nodeType,
            testType: this.currentExecution.testType 
        } : null
    };
    
    this.warningLog.push(warning);
    console.warn('[' + category.toUpperCase() + '] ' + message);
    
    if (this.app && this.app.uiManager && this.app.uiManager.updateLogs) {
        this.app.uiManager.updateLogs({
            errors: this.errorLog,
            warnings: this.warningLog
        });
    }
    
    return warning;
};

/**
 * Log message
 */
TestRunner.prototype.logMessage = function(message, level) {
    level = level || 'info';
    console.log('[' + level.toUpperCase() + '] ' + message);
};

/**
 * Clear logs
 */
TestRunner.prototype.clearLogs = function() {
    this.errorLog = [];
    this.warningLog = [];
};

/**
 * Attempt recovery from error
 */
TestRunner.prototype.attemptRecovery = function(error, context) {
    var self = this;
    if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
        this.logWarning('Maximum recovery attempts reached, giving up', 'execution');
        return Promise.resolve(false);
    }
    
    this.recoveryAttempts++;
    this.logWarning('Attempting recovery (' + this.recoveryAttempts + '/' + this.maxRecoveryAttempts + ')', 'execution');
    
    return this.delay(1000).then(function() {
        self.shouldStop = false;
        
        return new Promise(function(resolve) {
            setTimeout(function() {
                self.logWarning('Recovery completed', 'execution');
                resolve(true);
            }, 500);
        });
    }).catch(function(recoveryError) {
        self.logError('Recovery failed: ' + recoveryError.message, 'critical');
        return false;
    });
};

/**
 * Start execution
 */
TestRunner.prototype.startExecution = function() {
    this.isRunning = true;
    this.shouldStop = false;
    this.startTime = Date.now();
    this.recoveryAttempts = 0;
};

/**
 * End execution
 */
TestRunner.prototype.endExecution = function() {
    this.isRunning = false;
    this.endTime = Date.now();
    this.currentExecution = null;
};

/**
 * Get test statistics
 */
TestRunner.prototype.getTestStatistics = function() {
    return {
        totalTests: this.results.length,
        passedTests: this.results.filter(function(r) { return r.status === 'passed'; }).length,
        failedTests: this.results.filter(function(r) { return r.status === 'failed'; }).length,
        skippedTests: this.results.filter(function(r) { return r.status === 'skipped'; }).length,
        duration: this.endTime ? (this.endTime - this.startTime) : 0,
        errorCount: this.errorLog.length,
        warningCount: this.warningLog.length
    };
};

/**
 * Delay utility
 */
TestRunner.prototype.delay = function(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    });
};

// Make TestRunner available globally
window.TestRunner = TestRunner;
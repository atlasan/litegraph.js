/**
 * Test Case Generator
 * Automatically generates test cases for LiteGraph nodes based on their structure
 */

import { LiteGraph } from "/src/litegraph.js";

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

        // Integration tests
        this.testTemplates.set('integration', {
            name: 'Integration Testing',
            description: 'Tests node connections and data flow between nodes',
            category: 'integration',
            priority: 'high',
            generate: (nodeType, analysis) => this.generateIntegrationTest(nodeType, analysis)
        });

        // Edge case tests
        this.testTemplates.set('edge_cases', {
            name: 'Edge Cases',
            description: 'Tests boundary conditions and unusual scenarios',
            category: 'edge',
            priority: 'high',
            generate: (nodeType, analysis) => this.generateEdgeCaseTest(nodeType, analysis)
        });

        // Memory leak tests
        this.testTemplates.set('memory_leak', {
            name: 'Memory Leak Detection',
            description: 'Tests for memory leaks and resource cleanup',
            category: 'memory',
            priority: 'medium',
            generate: (nodeType, analysis) => this.generateMemoryLeakTest(nodeType, analysis)
        });

        // Compatibility tests
        this.testTemplates.set('compatibility', {
            name: 'Compatibility Testing',
            description: 'Tests compatibility with different LiteGraph versions and browsers',
            category: 'compatibility',
            priority: 'low',
            generate: (nodeType, analysis) => this.generateCompatibilityTest(nodeType, analysis)
        });
    }

    /**
     * Generate basic test cases for a node type
     */
    generateBasicTests(nodeType) {
        const tests = [];
        
        // Analyze node structure
        const analysis = this.analyzeNodeType(nodeType);
        
        // Generate tests based on templates
        for (const [templateId, template] of this.testTemplates) {
            try {
                const test = template.generate(nodeType, analysis);
                if (test) {
                    tests.push(test);
                }
            } catch (error) {
                console.warn(`Failed to generate ${templateId} test for ${nodeType}:`, error);
            }
        }
        
        return tests;
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
    generatePerformanceTests(nodeType, nodeInfo) {
        const analysis = this.analyzeNodeType(nodeType);
        const test = this.generatePerformanceTest(nodeType, analysis);
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
            node = new NodeClass();
        } catch (error) {
            console.warn(`Failed to create instance of ${nodeType}:`, error);
            return null;
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
            complexity: this.calculateComplexity(node),
            dependencies: this.analyzeDependencies(node),
            performance: this.analyzePerformanceCharacteristics(node),
            security: this.analyzeSecurityImplications(node)
        };
        
        // Calculate test coverage and risk level based on analysis
        analysis.testCoverage = this.calculateTestCoverage(analysis);
        analysis.riskLevel = this.calculateRiskLevel(analysis);
        
        this.nodeAnalysis.set(nodeType, analysis);
        return analysis;
    }

    /**
     * Calculate which tests should be applied to this node type
     */
    calculateTestCoverage(analysis) {
        return {
            basic: true, // Always test basic functionality
            input_validation: analysis.inputs && analysis.inputs.length > 0,
            output_validation: analysis.outputs && analysis.outputs.length > 0,
            performance: analysis.complexity === 'high' || analysis.isAsync,
            stress: analysis.complexity === 'high',
            error_handling: true, // Always test error handling
            state_management: analysis.hasState || Object.keys(analysis.properties || {}).length > 0,
            integration: (analysis.inputs && analysis.inputs.length > 0) && (analysis.outputs && analysis.outputs.length > 0),
            edge_cases: true, // Always test edge cases
            memory_leak: analysis.complexity === 'high' || analysis.isAsync,
            compatibility: analysis.dependencies && analysis.dependencies.length > 0
        };
    }
    
    /**
     * Calculate risk level for testing prioritization
     */
    calculateRiskLevel(analysis) {
        let riskScore = 0;
        
        // High complexity increases risk
        if (analysis.complexity === 'high') riskScore += 3;
        else if (analysis.complexity === 'medium') riskScore += 2;
        else riskScore += 1;
        
        // Async behavior increases risk
        if (analysis.isAsync) riskScore += 2;
        
        // State management increases risk
        if (analysis.hasState) riskScore += 2;
        
        // Many inputs/outputs increase risk
        const ioCount = (analysis.inputs?.length || 0) + (analysis.outputs?.length || 0);
        if (ioCount > 5) riskScore += 2;
        else if (ioCount > 2) riskScore += 1;
        
        // Security implications increase risk
        if (analysis.security?.hasSecurityImplications) riskScore += 3;
        
        if (riskScore >= 7) return 'critical';
        if (riskScore >= 5) return 'high';
        if (riskScore >= 3) return 'medium';
        return 'low';
    }
    
    /**
     * Analyze node dependencies
     */
    analyzeDependencies(node) {
        const dependencies = [];
        
        // Check for external library dependencies
        const nodeString = node.constructor.toString();
        
        // Common library patterns
        const libraryPatterns = [
            { name: 'Math', pattern: /Math\./g },
            { name: 'Date', pattern: /new Date/g },
            { name: 'JSON', pattern: /JSON\./g },
            { name: 'localStorage', pattern: /localStorage/g },
            { name: 'fetch', pattern: /fetch\(/g },
            { name: 'XMLHttpRequest', pattern: /XMLHttpRequest/g },
            { name: 'WebGL', pattern: /WebGL|gl\./g },
            { name: 'Canvas', pattern: /getContext|canvas/g }
        ];
        
        for (const lib of libraryPatterns) {
            if (lib.pattern.test(nodeString)) {
                dependencies.push(lib.name);
            }
        }
        
        return dependencies;
    }
    
    /**
     * Analyze performance characteristics
     */
    analyzePerformanceCharacteristics(node) {
        return {
            expectedExecutionTime: this.estimateExecutionTime(node),
            memoryUsage: this.estimateMemoryUsage(node),
            cpuIntensive: this.isCpuIntensive(node),
            ioIntensive: this.isIoIntensive(node)
        };
    }
    
    /**
     * Analyze security implications
     */
    analyzeSecurityImplications(node) {
        const nodeString = node.constructor.toString();
        
        const securityPatterns = [
            { name: 'eval', pattern: /eval\(/g, risk: 'high' },
            { name: 'innerHTML', pattern: /innerHTML/g, risk: 'medium' },
            { name: 'document.write', pattern: /document\.write/g, risk: 'high' },
            { name: 'localStorage', pattern: /localStorage/g, risk: 'low' },
            { name: 'fetch', pattern: /fetch\(/g, risk: 'medium' },
            { name: 'XMLHttpRequest', pattern: /XMLHttpRequest/g, risk: 'medium' }
        ];
        
        const securityIssues = [];
        let hasSecurityImplications = false;
        
        for (const pattern of securityPatterns) {
            if (pattern.pattern.test(nodeString)) {
                securityIssues.push({
                    type: pattern.name,
                    risk: pattern.risk
                });
                hasSecurityImplications = true;
            }
        }
        
        return {
            hasSecurityImplications,
            securityIssues,
            requiresSecurityTesting: hasSecurityImplications
        };
    }
    
    /**
     * Estimate execution time
     */
    estimateExecutionTime(node) {
        // Simple heuristic based on node characteristics
        let estimatedTime = 1; // Base 1ms
        
        if (node.inputs && node.inputs.length > 3) estimatedTime += 2;
        if (node.outputs && node.outputs.length > 3) estimatedTime += 2;
        if (Object.keys(node.properties || {}).length > 5) estimatedTime += 3;
        
        return estimatedTime;
    }
    
    /**
     * Estimate memory usage
     */
    estimateMemoryUsage(node) {
        // Simple heuristic in KB
        let estimatedMemory = 1; // Base 1KB
        
        if (node.inputs) estimatedMemory += node.inputs.length * 0.5;
        if (node.outputs) estimatedMemory += node.outputs.length * 0.5;
        if (node.properties) estimatedMemory += Object.keys(node.properties).length * 0.2;
        
        return estimatedMemory;
    }
    
    /**
     * Check if node is CPU intensive
     */
    isCpuIntensive(node) {
        const nodeString = node.constructor.toString();
        const cpuPatterns = /for\s*\(|while\s*\(|Math\.|calculate|compute|process|transform/gi;
        return cpuPatterns.test(nodeString);
    }
    
    /**
     * Check if node is I/O intensive
     */
    isIoIntensive(node) {
        const nodeString = node.constructor.toString();
        const ioPatterns = /fetch|XMLHttpRequest|localStorage|sessionStorage|indexedDB|file|image|audio|video/gi;
        return ioPatterns.test(nodeString);
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
        // Generate basic test inputs based on node analysis
        const testInputs = [];
        if (analysis.inputs && analysis.inputs.length > 0) {
            for (let i = 0; i < analysis.inputs.length; i++) {
                const input = analysis.inputs[i];
                const testValues = this.generateTestValues(input.type);
                if (testValues.length > 0) {
                    testInputs.push(testValues[0].value); // Use first valid test value
                }
            }
        }

        // Generate expected outputs based on node analysis
        const expectedOutputs = [];
        if (analysis.outputs && analysis.outputs.length > 0) {
            for (let i = 0; i < analysis.outputs.length; i++) {
                expectedOutputs.push(null); // Will be validated during execution
            }
        }

        return {
            id: `basic_${nodeType}_${Date.now()}`,
            type: 'basic',
            name: `Basic Functionality - ${analysis.title || nodeType}`,
            description: `Tests basic creation, inputs, outputs, and execution of ${nodeType}`,
            category: 'basic',
            priority: 'high',
            timeout: 5000,
            inputs: testInputs,
            expectedOutputs: expectedOutputs,
            properties: {},
            nodeType: nodeType,
            analysis: analysis
        };
    }

    /**
     * Generate input validation test
     */
    generateInputValidationTest(nodeType, analysis) {
        if (!analysis.inputs || analysis.inputs.length === 0) {
            return null; // Skip if no inputs
        }
        
        // Generate invalid inputs for testing
        const invalidInputs = [];
        for (let i = 0; i < analysis.inputs.length; i++) {
            const input = analysis.inputs[i];
            const testValues = this.generateTestValues(input.type);
            // Use invalid test values (null, undefined, wrong types)
            invalidInputs.push(null);
            invalidInputs.push(undefined);
            if (input.type === 'number') {
                invalidInputs.push('not_a_number');
            } else if (input.type === 'string') {
                invalidInputs.push(12345);
            }
        }
        
        return {
            id: `input_validation_${nodeType}_${Date.now()}`,
            type: 'input_validation',
            name: `Input Validation - ${analysis.title || nodeType}`,
            description: `Tests input handling and validation for ${nodeType}`,
            category: 'validation',
            priority: 'high',
            timeout: 5000,
            invalidInputs: invalidInputs,
            expectedBehavior: 'graceful', // or 'error' depending on node
            nodeType: nodeType,
            analysis: analysis
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
            id: `output_validation_${nodeType}_${Date.now()}`,
            type: 'output_validation',
            name: `Output Validation - ${analysis.title}`,
            description: `Tests output consistency and type correctness for ${nodeType}`,
            category: 'validation',
            priority: 'medium',
            timeout: 5000,
            expectedOutputs: analysis.outputs,
            nodeType: nodeType,
            analysis: analysis
        };
    }

    /**
     * Generate performance test
     */
    generatePerformanceTest(nodeType, analysis) {
        return {
            id: `performance_${nodeType}_${Date.now()}`,
            type: 'performance',
            name: `Performance Test - ${analysis.title}`,
            description: `Tests execution performance and memory usage for ${nodeType}`,
            category: 'performance',
            priority: 'medium',
            timeout: 10000,
            nodeType: nodeType,
            analysis: analysis
        };
    }

    /**
     * Generate stress test
     */
    generateStressTest(nodeType, analysis) {
        return {
            id: `stress_${nodeType}_${Date.now()}`,
            type: 'stress',
            name: `Stress Test - ${analysis.title}`,
            description: `Tests node behavior under high load for ${nodeType}`,
            category: 'stress',
            priority: 'low',
            timeout: 30000,
            nodeType: nodeType,
            analysis: analysis
        };
    }

    /**
     * Generate error handling test
     */
    generateErrorHandlingTest(nodeType, analysis) {
        return {
            id: `error_handling_${nodeType}_${Date.now()}`,
            type: 'error_handling',
            name: `Error Handling - ${analysis.title}`,
            description: `Tests node behavior with invalid inputs and error conditions for ${nodeType}`,
            category: 'error',
            priority: 'high',
            timeout: 5000,
            nodeType: nodeType,
            analysis: analysis
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
            id: `state_management_${nodeType}_${Date.now()}`,
            type: 'state_management',
            name: `State Management - ${analysis.title}`,
            description: `Tests property persistence and state changes for ${nodeType}`,
            category: 'state',
            priority: 'medium',
            timeout: 5000,
            nodeType: nodeType,
            analysis: analysis
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
                    { value: Number.MAX_VALUE, type: 'number', description: 'maximum value' },
                    { value: Number.MIN_VALUE, type: 'number', description: 'minimum value' },
                    { value: Number.MAX_SAFE_INTEGER, type: 'number', description: 'max safe integer' },
                    { value: Number.MIN_SAFE_INTEGER, type: 'number', description: 'min safe integer' },
                    { value: NaN, type: 'number', description: 'NaN' },
                    { value: Infinity, type: 'number', description: 'Infinity' },
                    { value: -Infinity, type: 'number', description: 'negative Infinity' },
                    { value: 1e-10, type: 'number', description: 'very small number' },
                    { value: 1e10, type: 'number', description: 'very large number' }
                ]);
                
            case 'string':
                return baseValues.concat([
                    { value: '', type: 'string', description: 'empty string' },
                    { value: 'test', type: 'string', description: 'simple string' },
                    { value: 'Hello, World!', type: 'string', description: 'string with punctuation' },
                    { value: '123', type: 'string', description: 'numeric string' },
                    { value: 'true', type: 'string', description: 'boolean string' },
                    { value: '\n\t\r', type: 'string', description: 'whitespace string' },
                    { value: 'a'.repeat(1000), type: 'string', description: 'very long string' },
                    { value: '🚀🎉💻', type: 'string', description: 'unicode/emoji string' },
                    { value: 'null', type: 'string', description: 'string "null"' },
                    { value: 'undefined', type: 'string', description: 'string "undefined"' },
                    { value: JSON.stringify({test: 'value'}), type: 'string', description: 'JSON string' }
                ]);
                
            case 'boolean':
                return baseValues.concat([
                    { value: true, type: 'boolean', description: 'true' },
                    { value: false, type: 'boolean', description: 'false' },
                    { value: 0, type: 'number', description: 'falsy number' },
                    { value: 1, type: 'number', description: 'truthy number' },
                    { value: '', type: 'string', description: 'falsy string' },
                    { value: 'false', type: 'string', description: 'string "false"' }
                ]);
                
            case 'array':
                return baseValues.concat([
                    { value: [], type: 'array', description: 'empty array' },
                    { value: [1, 2, 3], type: 'array', description: 'number array' },
                    { value: ['a', 'b', 'c'], type: 'array', description: 'string array' },
                    { value: [1, 'two', true], type: 'array', description: 'mixed array' },
                    { value: new Array(1000).fill(0), type: 'array', description: 'large array' },
                    { value: [[1, 2], [3, 4]], type: 'array', description: 'nested array' },
                    { value: [null, undefined, NaN], type: 'array', description: 'array with special values' }
                ]);
                
            case 'object':
                return baseValues.concat([
                    { value: {}, type: 'object', description: 'empty object' },
                    { value: { a: 1, b: 2 }, type: 'object', description: 'simple object' },
                    { value: { nested: { value: 42 } }, type: 'object', description: 'nested object' },
                    { value: Object.create(null), type: 'object', description: 'null prototype object' },
                    { value: new Date(), type: 'object', description: 'Date object' },
                    { value: /regex/, type: 'object', description: 'RegExp object' },
                    { value: new Error('test'), type: 'object', description: 'Error object' }
                ]);
                
            case 'function':
                return baseValues.concat([
                    { value: function() {}, type: 'function', description: 'empty function' },
                    { value: () => {}, type: 'function', description: 'arrow function' },
                    { value: async function() {}, type: 'function', description: 'async function' },
                    { value: function* () {}, type: 'function', description: 'generator function' }
                ]);
                
            default:
                return baseValues.concat([
                    { value: 42, type: 'number', description: 'number' },
                    { value: 'test', type: 'string', description: 'string' },
                    { value: true, type: 'boolean', description: 'boolean' },
                    { value: [], type: 'array', description: 'array' },
                    { value: {}, type: 'object', description: 'object' },
                    { value: function() {}, type: 'function', description: 'function' },
                    { value: Symbol('test'), type: 'symbol', description: 'symbol' }
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
     * Generate integration test
     */
    generateIntegrationTest(nodeType, analysis) {
        return {
            id: `integration_${nodeType}_${Date.now()}`,
            type: 'integration',
            name: `Integration Test - ${analysis.title}`,
            description: `Tests node connections and data flow for ${nodeType}`,
            category: 'integration',
            priority: 'high',
            timeout: 10000,
            nodeType: nodeType,
            analysis: analysis
        };
    }

    /**
     * Generate edge case test
     */
    generateEdgeCaseTest(nodeType, analysis) {
        return {
            id: `edge_${nodeType}_${Date.now()}`,
            type: 'edge',
            name: `Edge Cases - ${analysis.title}`,
            description: `Tests boundary conditions for ${nodeType}`,
            category: 'edge',
            priority: 'high',
            timeout: 5000,
            nodeType: nodeType,
            analysis: analysis
        };
    }

    /**
     * Generate memory leak test
     */
    generateMemoryLeakTest(nodeType, analysis) {
        return {
            id: `memory_${nodeType}_${Date.now()}`,
            type: 'memory',
            name: `Memory Leak Test - ${analysis.title}`,
            description: `Tests for memory leaks in ${nodeType}`,
            category: 'memory',
            priority: 'medium',
            timeout: 15000,
            nodeType: nodeType,
            analysis: analysis
        };
    }

    /**
     * Generate compatibility test
     */
    generateCompatibilityTest(nodeType, analysis) {
        return {
            id: `compatibility_${nodeType}_${Date.now()}`,
            type: 'compatibility',
            name: `Compatibility Test - ${analysis.title}`,
            description: `Tests compatibility for ${nodeType}`,
            category: 'compatibility',
            priority: 'low',
            timeout: 5000,
            nodeType: nodeType,
            analysis: analysis
        };
    }

    /**
     * Clear analysis cache
     */
    clearCache() {
        this.nodeAnalysis.clear();
    }
}

export default TestCaseGenerator;
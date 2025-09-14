/**
 * LiteGraph Editor Tester - Main Application Controller
 * Integrates the testing framework with the UI and manages user interactions
 */

import { LiteGraph } from "/src/litegraph.js";
const { LGraphCanvas } = LiteGraph;
import { testFramework } from "./test-framework.js";
import { TestCaseGenerator } from "./test-generator.js";
import { TestReporter } from "./test-reporter.js";
import { UIManager } from "./ui-manager.js";
import { TestRunner } from "./test-runner.js";

class EditorTesterApp {
    constructor() {
        this.graph = null;
        this.canvas = null;
        this.selectedNodeType = null;
        this.isTestRunning = false;
        this.testResults = new Map();
        this.nodeInstances = new Map();
        this.availableNodeTypes = [];
        
        // Component instances
        this.testRunner = null;
        this.uiManager = null;
        this.generator = new TestCaseGenerator();
        this.reporter = new TestReporter();
        
        // UI Elements
        this.elements = {
            canvas: null,
            nodeList: null,
            testResults: null,
            console: null,
            runButton: null,
            stopButton: null,
            clearButton: null,
            exportButton: null,
            configButton: null,
            statsElements: {
                total: null,
                passed: null,
                failed: null,
                coverage: null
            }
        };
        
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            // Wait for LiteGraph to be fully loaded
            await this.waitForLiteGraph();
            
            this.initializeElements();
            this.initializeGraph();
            this.discoverAvailableNodes();
            this.initializeComponents();
            this.initializeEventListeners();
            this.initializeTestFramework();
            
            // Load available nodes
            await this.loadNodeTypes();
            
            // Generate default test cases
            await this.generateDefaultTests();
            
            this.log('Editor Tester initialized successfully', 'info');
            this.log(`Discovered ${this.availableNodeTypes.length} node types`, 'info');
            
        } catch (error) {
            console.error('Failed to initialize Editor Tester:', error);
            // Don't use this.log here as elements might not be initialized yet
            if (this.elements && this.elements.console) {
                this.log(`Initialization failed: ${error.message}`, 'error');
            }
        }
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        // Canvas
        this.elements.canvas = document.getElementById('graph-canvas');
        if (!this.elements.canvas) {
            throw new Error('Canvas element not found');
        }
        
        // UI panels
        this.elements.nodeList = document.getElementById('node-list');
        this.elements.testResults = document.getElementById('test-results');
        this.elements.console = document.getElementById('console-output');
        
        // Control buttons
        this.elements.runButton = document.getElementById('runAllBtn');
        this.elements.runSelectedButton = document.getElementById('runSelectedBtn');
        this.elements.stopButton = document.getElementById('stopBtn');
        this.elements.clearButton = document.getElementById('clearResultsBtn');
        this.elements.exportButton = document.getElementById('exportBtn');
        this.elements.configButton = document.getElementById('configBtn');
        this.elements.saveTestButton = document.getElementById('save-test-case');
        this.elements.loadTestButton = document.getElementById('load-test-case');
        
        // Stats elements
        this.elements.statsElements.total = document.getElementById('stat-total');
        this.elements.statsElements.passed = document.getElementById('stat-passed');
        this.elements.statsElements.failed = document.getElementById('stat-failed');
        this.elements.statsElements.coverage = document.getElementById('stat-coverage');
        
        // Validate required elements
        const required = ['canvas', 'nodeList', 'testResults', 'console', 'runButton'];
        for (const key of required) {
            if (!this.elements[key]) {
                console.warn(`Element '${key}' not found, some functionality may be limited`);
            }
        }
    }

    /**
     * Discover available node types
     */
    discoverAvailableNodes() {
        this.availableNodeTypes = [];
        
        // Get registered node types from LiteGraph
        if (LiteGraph && LiteGraph.registered_node_types) {
            this.availableNodeTypes = Object.keys(LiteGraph.registered_node_types);
        }
        
        this.log(`Available node types: ${this.availableNodeTypes.join(', ')}`, 'info');
    }

    /**
     * Initialize components
     */
    initializeComponents() {
        // Initialize test runner
        this.testRunner = new TestRunner(this);
        
        // Initialize UI manager
        this.uiManager = new UIManager(this);
        
        // Generator is already initialized in constructor
        // No additional initialization needed
    }

    /**
     * Initialize LiteGraph
     */
    initializeGraph() {
        // Create graph
        this.graph = new LiteGraph.LGraph();
        
        // Create canvas
        this.canvas = new LGraphCanvas(this.elements.canvas, this.graph);
        
        // Configure canvas for testing
        this.canvas.background_image = null;
        this.canvas.render_shadows = false;
        this.canvas.render_canvas_border = true;
        this.canvas.render_connections_shadows = false;
        this.canvas.render_execution_order = true;
        this.canvas.render_connection_arrows = true;
        
        // Configure graph for testing
        this.graph.catch_errors = true;
        this.graph.execution_timer_id = null;
        
        // Set canvas size
        this.resizeCanvas();
        
        // Start rendering
        this.graph.start();
        
        this.log('LiteGraph initialized', 'info');
    }

    /**
     * Initialize event listeners
     */
    initializeEventListeners() {
        // Window resize
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Control buttons
        if (this.elements.runButton) {
            this.elements.runButton.addEventListener('click', () => this.runTests());
        }
        
        if (this.elements.runSelectedButton) {
            this.elements.runSelectedButton.addEventListener('click', () => this.runSelectedTests());
        }
        
        if (this.elements.stopButton) {
            this.elements.stopButton.addEventListener('click', () => this.stopTests());
        }
        
        if (this.elements.clearButton) {
            this.elements.clearButton.addEventListener('click', () => this.clearResults());
        }
        
        if (this.elements.exportButton) {
            this.elements.exportButton.addEventListener('click', () => this.exportResults());
        }
        
        if (this.elements.configButton) {
            this.elements.configButton.addEventListener('click', () => this.showConfigModal());
        }
        
        if (this.elements.saveTestButton) {
            this.elements.saveTestButton.addEventListener('click', () => this.saveTestCase());
        }
        
        if (this.elements.loadTestButton) {
            this.elements.loadTestButton.addEventListener('click', () => this.loadTestCase());
        }
        
        // Node list interactions with debouncing
        if (this.elements.nodeList) {
            this.elements.nodeList.addEventListener('click', (e) => {
                const nodeItem = e.target.closest('.node-item');
                if (nodeItem) {
                    this.selectNodeType(nodeItem.dataset.nodeType);
                }
            });
            
            let lastClickTime = 0;
            const debounceDelay = 300; // 300ms debounce
            
            this.elements.nodeList.addEventListener('dblclick', (e) => {
                const now = Date.now();
                if (now - lastClickTime < debounceDelay) {
                    return; // Ignore rapid clicks
                }
                lastClickTime = now;
                
                const nodeItem = e.target.closest('.node-item');
                if (nodeItem) {
                    this.addNodeToGraph(nodeItem.dataset.nodeType);
                }
            });
        }
        
        // Test results interactions
        if (this.elements.testResults) {
            this.elements.testResults.addEventListener('click', (e) => {
                const resultItem = e.target.closest('.test-result-item');
                if (resultItem) {
                    this.showTestDetails(resultItem.dataset.testId);
                }
            });
        }
        
        // Graph events
        this.graph.onNodeAdded = (node) => {
            this.log(`Node added: ${node.type}`, 'info');
            this.nodeInstances.set(node.id, node);
        };
        
        this.graph.onNodeRemoved = (node) => {
            this.log(`Node removed: ${node.type}`, 'info');
            this.nodeInstances.delete(node.id);
        };
    }

    /**
     * Initialize test framework event listeners
     */
    initializeTestFramework() {
        testFramework.on('testRunStarted', (data) => {
            this.isTestRunning = true;
            this.updateControlButtons();
            this.log(`Starting test run with ${data.filter ? 'filters' : 'all tests'}`, 'info');
        });
        
        testFramework.on('testCompleted', (data) => {
            this.updateTestResult(data.test, data.result);
            this.updateStats();
        });
        
        testFramework.on('testRunCompleted', (data) => {
            this.isTestRunning = false;
            this.updateControlButtons();
            this.log(`Test run completed. Stats: ${JSON.stringify(data.stats)}`, 'success');
        });
        
        testFramework.on('testRunError', (data) => {
            this.isTestRunning = false;
            this.updateControlButtons();
            this.log(`Test run error: ${data.error.message}`, 'error');
        });
        
        testFramework.on('testRunStopped', () => {
            this.isTestRunning = false;
            this.updateControlButtons();
            this.log('Test run stopped by user', 'warning');
        });
    }

    /**
     * Load available node types
     */
    async loadNodeTypes() {
        const nodeTypes = Object.keys(LiteGraph.registered_node_types);
        
        if (!this.elements.nodeList) return;
        
        // Clear existing list
        this.elements.nodeList.innerHTML = '';
        
        // Group nodes by category
        const categories = {};
        
        for (const nodeType of nodeTypes) {
            const parts = nodeType.split('/');
            const category = parts.length > 1 ? parts[0] : 'Other';
            const name = parts.length > 1 ? parts.slice(1).join('/') : nodeType;
            
            if (!categories[category]) {
                categories[category] = [];
            }
            
            categories[category].push({ type: nodeType, name });
        }
        
        // Create category sections
        for (const [category, nodes] of Object.entries(categories)) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'node-category';
            
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'node-category-header';
            categoryHeader.textContent = category;
            categoryHeader.addEventListener('click', () => {
                categoryDiv.classList.toggle('collapsed');
            });
            
            const nodesList = document.createElement('div');
            nodesList.className = 'node-category-items';
            
            for (const node of nodes.sort((a, b) => a.name.localeCompare(b.name))) {
                const nodeItem = document.createElement('div');
                nodeItem.className = 'node-item';
                nodeItem.dataset.nodeType = node.type;
                nodeItem.textContent = node.name;
                nodeItem.title = node.type;
                
                nodesList.appendChild(nodeItem);
            }
            
            categoryDiv.appendChild(categoryHeader);
            categoryDiv.appendChild(nodesList);
            this.elements.nodeList.appendChild(categoryDiv);
        }
        
        this.log(`Loaded ${nodeTypes.length} node types in ${Object.keys(categories).length} categories`, 'info');
    }

    /**
     * Generate default test cases for all node types
     */
    async generateDefaultTests() {
        const generator = new TestCaseGenerator();
        const nodeTypes = Object.keys(LiteGraph.registered_node_types);
        
        let generatedCount = 0;
        
        for (const nodeType of nodeTypes) {
            try {
                const tests = generator.generateBasicTests(nodeType);
                
                for (const test of tests) {
                    testFramework.registerTest(nodeType, test);
                    generatedCount++;
                }
                
            } catch (error) {
                this.log(`Failed to generate tests for ${nodeType}: ${error.message}`, 'warning');
            }
        }
        
        this.log(`Generated ${generatedCount} default test cases`, 'info');
    }

    /**
     * Run all tests
     */
    async runAllTests(progressCallback) {
        if (!this.testRunner) {
            throw new Error('Test runner not initialized');
        }
        
        return await this.testRunner.runAllTests(progressCallback);
    }

    /**
     * Run selected tests
     */
    async runSelectedTests(nodeTypes, progressCallback) {
        if (!this.testRunner) {
            throw new Error('Test runner not initialized');
        }
        
        // If no nodeTypes provided, get selected nodes from UI
        if (!nodeTypes) {
            nodeTypes = this.getSelectedNodeTypes();
            if (nodeTypes.length === 0) {
                this.log('No nodes selected for testing', 'warning');
                return [];
            }
        }
        
        return await this.testRunner.runSelectedTests(nodeTypes, progressCallback);
    }
    
    /**
     * Run tests for specific node types
     */
    async runTestsForNodeTypes(nodeTypes, progressCallback) {
        if (!this.testRunner) {
            throw new Error('Test runner not initialized');
        }
        
        if (!nodeTypes || nodeTypes.length === 0) {
            this.log('No node types provided for testing', 'warning');
            return [];
        }
        
        this.log(`Running tests for ${nodeTypes.length} node types: ${nodeTypes.join(', ')}`);
        return await this.testRunner.runTestsForNodeTypes(nodeTypes, progressCallback);
    }
    
    /**
     * Get selected node types from UI
     */
    getSelectedNodeTypes() {
        if (this.uiManager && this.uiManager.selectedNodes) {
            return Array.from(this.uiManager.selectedNodes);
        }
        return [];
    }
    
    /**
     * Save current test case configuration
     */
    saveTestCase() {
        try {
            const testCase = {
                timestamp: new Date().toISOString(),
                graph: this.graph.serialize(),
                selectedNodes: this.getSelectedNodeTypes(),
                config: this.getTestConfig(),
                results: Array.from(this.testResults.entries())
            };
            
            const dataStr = JSON.stringify(testCase, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `test-case-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
            link.click();
            
            this.log('Test case saved successfully', 'success');
        } catch (error) {
            this.log(`Failed to save test case: ${error.message}`, 'error');
        }
    }
    
    /**
     * Load test case configuration
     */
    loadTestCase() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const testCase = JSON.parse(e.target.result);
                    
                    // Load graph
                    if (testCase.graph) {
                        this.graph.configure(testCase.graph);
                        this.canvas.setDirty(true, true);
                    }
                    
                    // Load test results
                    if (testCase.results) {
                        this.testResults = new Map(testCase.results);
                        this.updateStats();
                    }
                    
                    // Apply config
                    if (testCase.config) {
                        this.applyTestConfig(testCase.config);
                    }
                    
                    this.log(`Test case loaded: ${testCase.timestamp}`, 'success');
                } catch (error) {
                    this.log(`Failed to load test case: ${error.message}`, 'error');
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    }
    
    /**
     * Get current test configuration
     */
    getTestConfig() {
        return {
            timeout: document.getElementById('test-timeout')?.value || 5000,
            stressIterations: document.getElementById('stress-iterations')?.value || 1000,
            perfSamples: document.getElementById('perf-samples')?.value || 100,
            validateInputs: document.getElementById('validate-inputs')?.checked || true,
            validateOutputs: document.getElementById('validate-outputs')?.checked || true,
            validateProperties: document.getElementById('validate-properties')?.checked || true,
            validateExecution: document.getElementById('validate-execution')?.checked || true,
            validateMemory: document.getElementById('validate-memory')?.checked || true
        };
    }
    
    /**
     * Apply test configuration
     */
    applyTestConfig(config) {
        if (document.getElementById('test-timeout')) {
            document.getElementById('test-timeout').value = config.timeout || 5000;
        }
        if (document.getElementById('stress-iterations')) {
            document.getElementById('stress-iterations').value = config.stressIterations || 1000;
        }
        if (document.getElementById('perf-samples')) {
            document.getElementById('perf-samples').value = config.perfSamples || 100;
        }
        if (document.getElementById('validate-inputs')) {
            document.getElementById('validate-inputs').checked = config.validateInputs !== false;
        }
        if (document.getElementById('validate-outputs')) {
            document.getElementById('validate-outputs').checked = config.validateOutputs !== false;
        }
        if (document.getElementById('validate-properties')) {
            document.getElementById('validate-properties').checked = config.validateProperties !== false;
        }
        if (document.getElementById('validate-execution')) {
            document.getElementById('validate-execution').checked = config.validateExecution !== false;
        }
        if (document.getElementById('validate-memory')) {
            document.getElementById('validate-memory').checked = config.validateMemory !== false;
        }
    }

    /**
     * Run single node test
     */
    async runSingleNodeTest(nodeType) {
        if (!this.testRunner) {
            throw new Error('Test runner not initialized');
        }
        
        return await this.testRunner.runSingleNodeTest(nodeType);
    }

    /**
     * Run tests with optional filters
     */
    async runTests(filter = {}) {
        if (this.isTestRunning) {
            this.log('Tests are already running', 'warning');
            return;
        }
        
        try {
            // Clear previous results if requested
            if (!filter.keepResults) {
                this.clearResults();
            }
            
            // Apply node type filter if a node is selected
            if (this.selectedNodeType && !filter.nodeType) {
                filter.nodeType = this.selectedNodeType;
            }
            
            // Run tests
            const stats = await testFramework.runTests(filter);
            
            this.log(`Test run completed: ${stats.passed}/${stats.total} passed`, 
                stats.failed > 0 ? 'warning' : 'success');
            
        } catch (error) {
            this.log(`Test run failed: ${error.message}`, 'error');
        }
    }

    /**
     * Stop running tests
     */
    stopTests() {
        if (this.testRunner) {
            this.testRunner.stopTests();
        }
        
        if (!this.isTestRunning) {
            this.log('No tests are currently running', 'warning');
            return;
        }
        
        testFramework.stopTests();
    }

    /**
     * Clear test results
     */
    clearResults() {
        testFramework.clearResults();
        this.testResults.clear();
        
        if (this.elements.testResults) {
            this.elements.testResults.innerHTML = '<div class="no-results">No test results yet. Run tests to see results here.</div>';
        }
        
        this.updateStats();
        this.log('Test results cleared', 'info');
    }

    /**
     * Export test results
     */
    exportResults(format = 'json', options = {}) {
        try {
            let report;
            
            if (this.reporter) {
                const results = Array.from(this.testResults.values()).map(item => ({
                    test: item.test,
                    result: item.result
                }));
                report = this.reporter.formatResults(results, format, options);
            } else {
                report = testFramework.exportReport(format);
            }
            
            // Create download
            const blob = new Blob([report], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `litegraph-test-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            
            this.log('Test report exported successfully', 'success');
            
        } catch (error) {
            this.log(`Export failed: ${error.message}`, 'error');
        }
    }

    /**
     * Show configuration modal
     */
    showConfigModal() {
        const modal = document.getElementById('config-modal');
        if (modal) {
            modal.style.display = 'block';
            
            // Populate current config values
            const config = testFramework.config;
            
            const fields = {
                'config-timeout': config.timeout,
                'config-stress-iterations': config.stressIterations,
                'config-performance-samples': config.performanceSamples,
                'config-validate-inputs': config.validateInputs,
                'config-validate-outputs': config.validateOutputs,
                'config-validate-properties': config.validateProperties,
                'config-validate-execution': config.validateExecution,
                'config-validate-memory': config.validateMemory
            };
            
            for (const [id, value] of Object.entries(fields)) {
                const element = document.getElementById(id);
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = value;
                    } else {
                        element.value = value;
                    }
                }
            }
        }
    }

    /**
     * Apply configuration changes
     */
    applyConfig() {
        const newConfig = {
            timeout: parseInt(document.getElementById('config-timeout')?.value) || 5000,
            stressIterations: parseInt(document.getElementById('config-stress-iterations')?.value) || 1000,
            performanceSamples: parseInt(document.getElementById('config-performance-samples')?.value) || 100,
            validateInputs: document.getElementById('config-validate-inputs')?.checked ?? true,
            validateOutputs: document.getElementById('config-validate-outputs')?.checked ?? true,
            validateProperties: document.getElementById('config-validate-properties')?.checked ?? true,
            validateExecution: document.getElementById('config-validate-execution')?.checked ?? true,
            validateMemory: document.getElementById('config-validate-memory')?.checked ?? true
        };
        
        testFramework.updateConfig(newConfig);
        
        // Close modal
        const modal = document.getElementById('config-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        this.log('Configuration updated', 'info');
    }

    /**
     * Select a node type
     */
    selectNodeType(nodeType) {
        // Remove previous selection
        const prevSelected = this.elements.nodeList?.querySelector('.node-item.selected');
        if (prevSelected) {
            prevSelected.classList.remove('selected');
        }
        
        // Add new selection
        const nodeItem = this.elements.nodeList?.querySelector(`[data-node-type="${nodeType}"]`);
        if (nodeItem) {
            nodeItem.classList.add('selected');
            this.selectedNodeType = nodeType;
            
            this.log(`Selected node type: ${nodeType}`, 'info');
        }
    }

    /**
     * Create a new node instance
     */
    createNode(nodeType) {
        if (!LiteGraph || !LiteGraph.registered_node_types) {
            throw new Error('LiteGraph not available');
        }
        
        const nodeClass = LiteGraph.registered_node_types[nodeType];
        if (!nodeClass) {
            throw new Error(`Node type not found: ${nodeType}`);
        }
        
        try {
            const node = new nodeClass();
            
            // Add to graph for testing
            this.graph.add(node);
            
            return node;
        } catch (error) {
            throw new Error(`Failed to create node ${nodeType}: ${error.message}`);
        }
    }

    /**
     * Connect two nodes
     */
    connectNodes(nodeA, outputIndex, nodeB, inputIndex) {
        if (!nodeA || !nodeB) {
            throw new Error('Invalid nodes for connection');
        }
        
        try {
            nodeA.connect(outputIndex, nodeB, inputIndex);
            return true;
        } catch (error) {
            throw new Error(`Failed to connect nodes: ${error.message}`);
        }
    }

    /**
     * Execute the graph
     */
    executeGraph() {
        if (!this.graph) {
            throw new Error('Graph not available');
        }
        
        try {
            this.graph.runStep();
            return true;
        } catch (error) {
            throw new Error(`Failed to execute graph: ${error.message}`);
        }
    }

    /**
     * Clear the graph
     */
    clearGraph() {
        if (!this.graph) {
            return;
        }
        
        try {
            this.graph.clear();
        } catch (error) {
            console.error('Failed to clear graph:', error);
        }
    }

    /**
     * Add node to graph for testing
     */
    addNodeToGraph(nodeType) {
        try {
            // Ensure canvas is available
            if (!this.canvas || !this.graph) {
                throw new Error('Canvas or graph not initialized');
            }
            
            // Validate nodeType exists
            if (!LiteGraph.registered_node_types[nodeType]) {
                throw new Error(`Node type '${nodeType}' not found`);
            }
            
            // Create node instance
            const node = LiteGraph.createNode(nodeType);
            if (!node) {
                throw new Error(`Failed to create node: ${nodeType}`);
            }
            
            // Initialize node properties safely
            if (!node.flags) {
                node.flags = {
                    collapsed: false,
                    pinned: false
                };
            }
            
            // Ensure required properties exist
            if (!node.size) {
                node.size = [140, 80];
            }
            
            if (!node.pos) {
                node.pos = [Math.random() * 400 + 100, Math.random() * 300 + 100];
            }
            
            // Initialize node if it has an onAdded method
            if (typeof node.onAdded === 'function') {
                try {
                    node.onAdded(this.graph);
                } catch (initError) {
                    this.log(`Node initialization warning for ${nodeType}: ${initError.message}`, 'warning');
                }
            }
            
            this.graph.add(node);
            
            // Force canvas refresh to prevent breaking
            this.canvas.setDirty(true, true);
            this.canvas.draw(true, true);
            
            this.log(`Added node: ${nodeType}`, 'info');
            
            return node;
            
        } catch (error) {
            this.log(`Failed to add node ${nodeType}: ${error.message}`, 'error');
            
            // Try to recover canvas state
            if (this.canvas) {
                try {
                    this.canvas.setDirty(true, true);
                    this.canvas.draw(true, true);
                } catch (canvasError) {
                    this.log(`Canvas recovery failed: ${canvasError.message}`, 'error');
                }
            }
            
            return null;
        }
    }

    /**
     * Update test result in UI
     */
    updateTestResult(test, result) {
        this.testResults.set(test.id, { test, result });
        
        if (!this.elements.testResults) return;
        
        // Remove "no results" message if present
        const noResults = this.elements.testResults.querySelector('.no-results');
        if (noResults) {
            noResults.remove();
        }
        
        // Create or update result item
        let resultItem = this.elements.testResults.querySelector(`[data-test-id="${test.id}"]`);
        
        if (!resultItem) {
            resultItem = document.createElement('div');
            resultItem.className = 'test-result-item';
            resultItem.dataset.testId = test.id;
            this.elements.testResults.appendChild(resultItem);
        }
        
        // Update content
        resultItem.className = `test-result-item ${result.status}`;
        resultItem.innerHTML = `
            <div class="test-result-header">
                <span class="test-name">${test.name}</span>
                <span class="test-status ${result.status}">${result.status.toUpperCase()}</span>
            </div>
            <div class="test-result-details">
                <span class="test-node-type">${test.nodeType}</span>
                <span class="test-duration">${result.duration.toFixed(2)}ms</span>
                ${result.errors.length > 0 ? `<span class="test-errors">${result.errors.length} errors</span>` : ''}
                ${result.warnings.length > 0 ? `<span class="test-warnings">${result.warnings.length} warnings</span>` : ''}
            </div>
        `;
        
        // Scroll to latest result
        resultItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /**
     * Show detailed test information
     */
    showTestDetails(testId) {
        const testData = this.testResults.get(testId);
        if (!testData) return;
        
        const { test, result } = testData;
        
        // Create details modal or panel
        const details = {
            test: {
                id: test.id,
                name: test.name,
                nodeType: test.nodeType,
                category: test.category,
                description: test.description
            },
            result: {
                status: result.status,
                duration: result.duration,
                errors: result.errors,
                warnings: result.warnings,
                details: result.details,
                memoryUsage: result.memoryUsage
            }
        };
        
        this.log(`Test Details: ${JSON.stringify(details, null, 2)}`, 'info');
        
        // Could implement a proper modal here
        console.log('Test Details:', details);
    }

    /**
     * Update statistics display
     */
    updateStats() {
        const stats = testFramework.getStats();
        
        if (this.elements.statsElements.total) {
            this.elements.statsElements.total.textContent = stats.total;
        }
        
        if (this.elements.statsElements.passed) {
            this.elements.statsElements.passed.textContent = stats.passed;
        }
        
        if (this.elements.statsElements.failed) {
            this.elements.statsElements.failed.textContent = stats.failed;
        }
        
        if (this.elements.statsElements.coverage) {
            this.elements.statsElements.coverage.textContent = `${stats.coverage}%`;
        }
    }

    /**
     * Update control button states
     */
    updateControlButtons() {
        if (this.elements.runButton) {
            this.elements.runButton.disabled = this.isTestRunning;
        }
        
        if (this.elements.stopButton) {
            this.elements.stopButton.disabled = !this.isTestRunning;
        }
    }

    /**
     * Resize canvas to fit container
     */
    resizeCanvas() {
        if (!this.canvas || !this.elements.canvas) return;
        
        const rect = this.elements.canvas.parentElement.getBoundingClientRect();
        
        this.elements.canvas.width = rect.width;
        this.elements.canvas.height = rect.height;
        
        this.canvas.resize();
    }

    /**
     * Log message to console panel
     */
    log(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        if (!this.elements || !this.elements.console) {
            console.warn('Console element not available for logging');
            return;
        }
        
        try {
            const logEntry = document.createElement('div');
            logEntry.className = `console-entry ${type}`;
            
            const timestamp = new Date().toLocaleTimeString();
            
            // Create text content instead of innerHTML to avoid issues
            const timestampSpan = document.createElement('span');
            timestampSpan.className = 'console-timestamp';
            timestampSpan.textContent = `[${timestamp}]`;
            
            const typeSpan = document.createElement('span');
            typeSpan.className = 'console-type';
            typeSpan.textContent = `[${type.toUpperCase()}]`;
            
            const messageSpan = document.createElement('span');
            messageSpan.className = 'console-message';
            messageSpan.textContent = message;
            
            logEntry.appendChild(timestampSpan);
            logEntry.appendChild(typeSpan);
            logEntry.appendChild(messageSpan);
            
            this.elements.console.appendChild(logEntry);
            
            // Auto-scroll to bottom
            this.elements.console.scrollTop = this.elements.console.scrollHeight;
            
            // Limit console entries to prevent memory issues
            const entries = this.elements.console.querySelectorAll('.console-entry');
            if (entries.length > 1000) {
                entries[0].remove();
            }
        } catch (logError) {
            console.error('Error in log method:', logError);
        }
    }

    /**
     * Get available node types
     */
    getAvailableNodeTypes() {
        return this.availableNodeTypes;
    }

    /**
     * Get node information
     */
    getNodeInfo(nodeType) {
        if (!LiteGraph || !LiteGraph.registered_node_types) {
            return null;
        }
        
        const nodeClass = LiteGraph.registered_node_types[nodeType];
        if (!nodeClass) {
            return null;
        }
        
        // Extract node information
        const info = {
            type: nodeType,
            category: this.extractCategory(nodeType),
            description: nodeClass.desc || nodeClass.description || 'No description available',
            inputs: [],
            outputs: [],
            properties: {}
        };
        
        // Get input/output information from prototype or static properties
        if (nodeClass.prototype) {
            const proto = nodeClass.prototype;
            
            // Try to get inputs/outputs from constructor or onConstructor
            if (proto.onNodeCreated || proto.constructor) {
                try {
                    const tempNode = new nodeClass();
                    
                    if (tempNode.inputs) {
                        info.inputs = tempNode.inputs.map(input => ({
                            name: input.name || input,
                            type: input.type || 'any',
                            description: input.description || ''
                        }));
                    }
                    
                    if (tempNode.outputs) {
                        info.outputs = tempNode.outputs.map(output => ({
                            name: output.name || output,
                            type: output.type || 'any',
                            description: output.description || ''
                        }));
                    }
                    
                    if (tempNode.properties) {
                        info.properties = { ...tempNode.properties };
                    }
                } catch (error) {
                    console.warn(`Failed to analyze node ${nodeType}:`, error);
                }
            }
        }
        
        return info;
    }

    /**
     * Extract category from node type
     */
    extractCategory(nodeType) {
        const parts = nodeType.split('/');
        if (parts.length > 1) {
            return parts[0];
        }
        
        // Fallback to common prefixes
        const prefixes = ['Math', 'Logic', 'String', 'Array', 'Object', 'Time', 'File', 'Network', 'UI'];
        for (const prefix of prefixes) {
            if (nodeType.startsWith(prefix)) {
                return prefix;
            }
        }
        
        return 'Other';
    }

    /**
     * Get the graph instance
     */
    getGraph() {
        return this.graph;
    }

    /**
     * Get the canvas instance
     */
    getCanvas() {
        return this.canvas;
    }

    /**
     * Check if tests are running
     */
    isRunning() {
        return this.testRunner ? this.testRunner.isTestsRunning() : false;
    }

    /**
     * Get execution statistics
     */
    getExecutionStats() {
        return this.testRunner ? this.testRunner.getExecutionStats() : null;
    }

    /**
     * Get test results
     */
    getTestResults() {
        return Array.from(this.testResults.values());
    }

    /**
     * Set test results
     */
    setTestResults(results) {
        this.testResults.clear();
        for (const result of results) {
            this.testResults.set(result.test.id, result);
        }
    }

    /**
     * Get test statistics
     */
    getTestStats() {
        const results = Array.from(this.testResults.values());
        const totalTests = results.length;
        const passedTests = results.filter(r => r.result.status === 'passed').length;
        const failedTests = totalTests - passedTests;
        const successRate = totalTests > 0 ? (passedTests / totalTests * 100) : 0;
        
        return {
            total: totalTests,
            passed: passedTests,
            failed: failedTests,
            successRate: successRate
        };
    }

    /**
     * Get current application state
     */
    getState() {
        return {
            selectedNodeType: this.selectedNodeType,
            isTestRunning: this.isTestRunning,
            testResultsCount: this.testResults.size,
            nodeInstancesCount: this.nodeInstances.size,
            availableNodeTypes: this.availableNodeTypes.length,
            stats: testFramework.getStats()
        };
    }

    /**
     * Wait for LiteGraph to be fully loaded
     */
    async waitForLiteGraph() {
        // Since we're using ES6 imports, LiteGraph should be available immediately
        // But let's add a small safety check for initialization
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            if (typeof LiteGraph !== 'undefined') {
                // Check if LiteGraph is properly initialized
                // The LiteGraph class should have these properties after initialization
                if (LiteGraph.registered_node_types && 
                    typeof LiteGraph.registered_node_types === 'object' &&
                    typeof LiteGraph.createNode === 'function' &&
                    typeof LiteGraph.registerNodeType === 'function') {
                    
                    // Additional check: ensure core classes are available
                    if (LiteGraph.LGraph && LiteGraph.LGraphNode) {
                        console.log('LiteGraph fully loaded and initialized');
                        return;
                    }
                }
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        // If we reach here, log more detailed error information
        console.error('LiteGraph loading debug info:', {
            LiteGraphExists: typeof LiteGraph !== 'undefined',
            LGraphExists: typeof LiteGraph !== 'undefined' && !!LiteGraph.LGraph,
            LGraphNodeExists: typeof LiteGraph !== 'undefined' && !!LiteGraph.LGraphNode,
            registeredTypes: typeof LiteGraph !== 'undefined' && LiteGraph.registered_node_types,
            createNodeFunction: typeof LiteGraph !== 'undefined' && typeof LiteGraph.createNode,
            registerNodeTypeFunction: typeof LiteGraph !== 'undefined' && typeof LiteGraph.registerNodeType
        });
        
        throw new Error('LiteGraph failed to load within timeout period');
    }
}

// Initialize app when DOM is ready
let app;

/**
 * Initialize the editor tester when DOM is ready
 */
EditorTesterApp.initialize = async function() {
    try {
        app = new EditorTesterApp();
        await app.init();
    } catch (error) {
        console.error('Failed to initialize EditorTesterApp:', error);
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', EditorTesterApp.initialize);
} else {
    EditorTesterApp.initialize();
}

// Make app available globally for debugging
if (typeof window !== 'undefined') {
    window.EditorTesterApp = EditorTesterApp;
    window.app = app;
}

export { EditorTesterApp };
export default EditorTesterApp;
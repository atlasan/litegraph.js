/**
 * UI Manager
 * Handles all UI interactions and test case management interface
 */

import testConfig from './test-config.js';
import TestReporter from './test-reporter.js';

export class UIManager {
    constructor(app) {
        this.app = app;
        this.elements = {};
        this.modals = {};
        this.reporter = new TestReporter();
        this.currentResults = [];
        this.selectedNodes = new Set();
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupConfigListeners();
        this.updateUI();
    }

    /**
     * Initialize UI elements
     */
    initializeElements() {
        // Main controls
        this.elements.runAllBtn = document.getElementById('runAllBtn');
        this.elements.runSelectedBtn = document.getElementById('runSelectedBtn');
        this.elements.stopBtn = document.getElementById('stopBtn');
        this.elements.configBtn = document.getElementById('configBtn');
        this.elements.exportBtn = document.getElementById('exportBtn');
        this.elements.clearBtn = document.getElementById('clearResultsBtn');
        
        // Stats display - Fix element IDs to match HTML
        this.elements.totalTests = document.getElementById('total-count');
        this.elements.passedTests = document.getElementById('passed-count');
        this.elements.failedTests = document.getElementById('failed-count');
        this.elements.coveragePercent = document.getElementById('coverage-percent');
        this.elements.statTotal = document.getElementById('stat-total');
        this.elements.statPassed = document.getElementById('stat-passed');
        this.elements.statFailed = document.getElementById('stat-failed');
        this.elements.statCoverage = document.getElementById('stat-coverage');
        
        // Progress
        this.elements.progressBar = document.getElementById('progress-bar');
        this.elements.progressText = document.getElementById('progress-text');
        
        // Panels
        this.elements.nodeList = document.getElementById('node-list');
        this.elements.testResults = document.getElementById('test-results');
        this.elements.consoleOutput = document.getElementById('console-output');
        
        // Modals
        this.modals.config = document.getElementById('test-config-modal');
        this.modals.export = document.getElementById('export-modal');
        
        // Search and filters
        this.elements.nodeSearch = document.getElementById('node-filter');
        this.elements.categoryFilter = document.getElementById('category-filter');
        this.elements.statusFilter = document.getElementById('status-filter');
        
        // Global selection controls
        this.elements.selectAllNodes = document.getElementById('select-all-nodes');
        this.elements.deselectAllNodes = document.getElementById('deselect-all-nodes');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Main controls
        this.elements.runAllBtn?.addEventListener('click', () => this.runAllTests());
        this.elements.runSelectedBtn?.addEventListener('click', () => this.runSelectedTests());
        this.elements.stopBtn?.addEventListener('click', () => this.stopTests());
        this.elements.configBtn?.addEventListener('click', () => this.showConfigModal());
        this.elements.exportBtn?.addEventListener('click', () => this.showExportModal());
        this.elements.clearBtn?.addEventListener('click', () => this.clearResults());
        
        // Search and filters
        this.elements.nodeSearch?.addEventListener('input', (e) => this.filterNodes(e.target.value));
        this.elements.categoryFilter?.addEventListener('change', (e) => this.filterByCategory(e.target.value));
        this.elements.statusFilter?.addEventListener('change', (e) => this.filterByStatus(e.target.value));
        
        // Global selection controls
        this.elements.selectAllNodes?.addEventListener('click', () => this.selectAllNodes());
        this.elements.deselectAllNodes?.addEventListener('click', () => this.deselectAllNodes());
        
        // Modal close handlers
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target);
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Window resize
        window.addEventListener('resize', () => this.handleResize());
        
        // Error panel controls
        const closeErrorPanelBtn = document.getElementById('close-error-panel');
        if (closeErrorPanelBtn) {
            closeErrorPanelBtn.addEventListener('click', () => this.hideErrorPanel());
        }
        
        const viewAllErrorsBtn = document.getElementById('view-all-errors');
        if (viewAllErrorsBtn) {
            viewAllErrorsBtn.addEventListener('click', () => this.showErrorsFromResults(this.currentResults));
        }
    }

    /**
     * Setup configuration listeners
     */
    setupConfigListeners() {
        testConfig.on('configChanged', (data) => {
            this.updateUI();
            this.logMessage(`Configuration updated: ${data.path} = ${data.value}`);
        });
        
        testConfig.on('presetLoaded', (data) => {
            this.updateUI();
            this.logMessage(`Preset loaded: ${data.preset.name}`);
        });
    }

    /**
     * Update UI based on current state
     */
    updateUI() {
        this.updateNodeList();
        this.updateStats();
        this.updateControls();
        this.updateFilters();
    }

    /**
     * Update node list display
     */
    updateNodeList() {
        if (!this.elements.nodeList) return;
        
        const nodeTypes = this.app.getAvailableNodeTypes();
        const selectedCriteria = testConfig.getNodeSelectionCriteria();
        
        this.elements.nodeList.innerHTML = '';
        
        // Group nodes by category
        const categories = new Map();
        
        for (const nodeType of nodeTypes) {
            const category = this.extractCategory(nodeType) || 'Other';
            if (!categories.has(category)) {
                categories.set(category, []);
            }
            categories.get(category).push(nodeType);
        }
        
        // Render categories
        for (const [category, nodes] of categories) {
            const categoryElement = this.createCategoryElement(category, nodes, selectedCriteria);
            this.elements.nodeList.appendChild(categoryElement);
        }
        
        this.updateSelectedCount();
    }

    /**
     * Create category element
     */
    createCategoryElement(category, nodes, selectedCriteria) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'node-category';
        
        // Category header
        const header = document.createElement('div');
        header.className = 'category-header';
        header.innerHTML = `
            <div class="category-info">
                <span class="category-name">${category}</span>
                <span class="category-count">${nodes.length} nodes</span>
            </div>
            <div class="category-controls">
                <button class="btn-small select-all" data-category="${category}">Select All</button>
                <button class="btn-small deselect-all" data-category="${category}">Deselect All</button>
                <button class="btn-small toggle-category" data-category="${category}">▼</button>
            </div>
        `;
        
        // Category controls
        header.querySelector('.select-all').addEventListener('click', () => {
            this.selectCategoryNodes(category, true);
        });
        
        header.querySelector('.deselect-all').addEventListener('click', () => {
            this.selectCategoryNodes(category, false);
        });
        
        header.querySelector('.toggle-category').addEventListener('click', (e) => {
            this.toggleCategory(category, e.target);
        });
        
        categoryDiv.appendChild(header);
        
        // Node list
        const nodeListDiv = document.createElement('div');
        nodeListDiv.className = 'category-nodes';
        
        for (const nodeType of nodes.sort()) {
            const nodeElement = this.createNodeElement(nodeType, selectedCriteria);
            nodeListDiv.appendChild(nodeElement);
        }
        
        categoryDiv.appendChild(nodeListDiv);
        
        return categoryDiv;
    }

    /**
     * Create node element
     */
    createNodeElement(nodeType, selectedCriteria) {
        const isSelected = selectedCriteria.selectedNodes.includes(nodeType) || 
                          this.selectedNodes.has(nodeType);
        const isExcluded = selectedCriteria.excludedNodes.includes(nodeType);
        
        const nodeDiv = document.createElement('div');
        nodeDiv.className = `node-item ${isSelected ? 'selected' : ''} ${isExcluded ? 'excluded' : ''}`;
        nodeDiv.dataset.nodeType = nodeType;
        
        nodeDiv.innerHTML = `
            <div class="node-checkbox">
                <input type="checkbox" id="node_${nodeType}" ${isSelected ? 'checked' : ''} ${isExcluded ? 'disabled' : ''}>
            </div>
            <div class="node-info">
                <div class="node-name">${nodeType}</div>
                <div class="node-status"></div>
            </div>
            <div class="node-controls">
                <button class="btn-small test-single" data-node="${nodeType}" title="Test this node">Test</button>
                <button class="btn-small node-info-btn" data-node="${nodeType}" title="Node information">Info</button>
            </div>
        `;
        
        // Event listeners
        const checkbox = nodeDiv.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', (e) => {
            this.toggleNodeSelection(nodeType, e.target.checked);
        });
        
        // Add debouncing to prevent double-clicks
        let testClickTimeout = null;
        nodeDiv.querySelector('.test-single').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (testClickTimeout) {
                clearTimeout(testClickTimeout);
            }
            
            testClickTimeout = setTimeout(() => {
                this.runSingleNodeTest(nodeType);
                testClickTimeout = null;
            }, 300); // 300ms debounce
        });
        
        let infoClickTimeout = null;
        nodeDiv.querySelector('.node-info-btn').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (infoClickTimeout) {
                clearTimeout(infoClickTimeout);
            }
            
            infoClickTimeout = setTimeout(() => {
                this.showNodeInfo(nodeType);
                infoClickTimeout = null;
            }, 300); // 300ms debounce
        });
        
        return nodeDiv;
    }

    /**
     * Update statistics display
     */
    updateStats() {
        console.log('[UIManager] updateStats called, currentResults:', this.currentResults);
        const stats = this.calculateStats(this.currentResults);
        
        console.log('[UIManager] Updating DOM elements with stats:', stats);
        
        // Update header stats
        if (this.elements.totalTests) {
            console.log('[UIManager] Updating totalTests element');
            this.elements.totalTests.textContent = stats.total;
        } else {
            console.warn('[UIManager] totalTests element not found');
        }
        if (this.elements.passedTests) {
            console.log('[UIManager] Updating passedTests element');
            this.elements.passedTests.textContent = stats.passed;
        } else {
            console.warn('[UIManager] passedTests element not found');
        }
        if (this.elements.failedTests) {
            console.log('[UIManager] Updating failedTests element');
            this.elements.failedTests.textContent = stats.failed;
        } else {
            console.warn('[UIManager] failedTests element not found');
        }
        if (this.elements.coveragePercent) {
            console.log('[UIManager] Updating coveragePercent element');
            this.elements.coveragePercent.textContent = `${stats.coverage}%`;
        } else {
            console.warn('[UIManager] coveragePercent element not found');
        }
        
        // Update right panel stats
        if (this.elements.statTotal) {
            console.log('[UIManager] Updating statTotal element');
            this.elements.statTotal.textContent = stats.total;
        } else {
            console.warn('[UIManager] statTotal element not found');
        }
        if (this.elements.statPassed) {
            console.log('[UIManager] Updating statPassed element');
            this.elements.statPassed.textContent = stats.passed;
        } else {
            console.warn('[UIManager] statPassed element not found');
        }
        if (this.elements.statFailed) {
            console.log('[UIManager] Updating statFailed element');
            this.elements.statFailed.textContent = stats.failed;
        } else {
            console.warn('[UIManager] statFailed element not found');
        }
        if (this.elements.statCoverage) {
            console.log('[UIManager] Updating statCoverage element');
            this.elements.statCoverage.textContent = `${stats.coverage}%`;
        } else {
            console.warn('[UIManager] statCoverage element not found');
        }
        
        // Update progress bar
        if (this.elements.progressBar) {
            const progress = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;
            console.log('[UIManager] Updating progress bar:', progress + '%');
            this.elements.progressBar.style.width = `${progress}%`;
        } else {
            console.warn('[UIManager] progressBar element not found');
        }
        
        // Update error controls
        const viewAllErrorsBtn = document.getElementById('view-all-errors');
        const errorCountSpan = document.getElementById('error-count');
        if (viewAllErrorsBtn && errorCountSpan) {
            if (stats.failed > 0) {
                viewAllErrorsBtn.classList.remove('hidden');
                errorCountSpan.textContent = stats.failed;
            } else {
                viewAllErrorsBtn.classList.add('hidden');
            }
        }
    }

    /**
     * Update control states
     */
    updateControls() {
        const isRunning = this.app.isRunning();
        const hasSelection = this.selectedNodes.size > 0;
        const hasResults = this.currentResults.length > 0;
        
        // Enhanced button states with loading animations
        if (this.elements.runAllBtn) {
            this.elements.runAllBtn.disabled = isRunning;
            this.toggleButtonLoading(this.elements.runAllBtn, isRunning && !hasSelection, '▶ Run All Tests');
        }
        
        if (this.elements.runSelectedBtn) {
            this.elements.runSelectedBtn.disabled = isRunning || !hasSelection;
            this.toggleButtonLoading(this.elements.runSelectedBtn, isRunning && hasSelection, `▶ Run Selected (${this.selectedNodes.size})`);
        }
        
        if (this.elements.stopBtn) {
            this.elements.stopBtn.disabled = !isRunning;
            if (isRunning) {
                this.elements.stopBtn.classList.add('btn-danger-active');
            } else {
                this.elements.stopBtn.classList.remove('btn-danger-active');
            }
        }
        
        if (this.elements.exportBtn) {
            this.elements.exportBtn.disabled = !hasResults;
        }
        
        if (this.elements.clearBtn) {
            this.elements.clearBtn.disabled = !hasResults;
        }
        
        // Update UI state classes for global styling
        document.body.classList.toggle('tests-running', isRunning);
    }
    
    /**
     * Toggle button loading state with enhanced visual feedback
     */
    toggleButtonLoading(button, isLoading, defaultText) {
        if (!button) return;
        
        if (isLoading) {
            button.classList.add('btn-loading');
            if (!button.dataset.originalText) {
                button.dataset.originalText = button.textContent;
            }
            button.innerHTML = '<span class="spinner"></span> Running...';
        } else {
            button.classList.remove('btn-loading');
            if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
                delete button.dataset.originalText;
            } else if (defaultText) {
                button.textContent = defaultText;
            }
        }
    }

    /**
     * Update filter options
     */
    updateFilters() {
        if (this.elements.categoryFilter) {
            const categories = this.getAvailableCategories();
            this.elements.categoryFilter.innerHTML = '<option value="">All Categories</option>';
            
            for (const category of categories) {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                this.elements.categoryFilter.appendChild(option);
            }
        }
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        try {
            this.logMessage('Starting all tests...');
            this.updateProgress(0, 'Initializing...');
            
            // Clear previous results
            this.currentResults = [];
            this.updateStats();
            this.displayResults([]);
            
            // Get all available node types
            const allNodeTypes = this.app.getAvailableNodeTypes();
            this.logMessage(`Found ${allNodeTypes.length} node types to test`);
            
            if (allNodeTypes.length === 0) {
                this.logWarning('No node types available for testing');
                return;
            }
            
            const results = await this.app.runTestsForNodeTypes(allNodeTypes, (progress, message) => {
                this.updateProgress(progress, message);
            });
            
            this.handleTestResults(results);
            this.logMessage(`All tests completed. ${results.length} tests executed.`);
        } catch (error) {
            this.logError('Failed to run all tests:', error);
        }
    }

    /**
     * Run selected tests
     */
    async runSelectedTests() {
        try {
            const selectedNodes = Array.from(this.selectedNodes);
            this.logMessage('DEBUG: selectedNodes Set:', this.selectedNodes);
            this.logMessage('DEBUG: selectedNodes Array:', selectedNodes);
            
            if (selectedNodes.length === 0) {
                this.logWarning('No nodes selected for testing.');
                return;
            }
            
            this.logMessage(`Starting tests for ${selectedNodes.length} selected nodes...`);
            this.updateProgress(0, 'Initializing...');
            
            // Clear previous results
            this.currentResults = [];
            this.updateStats();
            this.displayResults([]);
            
            const results = await this.app.runTestsForNodeTypes(selectedNodes, (progress, message) => {
                this.updateProgress(progress, message);
            });
            
            this.handleTestResults(results);
            this.logMessage(`Selected tests completed. ${results.length} tests executed.`);
        } catch (error) {
            this.logError('Failed to run selected tests:', error);
        }
    }

    /**
     * Stop running tests
     */
    stopTests() {
        this.app.stopTests();
        this.logMessage('Test execution stopped by user.');
        this.updateProgress(0, 'Stopped');
    }

    /**
     * Run single node test
     */
    async runSingleNodeTest(nodeType) {
        try {
            this.logMessage(`Testing node: ${nodeType}`);
            
            // Clear previous results
            this.currentResults = [];
            this.updateStats();
            this.displayResults([]);
            
            // Validate node type exists
            const availableTypes = this.app.getAvailableNodeTypes();
            if (!availableTypes.includes(nodeType)) {
                this.logError(`Node type '${nodeType}' is not available`);
                return;
            }
            
            // Run test for single node type using the new method
            const results = await this.app.runTestsForNodeTypes([nodeType]);
            this.handleTestResults(results);
            
            this.logMessage(`Node test completed: ${nodeType}`);
        } catch (error) {
            this.logError(`Failed to test node ${nodeType}:`, error);
        }
    }

    /**
     * Handle test results
     */
    handleTestResults(results, append = false) {
        console.log('[UIManager] handleTestResults called with:', results, 'append:', append);
        
        if (!append) {
            this.currentResults = results || [];
        } else {
            this.currentResults = [...(this.currentResults || []), ...(results || [])];
        }
        
        console.log('[UIManager] Updated currentResults:', this.currentResults);
        
        this.displayResults(this.currentResults);
        this.updateStats();
        this.updateControls();
        this.updateNodeStatuses(this.currentResults);
    }

    /**
     * Update test results (called by test runner)
     */
    updateTestResults(results) {
        console.log('[UIManager] updateTestResults called with:', results);
        this.handleTestResults(results, false);
    }

    /**
     * Display test results
     */
    displayResults(results) {
        if (!this.elements.testResults) return;
        
        this.elements.testResults.innerHTML = '';
        
        if (results.length === 0) {
            this.elements.testResults.innerHTML = '<div class="no-results">No test results to display</div>';
            return;
        }
        
        // Group results by node type
        const groupedResults = new Map();
        for (const result of results) {
            if (!groupedResults.has(result.nodeType)) {
                groupedResults.set(result.nodeType, []);
            }
            groupedResults.get(result.nodeType).push(result);
        }
        
        // Display grouped results
        for (const [nodeType, nodeResults] of groupedResults) {
            const groupElement = this.createResultGroup(nodeType, nodeResults);
            this.elements.testResults.appendChild(groupElement);
        }
        
        // Show error panel if there are failed tests
        this.showErrorsFromResults(results);
    }

    /**
     * Create result group element
     */
    createResultGroup(nodeType, results) {
        const stats = this.calculateStats(results);
        const hasFailures = stats.failed > 0;
        
        const groupDiv = document.createElement('div');
        groupDiv.className = `result-group ${hasFailures ? 'has-failures' : 'all-passed'}`;
        
        // Group header
        const header = document.createElement('div');
        header.className = 'result-group-header';
        header.innerHTML = `
            <div class="group-info">
                <span class="node-type">${nodeType}</span>
                <span class="group-stats">
                    <span class="passed">${stats.passed}</span> / 
                    <span class="total">${stats.total}</span> passed
                </span>
            </div>
            <div class="group-controls">
                <span class="execution-time">${stats.totalDuration.toFixed(1)}ms</span>
                ${hasFailures ? `<button class="btn-small btn-error view-errors" data-node="${nodeType}">View Errors</button>` : ''}
                <button class="btn-small toggle-group" data-node="${nodeType}">▼</button>
            </div>
        `;
        
        header.querySelector('.toggle-group').addEventListener('click', (e) => {
            this.toggleResultGroup(nodeType, e.target);
        });
        
        // Add event listener for view errors button if it exists
        const viewErrorsBtn = header.querySelector('.view-errors');
        if (viewErrorsBtn) {
            viewErrorsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showErrorsFromResults(results);
            });
        }
        
        groupDiv.appendChild(header);
        
        // Results list
        const resultsDiv = document.createElement('div');
        resultsDiv.className = 'group-results';
        
        for (const result of results) {
            const resultElement = this.createResultElement(result);
            resultsDiv.appendChild(resultElement);
        }
        
        groupDiv.appendChild(resultsDiv);
        
        return groupDiv;
    }

    /**
     * Create result element
     */
    createResultElement(result) {
        const resultDiv = document.createElement('div');
        resultDiv.className = `test-result ${result.status}`;
        
        const statusIcon = result.status === 'passed' ? '✓' : '✗';
        const statusClass = result.status === 'passed' ? 'success' : 'error';
        
        resultDiv.innerHTML = `
            <div class="result-header">
                <span class="status-icon ${statusClass}">${statusIcon}</span>
                <span class="test-name">${result.testId}</span>
                <span class="execution-time">${result.duration.toFixed(2)}ms</span>
            </div>
            <div class="result-details" style="display: none;">
                ${result.errors.length > 0 ? `
                    <div class="errors">
                        <h4>Errors:</h4>
                        ${result.errors.map(error => `
                            <div class="error-item">
                                <strong>${error.type || 'Error'}:</strong> ${error.message}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                ${result.warnings.length > 0 ? `
                    <div class="warnings">
                        <h4>Warnings:</h4>
                        ${result.warnings.map(warning => `
                            <div class="warning-item">${warning}</div>
                        `).join('')}
                    </div>
                ` : ''}
                ${result.memoryUsage ? `
                    <div class="memory-info">
                        <strong>Memory Usage:</strong> ${(result.memoryUsage.delta / 1024).toFixed(1)}KB
                    </div>
                ` : ''}
            </div>
        `;
        
        // Toggle details on click
        resultDiv.querySelector('.result-header').addEventListener('click', () => {
            const details = resultDiv.querySelector('.result-details');
            const isVisible = details.style.display !== 'none';
            details.style.display = isVisible ? 'none' : 'block';
        });
        
        return resultDiv;
    }

    /**
     * Update node statuses based on test results
     */
    updateNodeStatuses(results) {
        // Group results by node type
        const nodeStatuses = new Map();
        
        for (const result of results) {
            if (!nodeStatuses.has(result.nodeType)) {
                nodeStatuses.set(result.nodeType, { passed: 0, failed: 0, total: 0 });
            }
            
            const status = nodeStatuses.get(result.nodeType);
            status.total++;
            
            if (result.status === 'passed') {
                status.passed++;
            } else {
                status.failed++;
            }
        }
        
        // Update UI
        for (const [nodeType, status] of nodeStatuses) {
            const nodeElement = document.querySelector(`[data-node-type="${nodeType}"]`);
            if (nodeElement) {
                const statusElement = nodeElement.querySelector('.node-status');
                if (statusElement) {
                    const successRate = status.total > 0 ? (status.passed / status.total * 100).toFixed(0) : 0;
                    statusElement.textContent = `${status.passed}/${status.total} (${successRate}%)`;
                    statusElement.className = `node-status ${status.failed > 0 ? 'has-failures' : 'all-passed'}`;
                }
            }
        }
    }

    /**
     * Show configuration modal
     */
    showConfigModal() {
        if (!this.modals.config) return;
        
        this.populateConfigModal();
        this.modals.config.style.display = 'flex';
    }

    /**
     * Populate configuration modal
     */
    populateConfigModal() {
        const modalContent = this.modals.config.querySelector('.modal-content');
        if (!modalContent) return;
        
        const config = testConfig.get();
        const schema = testConfig.getSchema();
        
        modalContent.innerHTML = `
            <div class="modal-header">
                <h2>Test Configuration</h2>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="config-tabs">
                    ${Object.keys(schema).map(section => `
                        <button class="config-tab" data-section="${section}">${schema[section].title}</button>
                    `).join('')}
                </div>
                <div class="config-content">
                    ${Object.entries(schema).map(([section, sectionSchema]) => `
                        <div class="config-section" data-section="${section}" style="display: none;">
                            <h3>${sectionSchema.title}</h3>
                            <p class="section-description">${sectionSchema.description}</p>
                            ${this.generateConfigFields(section, sectionSchema.properties, config[section])}
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" id="resetConfig">Reset to Defaults</button>
                <button class="btn btn-secondary" id="loadPreset">Load Preset</button>
                <button class="btn btn-secondary" id="savePreset">Save Preset</button>
                <button class="btn btn-primary" id="saveConfig">Save Configuration</button>
            </div>
        `;
        
        this.setupConfigModalEvents();
        
        // Show first tab
        const firstTab = modalContent.querySelector('.config-tab');
        if (firstTab) {
            firstTab.click();
        }
    }

    /**
     * Generate configuration fields
     */
    generateConfigFields(section, properties, values) {
        return Object.entries(properties).map(([key, prop]) => {
            const value = values[key];
            const fieldId = `${section}_${key}`;
            
            switch (prop.type) {
                case 'boolean':
                    return `
                        <div class="config-field">
                            <label for="${fieldId}">
                                <input type="checkbox" id="${fieldId}" ${value ? 'checked' : ''}>
                                ${prop.title}
                            </label>
                            <p class="field-description">${prop.description}</p>
                        </div>
                    `;
                
                case 'number':
                    return `
                        <div class="config-field">
                            <label for="${fieldId}">${prop.title}</label>
                            <input type="number" id="${fieldId}" value="${value}" 
                                   min="${prop.min || ''}" max="${prop.max || ''}" step="${prop.step || 1}">
                            <p class="field-description">${prop.description}</p>
                        </div>
                    `;
                
                case 'select':
                    return `
                        <div class="config-field">
                            <label for="${fieldId}">${prop.title}</label>
                            <select id="${fieldId}">
                                ${prop.options.map(option => `
                                    <option value="${option.value}" ${value === option.value ? 'selected' : ''}>
                                        ${option.label}
                                    </option>
                                `).join('')}
                            </select>
                            <p class="field-description">${prop.description}</p>
                        </div>
                    `;
                
                default:
                    return `
                        <div class="config-field">
                            <label for="${fieldId}">${prop.title}</label>
                            <input type="text" id="${fieldId}" value="${value}">
                            <p class="field-description">${prop.description}</p>
                        </div>
                    `;
            }
        }).join('');
    }

    /**
     * Setup configuration modal events
     */
    setupConfigModalEvents() {
        const modal = this.modals.config;
        
        // Tab switching
        modal.querySelectorAll('.config-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const section = e.target.dataset.section;
                this.showConfigSection(section);
            });
        });
        
        // Close modal
        modal.querySelector('.close-modal').addEventListener('click', () => {
            this.closeModal(modal);
        });
        
        // Save configuration
        modal.querySelector('#saveConfig').addEventListener('click', () => {
            this.saveConfiguration();
        });
        
        // Reset configuration
        modal.querySelector('#resetConfig').addEventListener('click', () => {
            if (confirm('Reset all configuration to defaults?')) {
                testConfig.reset();
                this.populateConfigModal();
                this.logMessage('Configuration reset to defaults.');
            }
        });
    }

    /**
     * Show configuration section
     */
    showConfigSection(section) {
        const modal = this.modals.config;
        
        // Update tabs
        modal.querySelectorAll('.config-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.section === section);
        });
        
        // Update sections
        modal.querySelectorAll('.config-section').forEach(sectionEl => {
            sectionEl.style.display = sectionEl.dataset.section === section ? 'block' : 'none';
        });
    }

    /**
     * Save configuration from modal
     */
    saveConfiguration() {
        const modal = this.modals.config;
        const updates = {};
        
        // Collect all form values
        modal.querySelectorAll('input, select').forEach(input => {
            const [section, key] = input.id.split('_');
            const path = `${section}.${key}`;
            
            let value;
            if (input.type === 'checkbox') {
                value = input.checked;
            } else if (input.type === 'number') {
                value = parseFloat(input.value);
            } else {
                value = input.value;
            }
            
            updates[path] = value;
        });
        
        // Update configuration
        testConfig.update(updates);
        
        this.closeModal(modal);
        this.logMessage('Configuration saved successfully.');
    }

    /**
     * Show export modal
     */
    showExportModal() {
        if (!this.modals.export || this.currentResults.length === 0) return;
        
        this.populateExportModal();
        this.modals.export.style.display = 'flex';
    }

    /**
     * Populate export modal
     */
    populateExportModal() {
        const modalContent = this.modals.export.querySelector('.modal-content');
        if (!modalContent) return;
        
        const formatters = this.reporter.getAvailableFormatters();
        
        modalContent.innerHTML = `
            <div class="modal-header">
                <h2>Export Test Results</h2>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="export-options">
                    <div class="config-field">
                        <label for="exportFormat">Export Format</label>
                        <select id="exportFormat">
                            ${formatters.map(formatter => `
                                <option value="${formatter.key}">${formatter.name}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="config-field">
                        <label>
                            <input type="checkbox" id="includeDetails" checked>
                            Include detailed information
                        </label>
                    </div>
                    <div class="config-field">
                        <label>
                            <input type="checkbox" id="includeCharts" checked>
                            Include charts (HTML format only)
                        </label>
                    </div>
                    <div class="config-field">
                        <label for="exportTheme">Theme (HTML format only)</label>
                        <select id="exportTheme">
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                        </select>
                    </div>
                </div>
                <div class="export-preview">
                    <h3>Preview</h3>
                    <div id="exportPreview" class="preview-content"></div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" id="previewExport">Preview</button>
                <button class="btn btn-primary" id="downloadExport">Download</button>
                <button class="btn btn-secondary" id="copyExport">Copy to Clipboard</button>
            </div>
        `;
        
        this.setupExportModalEvents();
    }

    /**
     * Setup export modal events
     */
    setupExportModalEvents() {
        const modal = this.modals.export;
        
        // Close modal
        modal.querySelector('.close-modal').addEventListener('click', () => {
            this.closeModal(modal);
        });
        
        // Preview export
        modal.querySelector('#previewExport').addEventListener('click', () => {
            this.previewExport();
        });
        
        // Download export
        modal.querySelector('#downloadExport').addEventListener('click', () => {
            this.downloadExport();
        });
        
        // Copy to clipboard
        modal.querySelector('#copyExport').addEventListener('click', () => {
            this.copyExportToClipboard();
        });
    }

    /**
     * Preview export
     */
    previewExport() {
        const modal = this.modals.export;
        const format = modal.querySelector('#exportFormat').value;
        const includeDetails = modal.querySelector('#includeDetails').checked;
        const includeCharts = modal.querySelector('#includeCharts').checked;
        const theme = modal.querySelector('#exportTheme').value;
        
        const options = {
            includeDetails,
            includeCharts,
            theme
        };
        
        try {
            const exportData = this.reporter.formatResults(this.currentResults, format, options);
            const previewElement = modal.querySelector('#exportPreview');
            
            if (format === 'html') {
                previewElement.innerHTML = `<iframe srcdoc="${exportData.replace(/"/g, '&quot;')}" style="width: 100%; height: 300px; border: 1px solid #ccc;"></iframe>`;
            } else {
                previewElement.innerHTML = `<pre><code>${this.escapeHtml(exportData.substring(0, 1000))}${exportData.length > 1000 ? '...' : ''}</code></pre>`;
            }
        } catch (error) {
            this.logError('Failed to preview export:', error);
        }
    }

    /**
     * Download export
     */
    downloadExport() {
        const modal = this.modals.export;
        const format = modal.querySelector('#exportFormat').value;
        const includeDetails = modal.querySelector('#includeDetails').checked;
        const includeCharts = modal.querySelector('#includeCharts').checked;
        const theme = modal.querySelector('#exportTheme').value;
        
        const options = {
            includeDetails,
            includeCharts,
            theme
        };
        
        try {
            const exportData = this.reporter.formatResults(this.currentResults, format, options);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `litegraph-test-results-${timestamp}.${this.getFileExtension(format)}`;
            
            this.downloadFile(exportData, filename, this.getMimeType(format));
            this.logMessage(`Test results exported as ${filename}`);
        } catch (error) {
            this.logError('Failed to download export:', error);
        }
    }

    /**
     * Copy export to clipboard
     */
    async copyExportToClipboard() {
        const modal = this.modals.export;
        const format = modal.querySelector('#exportFormat').value;
        const includeDetails = modal.querySelector('#includeDetails').checked;
        const includeCharts = modal.querySelector('#includeCharts').checked;
        const theme = modal.querySelector('#exportTheme').value;
        
        const options = {
            includeDetails,
            includeCharts,
            theme
        };
        
        try {
            const exportData = this.reporter.formatResults(this.currentResults, format, options);
            await navigator.clipboard.writeText(exportData);
            this.logMessage('Test results copied to clipboard.');
        } catch (error) {
            this.logError('Failed to copy to clipboard:', error);
        }
    }

    /**
     * Clear all results
     */
    clearResults() {
        console.log('[UIManager] clearResults called, current results length:', this.currentResults.length);
        
        if (this.currentResults.length === 0) {
            console.log('[UIManager] No results to clear');
            return;
        }
        
        if (confirm('Clear all test results?')) {
            console.log('[UIManager] User confirmed clear, clearing results');
            this.currentResults = [];
            this.displayResults([]);
            this.updateStats();
            this.updateControls();
            this.logMessage('Test results cleared.');
        } else {
            console.log('[UIManager] User cancelled clear');
        }
    }

    /**
     * Toggle node selection
     */
    toggleNodeSelection(nodeType, selected) {
        this.logMessage('DEBUG: toggleNodeSelection called with:', nodeType, selected);
        
        if (selected) {
            this.selectedNodes.add(nodeType);
        } else {
            this.selectedNodes.delete(nodeType);
        }
        
        this.logMessage('DEBUG: selectedNodes after toggle:', this.selectedNodes);
        
        // Update UI - find the node element and update its visual state
        const nodeElement = document.querySelector(`[data-node-type="${nodeType}"]`);
        if (nodeElement) {
            nodeElement.classList.toggle('selected', selected);
            const checkbox = nodeElement.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.checked = selected;
            }
        }
        
        this.updateSelectedCount();
        this.updateControls();
    }

    /**
     * Select/deselect category nodes
     */
    selectCategoryNodes(category, selected) {
        const categoryElement = document.querySelector(`[data-category="${category}"]`).closest('.node-category');
        const checkboxes = categoryElement.querySelectorAll('input[type="checkbox"]');
        
        checkboxes.forEach(checkbox => {
            if (!checkbox.disabled) {
                checkbox.checked = selected;
                const nodeType = checkbox.id.replace('node_', '');
                this.toggleNodeSelection(nodeType, selected);
            }
        });
    }

    /**
     * Update selected node count
     */
    updateSelectedCount() {
        const count = this.selectedNodes.size;
        const countElement = document.getElementById('selectedCount');
        if (countElement) {
            countElement.textContent = count;
        }
    }

    /**
     * Select all nodes globally
     */
    selectAllNodes() {
        const nodeTypes = this.app.getAvailableNodeTypes();
        nodeTypes.forEach(nodeType => {
            this.selectedNodes.add(nodeType);
        });
        
        // Update checkboxes in UI
        const checkboxes = document.querySelectorAll('#node-list input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            if (!checkbox.disabled) {
                checkbox.checked = true;
            }
        });
        
        // Update test config
        testConfig.set('nodeSelection.selectedNodes', Array.from(this.selectedNodes));
        
        this.updateSelectedCount();
        this.logMessage(`Selected all ${nodeTypes.length} nodes`);
    }

    /**
     * Deselect all nodes globally
     */
    deselectAllNodes() {
        this.selectedNodes.clear();
        
        // Update checkboxes in UI
        const checkboxes = document.querySelectorAll('#node-list input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Update test config
        testConfig.set('nodeSelection.selectedNodes', []);
        
        this.updateSelectedCount();
        this.logMessage('Deselected all nodes');
    }

    /**
     * Filter nodes by search term
     */
    filterNodes(searchTerm) {
        const nodeItems = document.querySelectorAll('.node-item');
        const term = searchTerm.toLowerCase();
        
        nodeItems.forEach(item => {
            const nodeType = item.dataset.nodeType.toLowerCase();
            const matches = nodeType.includes(term);
            item.style.display = matches ? 'flex' : 'none';
        });
        
        this.updateCategoryVisibility();
    }

    /**
     * Filter by category
     */
    filterByCategory(category) {
        const categories = document.querySelectorAll('.node-category');
        
        categories.forEach(categoryEl => {
            const categoryName = categoryEl.querySelector('.category-name').textContent;
            const matches = !category || categoryName === category;
            categoryEl.style.display = matches ? 'block' : 'none';
        });
    }

    /**
     * Filter by status
     */
    filterByStatus(status) {
        const resultGroups = document.querySelectorAll('.result-group');
        
        resultGroups.forEach(group => {
            let matches = true;
            
            if (status === 'passed') {
                matches = group.classList.contains('all-passed');
            } else if (status === 'failed') {
                matches = group.classList.contains('has-failures');
            }
            
            group.style.display = matches ? 'block' : 'none';
        });
    }

    /**
     * Update category visibility based on node visibility
     */
    updateCategoryVisibility() {
        const categories = document.querySelectorAll('.node-category');
        
        categories.forEach(category => {
            const visibleNodes = category.querySelectorAll('.node-item[style*="flex"], .node-item:not([style*="none"])');
            category.style.display = visibleNodes.length > 0 ? 'block' : 'none';
        });
    }

    /**
     * Toggle category expansion
     */
    toggleCategory(category, button) {
        const categoryElement = button.closest('.node-category');
        const nodesElement = categoryElement.querySelector('.category-nodes');
        const isExpanded = nodesElement.style.display !== 'none';
        
        nodesElement.style.display = isExpanded ? 'none' : 'block';
        button.textContent = isExpanded ? '▶' : '▼';
    }

    /**
     * Toggle result group expansion
     */
    toggleResultGroup(nodeType, button) {
        const groupElement = button.closest('.result-group');
        const resultsElement = groupElement.querySelector('.group-results');
        const isExpanded = resultsElement.style.display !== 'none';
        
        resultsElement.style.display = isExpanded ? 'none' : 'block';
        button.textContent = isExpanded ? '▶' : '▼';
    }

    /**
     * Show node information
     */
    showNodeInfo(nodeType) {
        const nodeInfo = this.app.getNodeInfo(nodeType);
        if (!nodeInfo) {
            this.logWarning(`No information available for node: ${nodeType}`);
            return;
        }
        
        // Create info modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Node Information: ${nodeType}</h2>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="node-info-content">
                        ${this.formatNodeInfo(nodeInfo)}
                    </div>
                </div>
            </div>
        `;
        
        modal.querySelector('.close-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
        
        document.body.appendChild(modal);
        modal.style.display = 'flex';
    }

    /**
     * Format node information for display
     */
    formatNodeInfo(nodeInfo) {
        return `
            <div class="info-section">
                <h3>Basic Information</h3>
                <p><strong>Type:</strong> ${nodeInfo.type || 'Unknown'}</p>
                <p><strong>Category:</strong> ${nodeInfo.category || 'Other'}</p>
                <p><strong>Description:</strong> ${nodeInfo.description || 'No description available'}</p>
            </div>
            
            ${nodeInfo.inputs && nodeInfo.inputs.length > 0 ? `
            <div class="info-section">
                <h3>Inputs</h3>
                <ul>
                    ${nodeInfo.inputs.map(input => `
                        <li><strong>${input.name}</strong> (${input.type}) - ${input.description || 'No description'}</li>
                    `).join('')}
                </ul>
            </div>
            ` : ''}
            
            ${nodeInfo.outputs && nodeInfo.outputs.length > 0 ? `
            <div class="info-section">
                <h3>Outputs</h3>
                <ul>
                    ${nodeInfo.outputs.map(output => `
                        <li><strong>${output.name}</strong> (${output.type}) - ${output.description || 'No description'}</li>
                    `).join('')}
                </ul>
            </div>
            ` : ''}
            
            ${nodeInfo.properties && Object.keys(nodeInfo.properties).length > 0 ? `
            <div class="info-section">
                <h3>Properties</h3>
                <ul>
                    ${Object.entries(nodeInfo.properties).map(([key, prop]) => `
                        <li><strong>${key}</strong> (${prop.type}) - ${prop.description || 'No description'}</li>
                    `).join('')}
                </ul>
            </div>
            ` : ''}
        `;
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'r':
                    e.preventDefault();
                    if (this.selectedNodes.size > 0) {
                        this.runSelectedTests();
                    } else {
                        this.runAllTests();
                    }
                    break;
                
                case 's':
                    e.preventDefault();
                    this.stopTests();
                    break;
                
                case 'e':
                    e.preventDefault();
                    if (this.currentResults.length > 0) {
                        this.showExportModal();
                    }
                    break;
                
                case 'k':
                    e.preventDefault();
                    this.clearResults();
                    break;
            }
        }
        
        if (e.key === 'Escape') {
            // Close any open modals
            const openModals = document.querySelectorAll('.modal[style*="flex"]');
            openModals.forEach(modal => this.closeModal(modal));
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        // Adjust layout if needed
        this.updateLayout();
    }

    /**
     * Update layout
     */
    updateLayout() {
        // Responsive layout adjustments
        const container = document.querySelector('.container');
        if (!container) return;
        
        const width = window.innerWidth;
        
        if (width < 768) {
            container.classList.add('mobile-layout');
        } else {
            container.classList.remove('mobile-layout');
        }
    }

    /**
     * Update progress display with enhanced visual feedback
     */
    updateProgress(progress, message) {
        if (this.elements.progressBar) {
            // Smooth animation for progress bar
            this.elements.progressBar.style.transition = 'width 0.3s ease-out';
            this.elements.progressBar.style.width = `${progress}%`;
            
            // Add visual states based on progress
            this.elements.progressBar.className = 'progress-bar';
            if (progress < 30) {
                this.elements.progressBar.classList.add('progress-starting');
            } else if (progress < 70) {
                this.elements.progressBar.classList.add('progress-active');
            } else if (progress < 100) {
                this.elements.progressBar.classList.add('progress-finishing');
            } else {
                this.elements.progressBar.classList.add('progress-complete');
            }
        }
        
        if (this.elements.progressText) {
            this.elements.progressText.textContent = message || `${progress.toFixed(1)}%`;
            
            // Add pulsing animation for active progress
            if (progress > 0 && progress < 100) {
                this.elements.progressText.classList.add('progress-active-text');
            } else {
                this.elements.progressText.classList.remove('progress-active-text');
            }
        }
        
        // Update document title with progress
        if (progress > 0 && progress < 100) {
            document.title = `Testing... ${Math.round(progress)}% - LiteGraph Tester`;
        } else {
            document.title = 'LiteGraph Tester';
        }
    }

    /**
     * Close modal
     */
    closeModal(modal) {
        modal.style.display = 'none';
    }

    /**
     * Log message to console
     */
    logMessage(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}`;
        
        if (this.elements.consoleOutput) {
            const logElement = document.createElement('div');
            logElement.className = `log-entry log-${type}`;
            logElement.textContent = logEntry;
            
            this.elements.consoleOutput.appendChild(logElement);
            this.elements.consoleOutput.scrollTop = this.elements.consoleOutput.scrollHeight;
            
            // Limit console entries
            const entries = this.elements.consoleOutput.children;
            if (entries.length > 1000) {
                this.elements.consoleOutput.removeChild(entries[0]);
            }
        }
        
        console.log(logEntry);
    }

    /**
     * Log warning message
     */
    logWarning(message) {
        this.logMessage(message, 'warning');
    }

    /**
     * Log error message
     */
    logError(message, error) {
        const errorMessage = error ? `${message} ${error.message}` : message;
        this.logMessage(errorMessage, 'error');
        console.error(message, error);
    }

    /**
     * Calculate statistics from results
     */
    calculateStats(results) {
        console.log('[UIManager] calculateStats called with:', results);
        
        if (!results || results.length === 0) {
            console.log('[UIManager] No results or empty results array');
            return {
                total: 0,
                passed: 0,
                failed: 0,
                skipped: 0,
                successRate: 0,
                coverage: 0,
                totalDuration: 0,
                averageDuration: 0
            };
        }
        
        const stats = {
            total: results.length,
            passed: 0,
            failed: 0,
            skipped: 0,
            totalDuration: 0,
            averageDuration: 0,
            successRate: 0,
            coverage: 0
        };
        
        for (const result of results) {
            if (result.status === 'passed') {
                stats.passed++;
            } else if (result.status === 'failed') {
                stats.failed++;
            } else {
                stats.skipped++;
            }
            
            stats.totalDuration += result.duration || 0;
        }
        
        stats.averageDuration = stats.total > 0 ? stats.totalDuration / stats.total : 0;
        stats.successRate = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;
        
        // Calculate coverage based on tested node types vs available
        const testedNodeTypes = new Set(results.map(r => r.nodeType).filter(Boolean));
        const availableNodeTypes = this.app.getAvailableNodeTypes() || [];
        stats.coverage = availableNodeTypes.length > 0 ? 
            Math.round((testedNodeTypes.size / availableNodeTypes.length) * 100) : 0;
        
        console.log('[UIManager] Calculated stats:', stats);
        return stats;
    }

    /**
     * Extract category from node type
     */
    extractCategory(nodeType) {
        // Try to extract category from node type name
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
     * Get available categories
     */
    getAvailableCategories() {
        const nodeTypes = this.app.getAvailableNodeTypes();
        const categories = new Set();
        
        for (const nodeType of nodeTypes) {
            const category = this.extractCategory(nodeType);
            categories.add(category);
        }
        
        return Array.from(categories).sort();
    }

    /**
     * Get file extension for format
     */
    getFileExtension(format) {
        const extensions = {
            html: 'html',
            json: 'json',
            csv: 'csv',
            markdown: 'md',
            junit: 'xml',
            console: 'txt'
        };
        
        return extensions[format] || 'txt';
    }

    /**
     * Get MIME type for format
     */
    getMimeType(format) {
        const mimeTypes = {
            html: 'text/html',
            json: 'application/json',
            csv: 'text/csv',
            markdown: 'text/markdown',
            junit: 'application/xml',
            console: 'text/plain'
        };
        
        return mimeTypes[format] || 'text/plain';
    }

    /**
     * Download file
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show error panel with detailed error information
     * @param {Array} errors - Array of error objects
     */
    showErrorPanel(errors) {
        const errorPanel = document.getElementById('error-panel');
        const errorContent = document.getElementById('error-panel-content');
        const errorCount = document.getElementById('error-count');
        
        if (!errorPanel || !errorContent || !errorCount) {
            console.warn('Error panel elements not found');
            return;
        }

        // Update error count
        errorCount.textContent = errors.length;

        // Clear previous content
        errorContent.innerHTML = '';

        // Group errors by type
        const errorGroups = this.groupErrorsByType(errors);

        // Create error sections
        Object.entries(errorGroups).forEach(([type, typeErrors]) => {
            const section = document.createElement('div');
            section.className = 'error-section';

            const header = document.createElement('div');
            header.className = 'error-section-header';
            header.innerHTML = `
                <h4>${this.escapeHtml(type)} (${typeErrors.length})</h4>
                <button class="toggle-btn" onclick="this.parentElement.parentElement.classList.toggle('collapsed')">
                    <span class="toggle-icon">▼</span>
                </button>
            `;
            section.appendChild(header);

            const errorList = document.createElement('div');
            errorList.className = 'error-list';

            typeErrors.forEach(error => {
                const errorItem = document.createElement('div');
                errorItem.className = 'error-item';
                errorItem.innerHTML = `
                    <div class="error-summary">
                        <strong>Node:</strong> ${this.escapeHtml(error.nodeType || 'Unknown')}<br>
                        <strong>Test:</strong> ${this.escapeHtml(error.testName || 'Unknown')}
                    </div>
                    <div class="error-details">
                        <pre>${this.escapeHtml(error.message || error.error || 'No details available')}</pre>
                        ${error.stack ? `<details><summary>Stack Trace</summary><pre>${this.escapeHtml(error.stack)}</pre></details>` : ''}
                    </div>
                `;
                errorList.appendChild(errorItem);
            });

            section.appendChild(errorList);
            errorContent.appendChild(section);
        });

        // Show the panel
        errorPanel.classList.remove('hidden');
    }

    /**
     * Hide error panel
     */
    hideErrorPanel() {
        const errorPanel = document.getElementById('error-panel');
        if (errorPanel) {
            errorPanel.classList.add('hidden');
        }
    }

    /**
     * Group errors by type for better organization
     * @param {Array} errors - Array of error objects
     * @returns {Object} Grouped errors
     */
    groupErrorsByType(errors) {
        const groups = {};
        
        errors.forEach(error => {
            let type = 'General Errors';
            
            if (error.type) {
                type = error.type;
            } else if (error.message) {
                if (error.message.includes('timeout')) {
                    type = 'Timeout Errors';
                } else if (error.message.includes('connection')) {
                    type = 'Connection Errors';
                } else if (error.message.includes('validation')) {
                    type = 'Validation Errors';
                } else if (error.message.includes('execution')) {
                    type = 'Execution Errors';
                }
            }
            
            if (!groups[type]) {
                groups[type] = [];
            }
            groups[type].push(error);
        });
        
        return groups;
    }

    /**
     * Extract errors from test results and show error panel
     * @param {Array} results - Test results array
     */
    showErrorsFromResults(results) {
        const errors = [];
        
        results.forEach(result => {
            if (result.status === 'failed') {
                // Handle individual test results (current structure)
                if (result.errors && result.errors.length > 0) {
                    result.errors.forEach(error => {
                        errors.push({
                            nodeType: result.nodeType,
                            testName: result.testCase?.name || 'Test',
                            message: error.message,
                            stack: error.stack,
                            type: error.type || 'Test Failure'
                        });
                    });
                } else {
                    // Fallback for results without detailed error info
                    errors.push({
                        nodeType: result.nodeType,
                        testName: result.testCase?.name || 'General',
                        message: result.error || result.message || 'Test failed',
                        stack: result.stack,
                        type: result.errorType || 'Node Test Failure'
                    });
                }
            }
        });
        
        if (errors.length > 0) {
            this.showErrorPanel(errors);
        }
    }
}

export default UIManager;
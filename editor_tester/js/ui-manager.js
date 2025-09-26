/**
 * UI Manager for LiteGraph Editor Tester
 * Handles all UI interactions, updates, and display logic
 */

function UIManager(app, testRunner, reporter) {
    this.app = app;
    this.testRunner = testRunner;
    this.reporter = reporter;
    
    // UI elements
    this.elements = {};
    this.modals = {};
    
    // State
    this.selectedNodes = [];
    this.currentResults = [];
    
    // Initialize UI
    this.initializeElements();
    this.setupEventListeners();
    this.setupConfigListeners();
    this.updateUI();
}

/**
 * Initialize UI elements
 */
UIManager.prototype.initializeElements = function() {
    // Main controls
    this.elements.runAllBtn = document.getElementById('runAllTests');
    this.elements.runSelectedBtn = document.getElementById('runSelectedTests');
    this.elements.stopBtn = document.getElementById('stopTests');
    this.elements.clearBtn = document.getElementById('clearResults');
    this.elements.exportBtn = document.getElementById('exportResults');
    this.elements.configBtn = document.getElementById('showConfig');
    
    // Stats display
    this.elements.totalTests = document.getElementById('totalTests');
    this.elements.passedTests = document.getElementById('passedTests');
    this.elements.failedTests = document.getElementById('failedTests');
    this.elements.successRate = document.getElementById('successRate');
    this.elements.coverage = document.getElementById('coverage');
    
    // Progress
    this.elements.progressBar = document.querySelector('.progress-bar');
    this.elements.progressText = document.querySelector('.progress-text');
    
    // Panels
    this.elements.nodeList = document.getElementById('node-list');
    this.elements.resultsPanel = document.getElementById('results-panel');
    this.elements.consoleOutput = document.getElementById('console-output');
    
    // Modals
    this.modals.config = document.getElementById('config-modal');
    this.modals.export = document.getElementById('export-modal');
    
    // Search and filter
    this.elements.searchInput = document.getElementById('nodeSearch');
    this.elements.categoryFilter = document.getElementById('categoryFilter');
    this.elements.statusFilter = document.getElementById('statusFilter');
    
    // Global selection
    this.elements.selectAllBtn = document.getElementById('selectAll');
    this.elements.deselectAllBtn = document.getElementById('deselectAll');
    this.elements.selectedCount = document.getElementById('selectedCount');
};

/**
 * Setup event listeners
 */
UIManager.prototype.setupEventListeners = function() {
    var self = this;
    
    // Main controls
    if (this.elements.runAllBtn) {
        this.elements.runAllBtn.addEventListener('click', function() { self.runAllTests(); });
    }
    
    if (this.elements.runSelectedBtn) {
        this.elements.runSelectedBtn.addEventListener('click', function() { self.runSelectedTests(); });
    }
    
    if (this.elements.stopBtn) {
        this.elements.stopBtn.addEventListener('click', function() { self.stopTests(); });
    }
    
    if (this.elements.clearBtn) {
        this.elements.clearBtn.addEventListener('click', function() { self.clearResults(); });
    }
    
    if (this.elements.exportBtn) {
        this.elements.exportBtn.addEventListener('click', function() { self.showExportModal(); });
    }
    
    if (this.elements.configBtn) {
        this.elements.configBtn.addEventListener('click', function() { self.showConfigModal(); });
    }
    
    // Search and filter
    if (this.elements.searchInput) {
        this.elements.searchInput.addEventListener('input', function(e) {
            self.filterNodes(e.target.value);
        });
    }
    
    if (this.elements.categoryFilter) {
        this.elements.categoryFilter.addEventListener('change', function(e) {
            self.filterByCategory(e.target.value);
        });
    }
    
    if (this.elements.statusFilter) {
        this.elements.statusFilter.addEventListener('change', function(e) {
            self.filterByStatus(e.target.value);
        });
    }
    
    // Global selection
    if (this.elements.selectAllBtn) {
        this.elements.selectAllBtn.addEventListener('click', function() { self.selectAllNodes(); });
    }
    
    if (this.elements.deselectAllBtn) {
        this.elements.deselectAllBtn.addEventListener('click', function() { self.deselectAllNodes(); });
    }
    
    // Modal close handlers
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('close-modal')) {
            var modal = e.target.closest('.modal');
            if (modal) {
                self.closeModal(modal);
            }
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) { self.handleKeyboardShortcuts(e); });
    
    // Window resize
    window.addEventListener('resize', function() { self.handleResize(); });
    
    // Error panel toggle
    var errorToggle = document.getElementById('toggle-error-panel');
    if (errorToggle) {
        errorToggle.addEventListener('click', function() {
            var errorPanel = document.getElementById('error-panel');
            if (errorPanel) {
                errorPanel.classList.toggle('hidden');
            }
        });
    }
};

/**
 * Setup configuration listeners
 */
UIManager.prototype.setupConfigListeners = function() {
    var self = this;
    
    // Listen for config changes
    if (window.TestConfig && window.TestConfig.on) {
        window.TestConfig.on('configChanged', function(config) {
            self.updateUI();
        });
        
        window.TestConfig.on('presetLoaded', function(presetName) {
            self.logMessage('Loaded preset: ' + presetName);
        });
    }
};

/**
 * Update UI
 */
UIManager.prototype.updateUI = function() {
    this.updateNodeList();
    this.updateStats();
    this.updateControls();
    this.updateFilters();
};

/**
 * Update node list
 */
UIManager.prototype.updateNodeList = function() {
    if (!this.elements.nodeList) return;
    
    var nodeTypes = this.app.getAvailableNodeTypes();
    var groupedNodes = this.groupNodesByCategory(nodeTypes);
    
    this.elements.nodeList.innerHTML = '';
    
    var self = this;
    for (var category in groupedNodes) {
        if (groupedNodes.hasOwnProperty(category)) {
            var nodes = groupedNodes[category];
            var categoryElement = this.createCategoryElement(category, nodes);
            this.elements.nodeList.appendChild(categoryElement);
        }
    }
    
    this.updateSelectedCount();
};

/**
 * Create category element
 */
UIManager.prototype.createCategoryElement = function(category, nodes) {
    var self = this;
    var categoryDiv = document.createElement('div');
    categoryDiv.className = 'node-category';
    categoryDiv.dataset.category = category;
    
    var header = document.createElement('div');
    header.className = 'category-header';
    header.innerHTML = 
        '<button class="category-toggle" onclick="this.parentElement.parentElement.classList.toggle(\'collapsed\')">' +
            '<span class="toggle-icon">▼</span>' +
        '</button>' +
        '<span class="category-name">' + category + '</span>' +
        '<div class="category-controls">' +
            '<button class="btn btn-sm select-category" title="Select all in category">Select All</button>' +
            '<button class="btn btn-sm deselect-category" title="Deselect all in category">Deselect All</button>' +
        '</div>';
    
    var selectBtn = header.querySelector('.select-category');
    var deselectBtn = header.querySelector('.deselect-category');
    
    selectBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        self.selectCategoryNodes(category, true);
    });
    
    deselectBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        self.selectCategoryNodes(category, false);
    });
    
    categoryDiv.appendChild(header);
    
    var nodesDiv = document.createElement('div');
    nodesDiv.className = 'category-nodes';
    
    for (var i = 0; i < nodes.length; i++) {
        var nodeType = nodes[i];
        var nodeElement = this.createNodeElement(nodeType);
        nodesDiv.appendChild(nodeElement);
    }
    
    categoryDiv.appendChild(nodesDiv);
    return categoryDiv;
};

/**
 * Create node element
 */
UIManager.prototype.createNodeElement = function(nodeType) {
    var self = this;
    var nodeDiv = document.createElement('div');
    nodeDiv.className = 'node-item';
    nodeDiv.dataset.nodeType = nodeType;
    
    var isSelected = this.selectedNodes.indexOf(nodeType) !== -1;
    var testResult = this.getNodeTestResult(nodeType);
    
    nodeDiv.innerHTML = 
        '<div class="node-checkbox">' +
            '<input type="checkbox" id="node_' + nodeType + '"' + (isSelected ? ' checked' : '') + '>' +
        '</div>' +
        '<div class="node-info">' +
            '<span class="node-name">' + nodeType + '</span>' +
            '<div class="node-status ' + (testResult ? testResult.status : '') + '">' +
                (testResult ? this.getStatusIcon(testResult.status) : '') +
            '</div>' +
        '</div>' +
        '<div class="node-controls">' +
            '<button class="btn btn-sm run-single" title="Run tests for this node">▶</button>' +
            '<button class="btn btn-sm node-info-btn" title="Show node information">ℹ</button>' +
        '</div>';
    
    var checkbox = nodeDiv.querySelector('input[type="checkbox"]');
    var debounceTimer;
    
    checkbox.addEventListener('change', function(e) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function() {
            self.toggleNodeSelection(nodeType, e.target.checked);
        }, 100);
    });
    
    var runBtn = nodeDiv.querySelector('.run-single');
    runBtn.addEventListener('click', function() { self.runSingleNodeTest(nodeType); });
    
    var infoBtn = nodeDiv.querySelector('.node-info-btn');
    infoBtn.addEventListener('click', function() { self.showNodeInfo(nodeType); });
    
    return nodeDiv;
};

/**
 * Update stats
 */
UIManager.prototype.updateStats = function() {
    var stats = this.calculateStats(this.currentResults);
    
    if (this.elements.totalTests) {
        this.elements.totalTests.textContent = stats.total;
    }
    if (this.elements.passedTests) {
        this.elements.passedTests.textContent = stats.passed;
    }
    if (this.elements.failedTests) {
        this.elements.failedTests.textContent = stats.failed;
    }
    if (this.elements.successRate) {
        this.elements.successRate.textContent = stats.successRate.toFixed(1) + '%';
    }
    if (this.elements.coverage) {
        this.elements.coverage.textContent = stats.coverage + '%';
    }
    
    var rightPanelStats = document.querySelector('.stats-panel');
    if (rightPanelStats) {
        rightPanelStats.innerHTML = 
            '<div class="stat-item">' +
                '<span class="stat-label">Total Tests:</span>' +
                '<span class="stat-value">' + stats.total + '</span>' +
            '</div>' +
            '<div class="stat-item">' +
                '<span class="stat-label">Passed:</span>' +
                '<span class="stat-value passed">' + stats.passed + '</span>' +
            '</div>' +
            '<div class="stat-item">' +
                '<span class="stat-label">Failed:</span>' +
                '<span class="stat-value failed">' + stats.failed + '</span>' +
            '</div>' +
            '<div class="stat-item">' +
                '<span class="stat-label">Success Rate:</span>' +
                '<span class="stat-value">' + stats.successRate.toFixed(1) + '%</span>' +
            '</div>' +
            '<div class="stat-item">' +
                '<span class="stat-label">Coverage:</span>' +
                '<span class="stat-value">' + stats.coverage + '%</span>' +
            '</div>' +
            '<div class="stat-item">' +
                '<span class="stat-label">Avg Duration:</span>' +
                '<span class="stat-value">' + stats.averageDuration.toFixed(2) + 'ms</span>' +
            '</div>';
    }
    
    if (this.elements.progressBar && stats.total > 0) {
        var progress = ((stats.passed + stats.failed) / stats.total) * 100;
        this.updateProgress(progress);
    }
    
    var errorControls = document.querySelector('.error-controls');
    if (errorControls) {
        errorControls.style.display = stats.failed > 0 ? 'block' : 'none';
    }
};

/**
 * Update controls
 */
UIManager.prototype.updateControls = function() {
    var isRunning = this.testRunner.isTestsRunning();
    var hasSelectedNodes = this.selectedNodes.length > 0;
    var hasResults = this.currentResults.length > 0;
    
    if (this.elements.runAllBtn) {
        this.elements.runAllBtn.disabled = isRunning;
        this.toggleButtonLoading(this.elements.runAllBtn, isRunning);
    }
    
    if (this.elements.runSelectedBtn) {
        this.elements.runSelectedBtn.disabled = isRunning || !hasSelectedNodes;
        this.toggleButtonLoading(this.elements.runSelectedBtn, isRunning);
    }
    
    if (this.elements.stopBtn) {
        this.elements.stopBtn.disabled = !isRunning;
    }
    
    if (this.elements.exportBtn) {
        this.elements.exportBtn.disabled = !hasResults;
    }
    
    if (this.elements.clearBtn) {
        this.elements.clearBtn.disabled = !hasResults;
    }
    
    document.body.classList.toggle('tests-running', isRunning);
};

/**
 * Toggle button loading state
 */
UIManager.prototype.toggleButtonLoading = function(button, loading) {
    if (loading) {
        button.classList.add('loading');
        button.innerHTML = '<span class="spinner"></span> Running...';
    } else {
        button.classList.remove('loading');
        button.innerHTML = button.dataset.originalText || button.textContent.replace('Running...', '').trim();
    }
};

/**
 * Update filters
 */
UIManager.prototype.updateFilters = function() {
    if (this.elements.categoryFilter) {
        var categories = this.getAvailableCategories();
        this.elements.categoryFilter.innerHTML = '<option value="">All Categories</option>';
        
        for (var i = 0; i < categories.length; i++) {
            var category = categories[i];
            var option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            this.elements.categoryFilter.appendChild(option);
        }
    }
};

/**
 * Run all tests
 */
UIManager.prototype.runAllTests = function() {
    var self = this;
    try {
        var nodeTypes = this.app.getAvailableNodeTypes();
        if (nodeTypes.length === 0) {
            this.logWarning('No node types available for testing');
            return;
        }
        
        this.testRunner.runAllTests(function(progress) {
            self.updateProgress(progress.percentage, progress.message);
        }).then(function(results) {
            self.handleTestResults(results);
        }).catch(function(error) {
            self.logError('Failed to run all tests:', error);
        });
    } catch (error) {
        this.logError('Failed to run all tests:', error);
    }
};

/**
 * Run selected tests
 */
UIManager.prototype.runSelectedTests = function() {
    var self = this;
    try {
        var selectedNodeTypes = this.selectedNodes;
        if (selectedNodeTypes.length === 0) {
            this.logWarning('No node types selected for testing');
            return;
        }
        
        this.testRunner.runSelectedTests(selectedNodeTypes, function(progress) {
            self.updateProgress(progress.percentage, progress.message);
        }).then(function(results) {
            self.handleTestResults(results);
        }).catch(function(error) {
            self.logError('Failed to run selected tests:', error);
        });
    } catch (error) {
        this.logError('Failed to run selected tests:', error);
    }
};

/**
 * Stop tests
 */
UIManager.prototype.stopTests = function() {
    this.testRunner.stopTests();
    this.logMessage('Tests stopped by user');
};

/**
 * Run single node test
 */
UIManager.prototype.runSingleNodeTest = function(nodeType) {
    var self = this;
    try {
        this.testRunner.runTestsForNodeTypes([nodeType], function(progress) {
            self.updateProgress(progress.percentage, progress.message);
        }).then(function(results) {
            self.handleTestResults(results);
        }).catch(function(error) {
            self.logError('Failed to run tests for ' + nodeType + ':', error);
        });
    } catch (error) {
        this.logError('Failed to run tests for ' + nodeType + ':', error);
    }
};

/**
 * Handle test results
 */
UIManager.prototype.handleTestResults = function(results) {
    console.log('[UIManager] handleTestResults called with:', results);
    
    this.currentResults = results || [];
    this.displayResults(this.currentResults);
    this.updateStats();
    this.updateControls();
    this.updateNodeStatuses();
    
    this.logMessage('Tests completed. ' + this.currentResults.length + ' results processed.');
};

/**
 * Update test results
 */
UIManager.prototype.updateTestResults = function(results) {
    this.handleTestResults(results);
};

/**
 * Display results
 */
UIManager.prototype.displayResults = function(results) {
    if (!this.elements.resultsPanel) return;
    
    if (!results || results.length === 0) {
        this.elements.resultsPanel.innerHTML = '<div class="no-results">No test results available</div>';
        return;
    }
    
    var groupedResults = this.groupResultsByNodeType(results);
    var html = '<div class="results-header"><h3>Test Results</h3></div>';
    
    for (var nodeType in groupedResults) {
        if (groupedResults.hasOwnProperty(nodeType)) {
            var nodeResults = groupedResults[nodeType];
            html += this.createResultGroupElement(nodeType, nodeResults);
        }
    }
    
    this.elements.resultsPanel.innerHTML = html;
    
    var failedResults = results.filter(function(r) { return r.status === 'failed'; });
    if (failedResults.length > 0) {
        this.showErrorsFromResults(failedResults);
    }
};

/**
 * Create result group element
 */
UIManager.prototype.createResultGroupElement = function(nodeType, results) {
    var passedCount = results.filter(function(r) { return r.status === 'passed'; }).length;
    var failedCount = results.filter(function(r) { return r.status === 'failed'; }).length;
    var totalCount = results.length;
    
    var status = failedCount > 0 ? 'failed' : 'passed';
    var statusIcon = this.getStatusIcon(status);
    
    return '<div class="result-group" data-node-type="' + nodeType + '">' +
        '<div class="result-group-header" onclick="this.parentElement.classList.toggle(\'expanded\')">' +
            '<span class="status-icon">' + statusIcon + '</span>' +
            '<span class="node-type">' + nodeType + '</span>' +
            '<span class="result-counts">' + passedCount + '/' + totalCount + ' passed</span>' +
            '<span class="toggle-icon">▼</span>' +
        '</div>' +
        '<div class="result-group-details">' +
            this.generateResultDetails(results) +
        '</div>' +
    '</div>';
};

/**
 * Generate result details
 */
UIManager.prototype.generateResultDetails = function(results) {
    var html = '';
    
    for (var i = 0; i < results.length; i++) {
        var result = results[i];
        var statusClass = 'result-item-' + result.status;
        
        html += '<div class="result-item ' + statusClass + '">' +
            '<div class="result-header">' +
                '<span class="test-name">' + (result.testName || 'Test ' + (i + 1)) + '</span>' +
                '<span class="test-status">' + result.status + '</span>' +
            '</div>';
        
        if (result.error) {
            html += '<div class="result-error">' + this.escapeHtml(result.error) + '</div>';
        }
        
        if (result.duration) {
            html += '<div class="result-duration">Duration: ' + result.duration.toFixed(2) + 'ms</div>';
        }
        
        html += '</div>';
    }
    
    return html;
};

/**
 * Update node statuses
 */
UIManager.prototype.updateNodeStatuses = function() {
    var nodeItems = document.querySelectorAll('.node-item');
    
    for (var i = 0; i < nodeItems.length; i++) {
        var nodeItem = nodeItems[i];
        var nodeType = nodeItem.dataset.nodeType;
        var statusElement = nodeItem.querySelector('.node-status');
        var result = this.getNodeTestResult(nodeType);
        
        if (statusElement && result) {
            statusElement.className = 'node-status ' + result.status;
            statusElement.innerHTML = this.getStatusIcon(result.status);
        }
    }
};

/**
 * Show config modal
 */
UIManager.prototype.showConfigModal = function() {
    if (this.modals.config) {
        this.populateConfigModal();
        this.modals.config.style.display = 'flex';
    }
};

/**
 * Populate config modal
 */
UIManager.prototype.populateConfigModal = function() {
    var configContent = document.getElementById('config-content');
    if (!configContent) return;
    
    var config = window.TestConfig ? window.TestConfig.get() : {};
    
    configContent.innerHTML = this.generateConfigFields(config);
    this.setupConfigModalEvents();
};

/**
 * Generate config fields
 */
UIManager.prototype.generateConfigFields = function(config) {
    return '<div class="config-section">' +
        '<h3>Test Configuration</h3>' +
        '<div class="config-field">' +
            '<label>Timeout (ms):</label>' +
            '<input type="number" id="config-timeout" value="' + (config.timeout || 5000) + '">' +
        '</div>' +
        '<div class="config-field">' +
            '<label>Max Concurrent:</label>' +
            '<input type="number" id="config-concurrent" value="' + (config.maxConcurrent || 5) + '">' +
        '</div>' +
        '<div class="config-field">' +
            '<label>Retry Count:</label>' +
            '<input type="number" id="config-retry" value="' + (config.retryCount || 3) + '">' +
        '</div>' +
    '</div>';
};

/**
 * Setup config modal events
 */
UIManager.prototype.setupConfigModalEvents = function() {
    var self = this;
    var saveBtn = document.getElementById('save-config');
    
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            self.saveConfiguration();
        });
    }
};

/**
 * Save configuration
 */
UIManager.prototype.saveConfiguration = function() {
    try {
        var config = {};
        
        var timeoutInput = document.getElementById('config-timeout');
        var concurrentInput = document.getElementById('config-concurrent');
        var retryInput = document.getElementById('config-retry');
        
        if (timeoutInput) config.timeout = parseInt(timeoutInput.value);
        if (concurrentInput) config.maxConcurrent = parseInt(concurrentInput.value);
        if (retryInput) config.retryCount = parseInt(retryInput.value);
        
        if (window.TestConfig) {
            window.TestConfig.set(config);
        }
        
        this.closeModal(this.modals.config);
        this.logMessage('Configuration saved');
    } catch (error) {
        this.logError('Failed to save configuration:', error);
    }
};

/**
 * Show export modal
 */
UIManager.prototype.showExportModal = function() {
    if (this.modals.export) {
        this.populateExportModal();
        this.modals.export.style.display = 'flex';
    }
};

/**
 * Populate export modal
 */
UIManager.prototype.populateExportModal = function() {
    var exportContent = document.getElementById('export-content');
    if (!exportContent) return;
    
    exportContent.innerHTML = 
        '<div class="export-section">' +
            '<h3>Export Results</h3>' +
            '<div class="export-format">' +
                '<label>Format:</label>' +
                '<select id="export-format">' +
                    '<option value="json">JSON</option>' +
                    '<option value="csv">CSV</option>' +
                    '<option value="html">HTML Report</option>' +
                '</select>' +
            '</div>' +
            '<div class="export-actions">' +
                '<button id="download-export" class="btn btn-primary">Download</button>' +
                '<button id="copy-export" class="btn btn-secondary">Copy to Clipboard</button>' +
            '</div>' +
        '</div>';
    
    this.setupExportModalEvents();
};

/**
 * Setup export modal events
 */
UIManager.prototype.setupExportModalEvents = function() {
    var self = this;
    
    var downloadBtn = document.getElementById('download-export');
    var copyBtn = document.getElementById('copy-export');
    
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            self.downloadExport();
        });
    }
    
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            self.copyExportToClipboard();
        });
    }
};

/**
 * Download export
 */
UIManager.prototype.downloadExport = function() {
    var formatSelect = document.getElementById('export-format');
    var format = formatSelect ? formatSelect.value : 'json';
    
    var content = '';
    var filename = 'test-results.' + this.getFileExtension(format);
    var mimeType = this.getMimeType(format);
    
    switch (format) {
        case 'json':
            content = JSON.stringify(this.currentResults, null, 2);
            break;
        case 'csv':
            content = this.formatCSV(this.currentResults);
            break;
        case 'html':
            content = this.formatHTML(this.currentResults);
            break;
    }
    
    this.downloadFile(content, filename, mimeType);
    this.closeModal(this.modals.export);
};

/**
 * Copy export to clipboard
 */
UIManager.prototype.copyExportToClipboard = function() {
    var formatSelect = document.getElementById('export-format');
    var format = formatSelect ? formatSelect.value : 'json';
    
    var content = '';
    
    switch (format) {
        case 'json':
            content = JSON.stringify(this.currentResults, null, 2);
            break;
        case 'csv':
            content = this.formatCSV(this.currentResults);
            break;
        case 'html':
            content = this.formatHTML(this.currentResults);
            break;
    }
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(content).then(function() {
            console.log('Results copied to clipboard');
        }).catch(function(error) {
            console.error('Failed to copy to clipboard:', error);
        });
    }
};

/**
 * Clear results
 */
UIManager.prototype.clearResults = function() {
    if (this.currentResults.length === 0) {
        this.logMessage('No results to clear');
        return;
    }
    
    this.currentResults = [];
    
    if (this.elements.resultsPanel) {
        this.elements.resultsPanel.innerHTML = '<div class="no-results">No test results available</div>';
    }
    
    this.updateStats();
    this.updateControls();
    this.updateNodeStatuses();
    this.hideErrorPanel();
    
    this.logMessage('Results cleared');
};

/**
 * Toggle node selection
 */
UIManager.prototype.toggleNodeSelection = function(nodeType, selected) {
    var index = this.selectedNodes.indexOf(nodeType);
    
    if (selected) {
        if (index === -1) {
            this.selectedNodes.push(nodeType);
        }
    } else {
        if (index !== -1) {
            this.selectedNodes.splice(index, 1);
        }
    }
    
    var nodeElement = document.querySelector('[data-node-type="' + nodeType + '"]');
    if (nodeElement) {
        nodeElement.classList.toggle('selected', selected);
        
        var checkbox = nodeElement.querySelector('input[type="checkbox"]');
        if (checkbox) {
            checkbox.checked = selected;
        }
    }
    
    this.updateSelectedCount();
    this.updateControls();
};

/**
 * Select category nodes
 */
UIManager.prototype.selectCategoryNodes = function(category, selected) {
    var categoryElement = document.querySelector('[data-category="' + category + '"]');
    if (!categoryElement) return;
    
    var checkboxes = categoryElement.querySelectorAll('input[type="checkbox"]');
    for (var i = 0; i < checkboxes.length; i++) {
        var checkbox = checkboxes[i];
        if (!checkbox.disabled) {
            checkbox.checked = selected;
            var nodeType = checkbox.closest('.node-item').dataset.nodeType;
            this.toggleNodeSelection(nodeType, selected);
        }
    }
};

/**
 * Update selected count
 */
UIManager.prototype.updateSelectedCount = function() {
    var count = this.selectedNodes.length;
    var countElement = this.elements.selectedCount;
    
    if (countElement) {
        countElement.textContent = count + ' selected';
    }
};

/**
 * Select all nodes
 */
UIManager.prototype.selectAllNodes = function() {
    var nodeTypes = this.app.getAvailableNodeTypes();
    
    for (var i = 0; i < nodeTypes.length; i++) {
        var nodeType = nodeTypes[i];
        this.toggleNodeSelection(nodeType, true);
    }
    
    var checkboxes = document.querySelectorAll('.node-item input[type="checkbox"]');
    for (var j = 0; j < checkboxes.length; j++) {
        var checkbox = checkboxes[j];
        if (!checkbox.disabled) {
            checkbox.checked = true;
        }
    }
};

/**
 * Deselect all nodes
 */
UIManager.prototype.deselectAllNodes = function() {
    this.selectedNodes = [];
    
    var checkboxes = document.querySelectorAll('.node-item input[type="checkbox"]');
    for (var i = 0; i < checkboxes.length; i++) {
        checkboxes[i].checked = false;
    }
    
    var nodeElements = document.querySelectorAll('.node-item');
    for (var j = 0; j < nodeElements.length; j++) {
        nodeElements[j].classList.remove('selected');
    }
    
    this.updateSelectedCount();
    this.updateControls();
};

/**
 * Filter nodes
 */
UIManager.prototype.filterNodes = function(searchTerm) {
    var nodeItems = document.querySelectorAll('.node-item');
    
    for (var i = 0; i < nodeItems.length; i++) {
        var nodeItem = nodeItems[i];
        var nodeType = nodeItem.dataset.nodeType;
        var matches = nodeType.toLowerCase().indexOf(searchTerm.toLowerCase()) !== -1;
        
        nodeItem.style.display = matches ? 'block' : 'none';
    }
    
    this.updateCategoryVisibility();
};

/**
 * Filter by category
 */
UIManager.prototype.filterByCategory = function(category) {
    var categories = document.querySelectorAll('.node-category');
    
    for (var i = 0; i < categories.length; i++) {
        var categoryElement = categories[i];
        var categoryName = categoryElement.dataset.category;
        var matches = !category || categoryName === category;
        
        categoryElement.style.display = matches ? 'block' : 'none';
    }
};

/**
 * Filter by status
 */
UIManager.prototype.filterByStatus = function(status) {
    var nodeItems = document.querySelectorAll('.node-item');
    
    for (var i = 0; i < nodeItems.length; i++) {
        var nodeItem = nodeItems[i];
        var nodeType = nodeItem.dataset.nodeType;
        var result = this.getNodeTestResult(nodeType);
        
        var matches = true;
        if (status === 'passed') {
            matches = result && result.status === 'passed';
        } else if (status === 'failed') {
            matches = result && result.status === 'failed';
        } else if (status === 'untested') {
            matches = !result;
        }
        
        nodeItem.style.display = matches ? 'block' : 'none';
    }
    
    this.updateCategoryVisibility();
};

/**
 * Update category visibility
 */
UIManager.prototype.updateCategoryVisibility = function() {
    var categories = document.querySelectorAll('.node-category');
    
    for (var i = 0; i < categories.length; i++) {
        var category = categories[i];
        var visibleNodes = category.querySelectorAll('.node-item[style*="block"], .node-item:not([style])');
        
        category.style.display = visibleNodes.length > 0 ? 'block' : 'none';
    }
};

/**
 * Show node info
 */
UIManager.prototype.showNodeInfo = function(nodeType) {
    var nodeInfo = this.app.getNodeInfo ? this.app.getNodeInfo(nodeType) : null;
    
    if (!nodeInfo) {
        this.logWarning('No information available for node type: ' + nodeType);
        return;
    }
    
    var modal = document.createElement('div');
    modal.className = 'modal node-info-modal';
    modal.innerHTML = 
        '<div class="modal-content">' +
            '<div class="modal-header">' +
                '<h2>Node Information: ' + nodeType + '</h2>' +
                '<button class="close-modal">&times;</button>' +
            '</div>' +
            '<div class="modal-body">' +
                this.formatNodeInfo(nodeInfo) +
            '</div>' +
        '</div>';
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    var self = this;
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
    
    var closeBtn = modal.querySelector('.close-modal');
    closeBtn.addEventListener('click', function() {
        document.body.removeChild(modal);
    });
};

/**
 * Format node info
 */
UIManager.prototype.formatNodeInfo = function(nodeInfo) {
    var html = '<div class="node-info-content">';
    
    if (nodeInfo.description) {
        html += '<div class="info-section">' +
            '<h3>Description</h3>' +
            '<p>' + this.escapeHtml(nodeInfo.description) + '</p>' +
        '</div>';
    }
    
    if (nodeInfo.inputs && nodeInfo.inputs.length > 0) {
        html += '<div class="info-section">' +
            '<h3>Inputs</h3>' +
            '<ul>';
        
        for (var i = 0; i < nodeInfo.inputs.length; i++) {
            var input = nodeInfo.inputs[i];
            html += '<li>' + input.name + ' (' + input.type + ')</li>';
        }
        
        html += '</ul></div>';
    }
    
    if (nodeInfo.outputs && nodeInfo.outputs.length > 0) {
        html += '<div class="info-section">' +
            '<h3>Outputs</h3>' +
            '<ul>';
        
        for (var j = 0; j < nodeInfo.outputs.length; j++) {
            var output = nodeInfo.outputs[j];
            html += '<li>' + output.name + ' (' + output.type + ')</li>';
        }
        
        html += '</ul></div>';
    }
    
    html += '</div>';
    return html;
};

/**
 * Handle keyboard shortcuts
 */
UIManager.prototype.handleKeyboardShortcuts = function(e) {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 'a':
                e.preventDefault();
                this.selectAllNodes();
                break;
            case 'r':
                e.preventDefault();
                if (this.selectedNodes.length > 0) {
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
            case 'c':
                e.preventDefault();
                this.clearResults();
                break;
        }
    }
    
    if (e.key === 'Escape') {
        var openModals = document.querySelectorAll('.modal[style*="flex"]');
        for (var i = 0; i < openModals.length; i++) {
            this.closeModal(openModals[i]);
        }
    }
};

/**
 * Handle resize
 */
UIManager.prototype.handleResize = function() {
    this.updateLayout();
};

/**
 * Update layout
 */
UIManager.prototype.updateLayout = function() {
    var container = document.querySelector('.container');
    if (!container) return;
    
    var width = window.innerWidth;
    
    if (width < 768) {
        container.classList.add('mobile-layout');
    } else {
        container.classList.remove('mobile-layout');
    }
};

/**
 * Update progress
 */
UIManager.prototype.updateProgress = function(progress, message) {
    if (this.elements.progressBar) {
        this.elements.progressBar.style.transition = 'width 0.3s ease-out';
        this.elements.progressBar.style.width = progress + '%';
        
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
        this.elements.progressText.textContent = message || (progress.toFixed(1) + '%');
        
        if (progress > 0 && progress < 100) {
            this.elements.progressText.classList.add('progress-active-text');
        } else {
            this.elements.progressText.classList.remove('progress-active-text');
        }
    }
    
    if (progress > 0 && progress < 100) {
        document.title = 'Testing... ' + Math.round(progress) + '% - LiteGraph Tester';
    } else {
        document.title = 'LiteGraph Tester';
    }
};

/**
 * Close modal
 */
UIManager.prototype.closeModal = function(modal) {
    modal.style.display = 'none';
};

/**
 * Log message
 */
UIManager.prototype.logMessage = function(message, type) {
    type = type || 'info';
    var timestamp = new Date().toLocaleTimeString();
    var logEntry = '[' + timestamp + '] ' + message;
    
    if (this.elements.consoleOutput) {
        var logElement = document.createElement('div');
        logElement.className = 'log-entry log-' + type;
        logElement.textContent = logEntry;
        
        this.elements.consoleOutput.appendChild(logElement);
        this.elements.consoleOutput.scrollTop = this.elements.consoleOutput.scrollHeight;
        
        var entries = this.elements.consoleOutput.children;
        if (entries.length > 1000) {
            this.elements.consoleOutput.removeChild(entries[0]);
        }
    }
    
    console.log(logEntry);
};

/**
 * Log warning
 */
UIManager.prototype.logWarning = function(message) {
    this.logMessage(message, 'warning');
};

/**
 * Log error
 */
UIManager.prototype.logError = function(message, error) {
    var errorMessage = error ? (message + ' ' + error.message) : message;
    this.logMessage(errorMessage, 'error');
    console.error(message, error);
};

/**
 * Calculate stats
 */
UIManager.prototype.calculateStats = function(results) {
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
    
    var stats = {
        total: results.length,
        passed: 0,
        failed: 0,
        skipped: 0,
        totalDuration: 0,
        averageDuration: 0,
        successRate: 0,
        coverage: 0
    };
    
    var testedNodeTypes = [];
    
    for (var i = 0; i < results.length; i++) {
        var result = results[i];
        
        if (result.status === 'passed') {
            stats.passed++;
        } else if (result.status === 'failed') {
            stats.failed++;
        } else {
            stats.skipped++;
        }
        
        if (result.duration) {
            stats.totalDuration += result.duration;
        }
        
        if (result.nodeType && testedNodeTypes.indexOf(result.nodeType) === -1) {
            testedNodeTypes.push(result.nodeType);
        }
    }
    
    stats.averageDuration = stats.total > 0 ? stats.totalDuration / stats.total : 0;
    stats.successRate = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;
    
    var availableNodeTypes = this.app.getAvailableNodeTypes() || [];
    stats.coverage = availableNodeTypes.length > 0 ? 
        Math.round((testedNodeTypes.length / availableNodeTypes.length) * 100) : 0;
    
    console.log('[UIManager] Calculated stats:', stats);
    return stats;
};

/**
 * Extract category from node type
 */
UIManager.prototype.extractCategory = function(nodeType) {
    var parts = nodeType.split('/');
    if (parts.length > 1) {
        return parts[0];
    }
    
    var prefixes = ['Math', 'Logic', 'String', 'Array', 'Object', 'Time', 'File', 'Network', 'UI'];
    for (var i = 0; i < prefixes.length; i++) {
        var prefix = prefixes[i];
        if (nodeType.indexOf(prefix) === 0) {
            return prefix;
        }
    }
    
    return 'Other';
};

/**
 * Get available categories
 */
UIManager.prototype.getAvailableCategories = function() {
    var nodeTypes = this.app.getAvailableNodeTypes();
    var categories = [];
    
    for (var i = 0; i < nodeTypes.length; i++) {
        var nodeType = nodeTypes[i];
        var category = this.extractCategory(nodeType);
        if (categories.indexOf(category) === -1) {
            categories.push(category);
        }
    }
    
    return categories.sort();
};

/**
 * Group nodes by category
 */
UIManager.prototype.groupNodesByCategory = function(nodeTypes) {
    var grouped = {};
    
    for (var i = 0; i < nodeTypes.length; i++) {
        var nodeType = nodeTypes[i];
        var category = this.extractCategory(nodeType);
        
        if (!grouped[category]) {
            grouped[category] = [];
        }
        grouped[category].push(nodeType);
    }
    
    var sortedGrouped = {};
    var sortedKeys = Object.keys(grouped).sort();
    for (var j = 0; j < sortedKeys.length; j++) {
        var key = sortedKeys[j];
        sortedGrouped[key] = grouped[key];
    }
    
    return sortedGrouped;
};

/**
 * Group results by node type
 */
UIManager.prototype.groupResultsByNodeType = function(results) {
    var grouped = {};
    
    for (var i = 0; i < results.length; i++) {
        var result = results[i];
        var nodeType = result.nodeType || 'Unknown';
        
        if (!grouped[nodeType]) {
            grouped[nodeType] = [];
        }
        grouped[nodeType].push(result);
    }
    
    return grouped;
};

/**
 * Get node test result
 */
UIManager.prototype.getNodeTestResult = function(nodeType) {
    var nodeResults = this.currentResults.filter(function(r) { return r.nodeType === nodeType; });
    
    if (nodeResults.length === 0) return null;
    
    var hasFailures = nodeResults.some(function(r) { return r.status === 'failed'; });
    
    return {
        status: hasFailures ? 'failed' : 'passed',
        count: nodeResults.length
    };
};

/**
 * Get status icon
 */
UIManager.prototype.getStatusIcon = function(status) {
    var icons = {
        passed: '✓',
        failed: '✗',
        skipped: '⊘',
        running: '⟳'
    };
    
    return icons[status] || '?';
};

/**
 * Get file extension
 */
UIManager.prototype.getFileExtension = function(format) {
    var extensions = {
        html: 'html',
        json: 'json',
        csv: 'csv',
        markdown: 'md',
        junit: 'xml',
        console: 'txt'
    };
    
    return extensions[format] || 'txt';
};

/**
 * Get MIME type
 */
UIManager.prototype.getMimeType = function(format) {
    var mimeTypes = {
        html: 'text/html',
        json: 'application/json',
        csv: 'text/csv',
        markdown: 'text/markdown',
        junit: 'application/xml',
        console: 'text/plain'
    };
    
    return mimeTypes[format] || 'text/plain';
};

/**
 * Download file
 */
UIManager.prototype.downloadFile = function(content, filename, mimeType) {
    var blob = new Blob([content], { type: mimeType });
    var url = URL.createObjectURL(blob);
    
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
};

/**
 * Escape HTML
 */
UIManager.prototype.escapeHtml = function(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

/**
 * Format CSV
 */
UIManager.prototype.formatCSV = function(results) {
    var csv = 'NodeType,TestName,Status,Duration,Error\n';
    
    for (var i = 0; i < results.length; i++) {
        var result = results[i];
        var row = [
            result.nodeType || '',
            result.testName || '',
            result.status || '',
            result.duration || '',
            (result.error || '').replace(/"/g, '""')
        ];
        csv += '"' + row.join('","') + '"\n';
    }
    
    return csv;
};

/**
 * Format HTML
 */
UIManager.prototype.formatHTML = function(results) {
    var html = '<!DOCTYPE html><html><head><title>Test Results</title></head><body>';
    html += '<h1>Test Results</h1>';
    html += '<table border="1"><tr><th>Node Type</th><th>Test Name</th><th>Status</th><th>Duration</th><th>Error</th></tr>';
    
    for (var i = 0; i < results.length; i++) {
        var result = results[i];
        html += '<tr>';
        html += '<td>' + this.escapeHtml(result.nodeType || '') + '</td>';
        html += '<td>' + this.escapeHtml(result.testName || '') + '</td>';
        html += '<td>' + this.escapeHtml(result.status || '') + '</td>';
        html += '<td>' + (result.duration || '') + '</td>';
        html += '<td>' + this.escapeHtml(result.error || '') + '</td>';
        html += '</tr>';
    }
    
    html += '</table></body></html>';
    return html;
};

/**
 * Show error panel
 */
UIManager.prototype.showErrorPanel = function(errors) {
    var errorPanel = document.getElementById('error-panel');
    var errorContent = document.getElementById('error-panel-content');
    var errorCount = document.getElementById('error-count');
    
    if (!errorPanel || !errorContent || !errorCount) {
        console.warn('Error panel elements not found');
        return;
    }
    
    errorCount.textContent = errors.length;
    errorContent.innerHTML = '';
    
    for (var i = 0; i < errors.length; i++) {
        var error = errors[i];
        var errorDiv = document.createElement('div');
        errorDiv.className = 'error-item';
        errorDiv.innerHTML = 
            '<div class="error-header">' +
                '<span class="error-type">' + (error.type || 'Error') + '</span>' +
                '<span class="error-node">' + (error.nodeType || 'Unknown') + '</span>' +
            '</div>' +
            '<div class="error-message">' + this.escapeHtml(error.message || '') + '</div>';
        
        errorContent.appendChild(errorDiv);
    }
    
    errorPanel.classList.remove('hidden');
};

/**
 * Hide error panel
 */
UIManager.prototype.hideErrorPanel = function() {
    var errorPanel = document.getElementById('error-panel');
    if (errorPanel) {
        errorPanel.classList.add('hidden');
    }
};

/**
 * Show errors from results
 */
UIManager.prototype.showErrorsFromResults = function(results) {
    var errors = [];
    
    for (var i = 0; i < results.length; i++) {
        var result = results[i];
        if (result.status === 'failed') {
            errors.push({
                type: 'Test Failure',
                nodeType: result.nodeType,
                message: result.error || 'Test failed without specific error message'
            });
        }
    }
    
    if (errors.length > 0) {
        this.showErrorPanel(errors);
    }
};

// Make UIManager available globally
window.UIManager = UIManager;

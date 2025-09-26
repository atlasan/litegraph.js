/**
 * LiteGraph Editor Tester - Main Application Controller
 * Integrates the testing framework with the UI and manages user interactions
 */

// Dynamic module loading with error handling
function ModuleLoader() {
    // Constructor function for ES5 compatibility
}

ModuleLoader.loadLiteGraph = function() {
    try {
        // Access LiteGraph from global scope
        return window.LiteGraph;
    } catch (error) {
        console.error("Failed to access LiteGraph:", error);
        this.showError("LiteGraph Core", error);
        return null;
    }
};

ModuleLoader.loadNodeModules = function() {
    // Node modules are loaded via script tags in index.html
    console.log("Node modules should be loaded via script tags");
    return true;
};

ModuleLoader.loadTestModules = function() {
    try {
        // Access modules from global scope instead of importing
        var testFramework = window.testFramework;
        var TestCaseGenerator = window.TestCaseGenerator;
        var TestReporter = window.TestReporter;
        var UIManager = window.UIManager;
        var TestRunner = window.TestRunner;
        var TEST_CATEGORIES = window.TEST_CATEGORIES;
        var getAllCategories = window.getAllCategories;
        
        // Validate that all required modules are available
        var requiredModules = {
            testFramework: testFramework,
            TestCaseGenerator: TestCaseGenerator,
            TestReporter: TestReporter,
            UIManager: UIManager,
            TestRunner: TestRunner,
            TEST_CATEGORIES: TEST_CATEGORIES,
            getAllCategories: getAllCategories
        };
        
        var missingModules = [];
        for (var name in requiredModules) {
            if (!requiredModules[name]) {
                missingModules.push(name);
            }
        }
        
        if (missingModules.length > 0) {
            console.error("Missing required modules:", missingModules);
            this.showError("Test Modules", new Error("Missing modules: " + missingModules.join(", ")));
            return null;
        }
        
        return requiredModules;
    } catch (error) {
        console.error("Failed to load test modules:", error);
        this.showError("Test Modules", error);
        return null;
    }
};

ModuleLoader.showError = function(moduleName, error) {
    var errorDiv = document.createElement('div');
    errorDiv.className = 'module-error';
    errorDiv.innerHTML = 
        '<h3>Module Loading Error: ' + moduleName + '</h3>' +
        '<p>' + error.message + '</p>' +
        '<button onclick="this.parentNode.style.display=\'none\'">Dismiss</button>';
    document.body.appendChild(errorDiv);
};

// Main Application Controller
function EditorTesterApp() {
    this.modules = null;
    this.testFramework = null;
    this.testGenerator = null;
    this.testReporter = null;
    this.uiManager = null;
    this.testRunner = null;
    this.isInitialized = false;
    this.currentResults = null;
    this.selectedNodeTypes = [];
    this.testConfig = {
        timeout: 5000,
        batchSize: 10,
        validateInputs: true,
        validateOutputs: true,
        validateProperties: true,
        validateExecution: true,
        generateAutomatedTests: true,
        includeComplexScenarios: false,
        stressTestIterations: 100,
        performanceTestSamples: 50
    };
}

EditorTesterApp.prototype.initialize = function() {
    var self = this;
    
    console.log("Initializing LiteGraph Editor Tester...");
    
    // Load modules
    this.modules = ModuleLoader.loadTestModules();
    if (!this.modules) {
        console.error("Failed to load required modules");
        return false;
    }
    
    // Initialize core components
    try {
        this.testFramework = new TestFramework();
        this.testGenerator = new TestCaseGenerator();
        this.testReporter = new TestReporter();
        this.uiManager = new UIManager();
        this.testRunner = new TestRunner();
        
        console.log("Core components initialized successfully");
    } catch (error) {
        console.error("Failed to initialize core components:", error);
        return false;
    }
    
    // Setup UI
    this.setupUI();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Load available node types
    this.loadAvailableNodeTypes();
    
    // Initialize test categories
    this.initializeTestCategories();
    
    this.isInitialized = true;
    console.log("LiteGraph Editor Tester initialized successfully");
    
    return true;
};

EditorTesterApp.prototype.setupUI = function() {
    try {
        this.uiManager.initialize();
        console.log("UI initialized successfully");
    } catch (error) {
        console.error("Failed to initialize UI:", error);
    }
};

EditorTesterApp.prototype.setupEventListeners = function() {
    var self = this;
    
    // Run all tests button
    var runAllBtn = document.getElementById('runAllBtn');
    if (runAllBtn) {
        runAllBtn.addEventListener('click', function() {
            self.runAllTests();
        });
    }
    
    // Run selected tests button
    var runSelectedBtn = document.getElementById('runSelectedBtn');
    if (runSelectedBtn) {
        runSelectedBtn.addEventListener('click', function() {
            self.runSelectedTests();
        });
    }
    
    // Stop tests button
    var stopBtn = document.getElementById('stopBtn');
    if (stopBtn) {
        stopBtn.addEventListener('click', function() {
            self.stopTests();
        });
    }
    
    // Clear results button
    var clearResultsBtn = document.getElementById('clearResultsBtn');
    if (clearResultsBtn) {
        clearResultsBtn.addEventListener('click', function() {
            self.clearResults();
        });
    }
    
    // Export button
    var exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            self.showExportModal();
        });
    }
    
    // Config button
    var configBtn = document.getElementById('configBtn');
    if (configBtn) {
        configBtn.addEventListener('click', function() {
            self.showConfigModal();
        });
    }
    
    // Node filter
    var nodeFilter = document.getElementById('node-filter');
    if (nodeFilter) {
        nodeFilter.addEventListener('input', function() {
            self.filterNodes(this.value);
        });
    }
    
    // Category filter
    var categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', function() {
            self.filterByCategory(this.value);
        });
    }
};

EditorTesterApp.prototype.loadAvailableNodeTypes = function() {
    try {
        var LiteGraph = window.LiteGraph;
        if (!LiteGraph || !LiteGraph.registered_node_types) {
            console.warn("LiteGraph not available or no registered node types");
            return;
        }
        
        var nodeTypes = Object.keys(LiteGraph.registered_node_types);
        console.log("Found " + nodeTypes.length + " registered node types");
        
        this.populateNodeList(nodeTypes);
    } catch (error) {
        console.error("Failed to load node types:", error);
    }
};

EditorTesterApp.prototype.populateNodeList = function(nodeTypes) {
    var nodeList = document.getElementById('node-list');
    if (!nodeList) return;
    
    nodeList.innerHTML = '';
    
    for (var i = 0; i < nodeTypes.length; i++) {
        var nodeType = nodeTypes[i];
        var nodeItem = document.createElement('div');
        nodeItem.className = 'node-item';
        nodeItem.innerHTML = 
            '<input type="checkbox" id="node-' + i + '" value="' + nodeType + '">' +
            '<label for="node-' + i + '">' + nodeType + '</label>';
        
        nodeList.appendChild(nodeItem);
    }
    
    // Add select all functionality
    this.addSelectAllFunctionality();
};

EditorTesterApp.prototype.addSelectAllFunctionality = function() {
    var self = this;
    var selectAllBtn = document.getElementById('select-all-btn');
    var deselectAllBtn = document.getElementById('deselect-all-btn');
    
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', function() {
            self.selectAllNodes(true);
        });
    }
    
    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', function() {
            self.selectAllNodes(false);
        });
    }
};

EditorTesterApp.prototype.selectAllNodes = function(select) {
    var checkboxes = document.querySelectorAll('#node-list input[type="checkbox"]');
    for (var i = 0; i < checkboxes.length; i++) {
        checkboxes[i].checked = select;
    }
};

EditorTesterApp.prototype.initializeTestCategories = function() {
    try {
        var categories = window.getAllCategories();
        this.populateCategoryFilter(categories);
    } catch (error) {
        console.error("Failed to initialize test categories:", error);
    }
};

EditorTesterApp.prototype.populateCategoryFilter = function(categories) {
    var categoryFilter = document.getElementById('category-filter');
    if (!categoryFilter) return;
    
    // Clear existing options except "All Categories"
    var options = categoryFilter.querySelectorAll('option');
    for (var i = 1; i < options.length; i++) {
        options[i].remove();
    }
    
    // Add category options
    for (var i = 0; i < categories.length; i++) {
        var category = categories[i];
        var option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.label;
        categoryFilter.appendChild(option);
    }
};

EditorTesterApp.prototype.runAllTests = function() {
    var LiteGraph = window.LiteGraph;
    if (!LiteGraph || !LiteGraph.registered_node_types) {
        this.showError("Cannot run tests: LiteGraph not available");
        return;
    }
    
    var nodeTypes = Object.keys(LiteGraph.registered_node_types);
    this.runTests(nodeTypes);
};

EditorTesterApp.prototype.runSelectedTests = function() {
    var selectedNodeTypes = this.getSelectedNodeTypes();
    if (selectedNodeTypes.length === 0) {
        this.showError("No node types selected");
        return;
    }
    
    this.runTests(selectedNodeTypes);
};

EditorTesterApp.prototype.getSelectedNodeTypes = function() {
    var selected = [];
    var checkboxes = document.querySelectorAll('#node-list input[type="checkbox"]:checked');
    
    for (var i = 0; i < checkboxes.length; i++) {
        selected.push(checkboxes[i].value);
    }
    
    return selected;
};

EditorTesterApp.prototype.runTests = function(nodeTypes) {
    var self = this;
    
    if (!this.isInitialized) {
        this.showError("Application not initialized");
        return;
    }
    
    console.log("Running tests for " + nodeTypes.length + " node types");
    
    // Update UI state
    this.setTestingState(true);
    
    // Clear previous results
    this.clearResults();
    
    // Configure test runner
    var options = {
        timeout: this.testConfig.timeout,
        batchSize: this.testConfig.batchSize,
        validateInputs: this.testConfig.validateInputs,
        validateOutputs: this.testConfig.validateOutputs,
        validateProperties: this.testConfig.validateProperties,
        validateExecution: this.testConfig.validateExecution,
        onProgress: function(current, total, currentTest) {
            self.updateProgress(current, total, currentTest);
        },
        onTestComplete: function(result) {
            self.handleTestResult(result);
        }
    };
    
    // Generate automated tests if enabled
    if (this.testConfig.generateAutomatedTests) {
        try {
            this.testGenerator.generateAutomatedTests(nodeTypes, {
                includeComplexScenarios: this.testConfig.includeComplexScenarios,
                stressTestIterations: this.testConfig.stressTestIterations,
                performanceTestSamples: this.testConfig.performanceTestSamples
            });
        } catch (error) {
            console.error("Failed to generate automated tests:", error);
        }
    }
    
    // Run tests
    this.testRunner.runTests(nodeTypes, options)
        .then(function(results) {
            self.handleTestCompletion(results);
        })
        .catch(function(error) {
            self.handleTestError(error);
        });
};

EditorTesterApp.prototype.stopTests = function() {
    if (this.testRunner) {
        this.testRunner.stop();
    }
    this.setTestingState(false);
    console.log("Tests stopped by user");
};

EditorTesterApp.prototype.clearResults = function() {
    this.currentResults = null;
    
    // Clear UI
    var resultsContainer = document.getElementById('test-results');
    if (resultsContainer) {
        resultsContainer.innerHTML = '<p>No test results available. Run some tests to see results here.</p>';
    }
    
    // Reset stats
    this.updateStats({
        total: 0,
        passed: 0,
        failed: 0,
        coverage: 0
    });
    
    console.log("Test results cleared");
};

EditorTesterApp.prototype.setTestingState = function(isTesting) {
    var runAllBtn = document.getElementById('runAllBtn');
    var runSelectedBtn = document.getElementById('runSelectedBtn');
    var stopBtn = document.getElementById('stopBtn');
    
    if (runAllBtn) runAllBtn.disabled = isTesting;
    if (runSelectedBtn) runSelectedBtn.disabled = isTesting;
    if (stopBtn) stopBtn.disabled = !isTesting;
    
    if (isTesting) {
        this.showProgress("Initializing tests...");
    } else {
        this.hideProgress();
    }
};

EditorTesterApp.prototype.updateProgress = function(current, total, currentTest) {
    var percent = Math.round((current / total) * 100);
    this.showProgress("Testing " + currentTest + " (" + current + "/" + total + " - " + percent + "%)");
};

EditorTesterApp.prototype.showProgress = function(message) {
    var progressDiv = document.getElementById('progress-indicator');
    if (!progressDiv) {
        progressDiv = document.createElement('div');
        progressDiv.id = 'progress-indicator';
        progressDiv.className = 'progress-indicator';
        document.body.appendChild(progressDiv);
    }
    
    progressDiv.innerHTML = '<div class="progress-message">' + message + '</div>';
    progressDiv.style.display = 'block';
};

EditorTesterApp.prototype.hideProgress = function() {
    var progressDiv = document.getElementById('progress-indicator');
    if (progressDiv) {
        progressDiv.style.display = 'none';
    }
};

EditorTesterApp.prototype.handleTestResult = function(result) {
    // Update real-time stats
    this.updateTestStats(result);
    
    // Add result to UI
    this.addTestResultToUI(result);
};

EditorTesterApp.prototype.handleTestCompletion = function(results) {
    this.currentResults = results;
    this.setTestingState(false);
    
    console.log("Tests completed:", results);
    
    // Generate and display report
    this.generateReport(results);
    
    // Update final stats
    this.updateFinalStats(results);
    
    this.showSuccess("Tests completed successfully!");
};

EditorTesterApp.prototype.handleTestError = function(error) {
    this.setTestingState(false);
    console.error("Test execution failed:", error);
    this.showError("Test execution failed: " + error.message);
};

EditorTesterApp.prototype.updateTestStats = function(result) {
    // This would update running statistics
    // Implementation depends on the result format
};

EditorTesterApp.prototype.addTestResultToUI = function(result) {
    var resultsContainer = document.getElementById('test-results');
    if (!resultsContainer) return;
    
    var resultDiv = document.createElement('div');
    resultDiv.className = 'test-result ' + (result.passed ? 'passed' : 'failed');
    resultDiv.innerHTML = 
        '<h4>' + result.testName + '</h4>' +
        '<p>Status: ' + (result.passed ? 'PASSED' : 'FAILED') + '</p>' +
        '<p>Duration: ' + result.duration + 'ms</p>' +
        (result.error ? '<p class="error">Error: ' + result.error + '</p>' : '');
    
    resultsContainer.appendChild(resultDiv);
};

EditorTesterApp.prototype.generateReport = function(results) {
    try {
        var report = this.testReporter.generateReport(results, 'html');
        this.displayReport(report);
    } catch (error) {
        console.error("Failed to generate report:", error);
    }
};

EditorTesterApp.prototype.displayReport = function(report) {
    var resultsContainer = document.getElementById('test-results');
    if (resultsContainer) {
        resultsContainer.innerHTML = report;
    }
};

EditorTesterApp.prototype.updateStats = function(stats) {
    var passedCount = document.getElementById('passed-count');
    var failedCount = document.getElementById('failed-count');
    var totalCount = document.getElementById('total-count');
    var coveragePercent = document.getElementById('coverage-percent');
    
    if (passedCount) passedCount.textContent = stats.passed || 0;
    if (failedCount) failedCount.textContent = stats.failed || 0;
    if (totalCount) totalCount.textContent = stats.total || 0;
    if (coveragePercent) coveragePercent.textContent = (stats.coverage || 0) + '%';
};

EditorTesterApp.prototype.updateFinalStats = function(results) {
    var stats = this.calculateStats(results);
    this.updateStats(stats);
};

EditorTesterApp.prototype.calculateStats = function(results) {
    if (!results || !Array.isArray(results)) {
        return { total: 0, passed: 0, failed: 0, coverage: 0 };
    }
    
    var total = results.length;
    var passed = 0;
    var failed = 0;
    
    for (var i = 0; i < results.length; i++) {
        if (results[i].passed) {
            passed++;
        } else {
            failed++;
        }
    }
    
    var coverage = total > 0 ? Math.round((passed / total) * 100) : 0;
    
    return {
        total: total,
        passed: passed,
        failed: failed,
        coverage: coverage
    };
};

EditorTesterApp.prototype.filterNodes = function(filterText) {
    var nodeItems = document.querySelectorAll('.node-item');
    var filter = filterText.toLowerCase();
    
    for (var i = 0; i < nodeItems.length; i++) {
        var nodeItem = nodeItems[i];
        var label = nodeItem.querySelector('label');
        if (label) {
            var nodeType = label.textContent.toLowerCase();
            if (nodeType.includes(filter)) {
                nodeItem.style.display = 'block';
            } else {
                nodeItem.style.display = 'none';
            }
        }
    }
};

EditorTesterApp.prototype.filterByCategory = function(category) {
    // This would filter nodes by category
    // Implementation depends on how categories are mapped to node types
    console.log("Filtering by category:", category);
};

EditorTesterApp.prototype.showExportModal = function() {
    if (!this.currentResults) {
        this.showError("No test results to export");
        return;
    }
    
    // Show export modal
    this.uiManager.showExportModal(this.currentResults);
};

EditorTesterApp.prototype.showConfigModal = function() {
    // Show configuration modal
    this.uiManager.showConfigModal(this.testConfig);
};

EditorTesterApp.prototype.showError = function(message) {
    var errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = 
        '<div class="error-content">' +
        '<h3>Error</h3>' +
        '<p>' + message + '</p>' +
        '<button onclick="this.parentNode.parentNode.remove()">OK</button>' +
        '</div>';
    document.body.appendChild(errorDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(function() {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
};

EditorTesterApp.prototype.showSuccess = function(message) {
    var successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = 
        '<div class="success-content">' +
        '<h3>Success</h3>' +
        '<p>' + message + '</p>' +
        '<button onclick="this.parentNode.parentNode.remove()">OK</button>' +
        '</div>';
    document.body.appendChild(successDiv);
    
    // Auto-remove after 3 seconds
    setTimeout(function() {
        if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
        }
    }, 3000);
};

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    var app = new EditorTesterApp();
    
    // Make app globally available for debugging
    window.editorTesterApp = app;
    
    // Initialize the application
    if (app.initialize()) {
        console.log("LiteGraph Editor Tester is ready!");
    } else {
        console.error("Failed to initialize LiteGraph Editor Tester");
    }
});

// Export for global access
window.EditorTesterApp = EditorTesterApp;
window.ModuleLoader = ModuleLoader;
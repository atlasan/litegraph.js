/**
 * Test Configuration Manager
 * Handles all test configuration settings and preferences
 */

/**
 * TestConfig constructor
 */
function TestConfig() {
    this.config = {};
    this.listeners = new Map();
    this.storageKey = 'litegraph_test_config';
    this.init();
}

/**
 * Initialize configuration
 */
TestConfig.prototype.init = function() {
    this.loadFromStorage();
    if (Object.keys(this.config).length === 0) {
        this.config = this.getDefaultConfig();
        this.saveToStorage();
    }
};

/**
 * Get default configuration
 */
TestConfig.prototype.getDefaultConfig = function() {
    return {
        execution: {
            timeout: 5000,
            maxConcurrent: 5,
            retryCount: 2,
            retryDelay: 1000,
            stopOnFirstFailure: false,
            randomizeOrder: false,
            enableProfiling: true,
            enableMemoryTracking: true
        },
        
        testTypes: {
            basic: true,
            inputValidation: true,
            outputValidation: true,
            performance: false,
            stress: false,
            errorHandling: true,
            stateManagement: false,
            integration: false
        },
        
        nodeSelection: {
            selectedNodes: [],
            excludedNodes: [],
            includeCategories: [],
            excludeCategories: [],
            nodeTypeFilter: '',
            onlyRegisteredNodes: true
        },
        
        performance: {
            maxExecutionTime: 1000,
            maxMemoryUsage: 1024 * 1024 * 10,
            enableBenchmarking: false,
            benchmarkIterations: 100,
            warmupIterations: 10
        },
        
        validation: {
            strictTypeChecking: false,
            validateConnections: true,
            validateProperties: true,
            allowUndefinedOutputs: false,
            checkOutputTypes: true
        },
        
        reporting: {
            format: 'html',
            includeDetails: true,
            includeCharts: true,
            exportPath: '',
            autoExport: false,
            theme: 'auto'
        }
    };
};

/**
 * Get complete configuration
 */
TestConfig.prototype.get = function() {
    return JSON.parse(JSON.stringify(this.config));
};

/**
 * Set configuration value by path
 */
TestConfig.prototype.set = function(path, value) {
    var keys = path.split('.');
    var current = this.config;
    
    for (var i = 0; i < keys.length - 1; i++) {
        var key = keys[i];
        if (!current[key] || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }
    
    var oldValue = current[keys[keys.length - 1]];
    current[keys[keys.length - 1]] = value;
    
    this.saveToStorage();
    this.emit('configChanged', { path: path, value: value, oldValue: oldValue });
    
    return this;
};

/**
 * Get configuration value
 */
TestConfig.prototype.getValue = function(path, defaultValue) {
    var keys = path.split('.');
    var current = this.config;
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (current === null || current === undefined || !current.hasOwnProperty(key)) {
            return defaultValue;
        }
        current = current[key];
    }
    
    return current;
};

/**
 * Update multiple configuration values
 */
TestConfig.prototype.update = function(updates) {
    var changes = [];
    
    for (var path in updates) {
        if (updates.hasOwnProperty(path)) {
            var value = updates[path];
            var oldValue = this.getValue(path);
            this.set(path, value);
            changes.push({ path: path, value: value, oldValue: oldValue });
        }
    }
    
    this.emit('configUpdated', { changes: changes });
    return this;
};

/**
 * Reset configuration to defaults
 */
TestConfig.prototype.reset = function() {
    var oldConfig = this.get();
    this.config = this.getDefaultConfig();
    this.saveToStorage();
    this.emit('configReset', { oldConfig: oldConfig, newConfig: this.config });
    return this;
};

/**
 * Reset specific section to defaults
 */
TestConfig.prototype.resetSection = function(section) {
    var defaultConfig = this.getDefaultConfig();
    if (defaultConfig[section]) {
        var oldValue = this.config[section];
        this.config[section] = defaultConfig[section];
        this.saveToStorage();
        this.emit('sectionReset', { section: section, oldValue: oldValue, newValue: this.config[section] });
    }
    return this;
};

/**
 * Validate configuration
 */
TestConfig.prototype.validate = function() {
    var errors = [];
    var warnings = [];
    
    // Validate execution settings
    if (this.config.execution.timeout <= 0) {
        errors.push('Execution timeout must be greater than 0');
    }
    
    if (this.config.execution.maxConcurrent <= 0) {
        errors.push('Max concurrent tests must be greater than 0');
    }
    
    if (this.config.execution.retryCount < 0) {
        errors.push('Retry count cannot be negative');
    }
    
    if (this.config.execution.retryDelay < 0) {
        errors.push('Retry delay cannot be negative');
    }
    
    // Validate performance settings
    if (this.config.performance.maxExecutionTime <= 0) {
        warnings.push('Max execution time should be greater than 0');
    }
    
    if (this.config.performance.maxMemoryUsage <= 0) {
        warnings.push('Max memory usage should be greater than 0');
    }
    
    if (this.config.performance.benchmarkIterations <= 0) {
        warnings.push('Benchmark iterations should be greater than 0');
    }
    
    // Validate node selection
    if (this.config.nodeSelection.selectedNodes.length === 0 && 
        this.config.nodeSelection.includeCategories.length === 0 &&
        !this.config.nodeSelection.nodeTypeFilter) {
        warnings.push('No nodes selected for testing');
    }
    
    // Validate test types
    var testTypes = Object.keys(this.config.testTypes);
    var hasEnabledType = false;
    for (var i = 0; i < testTypes.length; i++) {
        if (this.config.testTypes[testTypes[i]]) {
            hasEnabledType = true;
            break;
        }
    }
    if (!hasEnabledType) {
        errors.push('At least one test type must be enabled');
    }
    
    return { errors: errors, warnings: warnings, isValid: errors.length === 0 };
};

/**
 * Export configuration
 */
TestConfig.prototype.export = function() {
    return {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        config: this.get()
    };
};

/**
 * Import configuration
 */
TestConfig.prototype.import = function(data) {
    try {
        if (typeof data === 'string') {
            data = JSON.parse(data);
        }
        
        if (!data.config) {
            throw new Error('Invalid configuration format');
        }
        
        // Validate imported config structure
        var defaultConfig = this.getDefaultConfig();
        var importedConfig = this.mergeConfigs(defaultConfig, data.config);
        
        var oldConfig = this.get();
        this.config = importedConfig;
        this.saveToStorage();
        
        this.emit('configImported', { oldConfig: oldConfig, newConfig: this.config, source: data });
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Merge configurations
 */
TestConfig.prototype.mergeConfigs = function(target, source) {
    var result = {};
    
    // Copy target properties
    for (var key in target) {
        if (target.hasOwnProperty(key)) {
            result[key] = target[key];
        }
    }
    
    // Merge source properties
    for (var key in source) {
        if (source.hasOwnProperty(key)) {
            var value = source[key];
            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                result[key] = this.mergeConfigs(target[key] || {}, value);
            } else {
                result[key] = value;
            }
        }
    }
    
    return result;
};

/**
 * Save configuration to localStorage
 */
TestConfig.prototype.saveToStorage = function() {
    try {
        localStorage.setItem('litegraph_test_config', JSON.stringify(this.config));
    } catch (error) {
        console.warn('Failed to save configuration:', error);
    }
};

/**
 * Load configuration from localStorage
 */
TestConfig.prototype.loadFromStorage = function() {
    try {
        var stored = localStorage.getItem('litegraph_test_config');
        if (stored) {
            var loadedConfig = JSON.parse(stored);
            this.config = this.mergeConfigs(this.getDefaultConfig(), loadedConfig);
        }
    } catch (error) {
        console.warn('Failed to load configuration:', error);
        this.config = this.getDefaultConfig();
    }
};

/**
 * Add event listener
 */
TestConfig.prototype.on = function(event, callback) {
    if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return this;
};

/**
 * Remove event listener
 */
TestConfig.prototype.off = function(event, callback) {
    if (this.listeners.has(event)) {
        var callbacks = this.listeners.get(event);
        var index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }
    return this;
};

/**
 * Emit event
 */
TestConfig.prototype.emit = function(event, data) {
    if (this.listeners.has(event)) {
        var callbacks = this.listeners.get(event);
        for (var i = 0; i < callbacks.length; i++) {
            try {
                callbacks[i](data);
            } catch (error) {
                console.error('Error in event listener for \'' + event + '\':', error);
            }
        }
    }
};

// Create singleton instance and make it globally available
var testConfig = new TestConfig();
window.TestConfig = testConfig;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TestConfig;
}
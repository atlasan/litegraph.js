/**
 * Test Configuration Manager
 * Handles test settings, node selection, and execution parameters
 */

export class TestConfig {
    constructor() {
        this.config = this.getDefaultConfig();
        this.listeners = new Map();
        this.loadFromStorage();
    }

    /**
     * Get default configuration
     */
    getDefaultConfig() {
        return {
            // Execution settings
            execution: {
                timeout: 5000,
                maxConcurrent: 5,
                retryCount: 0,
                retryDelay: 1000,
                stopOnFirstFailure: false,
                randomizeOrder: false,
                enableProfiling: true,
                enableMemoryTracking: true
            },

            // Node selection
            nodeSelection: {
                selectedNodes: [],
                excludedNodes: [],
                includeCategories: [],
                excludeCategories: [],
                nodeTypeFilter: '',
                onlyRegisteredNodes: true
            },

            // Test types
            testTypes: {
                basic: true,
                inputValidation: true,
                outputValidation: true,
                performance: false,
                stress: false,
                errorHandling: true,
                stateManagement: true,
                integration: false
            },

            // Performance settings
            performance: {
                maxExecutionTime: 1000,
                maxMemoryUsage: 50 * 1024 * 1024, // 50MB
                // TODO: Implement benchmarking functionality
                // enableBenchmarking: false,
                // benchmarkIterations: 100,
                // warmupIterations: 10
            },

            // Validation settings
            validation: {
                strictTypeChecking: true,
                validateConnections: true,
                validateProperties: true,
                allowUndefinedOutputs: false,
                checkOutputTypes: true
            },

            // Reporting settings
            reporting: {
                format: 'html',
                includeDetails: true,
                includeCharts: true,
                exportPath: '',
                autoExport: false,
                theme: 'light'
            },

            // UI settings
            ui: {
                autoScroll: true,
                showProgress: true,
                highlightFailures: true,
                expandFailedTests: true,
                showMemoryUsage: true,
                showExecutionTime: true
            },

            // Advanced settings
            advanced: {
                // TODO: Implement debug mode functionality
                // enableDebugMode: false,
                logLevel: 'info',
                // TODO: Implement node state preservation
                // preserveNodeState: false,
                // TODO: Implement coverage tracking
                // enableCoverage: false,
                // TODO: Implement dependency mocking
                // mockExternalDependencies: true,
                // TODO: Implement test isolation
                // isolateTests: true
            }
        };
    }

    /**
     * Get current configuration
     */
    get() {
        return JSON.parse(JSON.stringify(this.config));
    }

    /**
     * Set configuration value
     */
    set(path, value) {
        const keys = path.split('.');
        let current = this.config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        const oldValue = current[keys[keys.length - 1]];
        current[keys[keys.length - 1]] = value;
        
        this.saveToStorage();
        this.emit('configChanged', { path, value, oldValue });
        
        return this;
    }

    /**
     * Get configuration value
     */
    getValue(path, defaultValue = undefined) {
        const keys = path.split('.');
        let current = this.config;
        
        for (const key of keys) {
            if (current === null || current === undefined || !current.hasOwnProperty(key)) {
                return defaultValue;
            }
            current = current[key];
        }
        
        return current;
    }

    /**
     * Update multiple configuration values
     */
    update(updates) {
        const changes = [];
        
        for (const [path, value] of Object.entries(updates)) {
            const oldValue = this.getValue(path);
            this.set(path, value);
            changes.push({ path, value, oldValue });
        }
        
        this.emit('configUpdated', { changes });
        return this;
    }

    /**
     * Reset configuration to defaults
     */
    reset() {
        const oldConfig = this.get();
        this.config = this.getDefaultConfig();
        this.saveToStorage();
        this.emit('configReset', { oldConfig, newConfig: this.config });
        return this;
    }

    /**
     * Reset specific section to defaults
     */
    resetSection(section) {
        const defaultConfig = this.getDefaultConfig();
        if (defaultConfig[section]) {
            const oldValue = this.config[section];
            this.config[section] = defaultConfig[section];
            this.saveToStorage();
            this.emit('sectionReset', { section, oldValue, newValue: this.config[section] });
        }
        return this;
    }

    /**
     * Validate configuration
     */
    validate() {
        const errors = [];
        const warnings = [];
        
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
        const testTypes = Object.values(this.config.testTypes);
        if (!testTypes.some(enabled => enabled)) {
            errors.push('At least one test type must be enabled');
        }
        
        return { errors, warnings, isValid: errors.length === 0 };
    }

    /**
     * Get node selection criteria
     */
    getNodeSelectionCriteria() {
        return {
            selectedNodes: [...this.config.nodeSelection.selectedNodes],
            excludedNodes: [...this.config.nodeSelection.excludedNodes],
            includeCategories: [...this.config.nodeSelection.includeCategories],
            excludeCategories: [...this.config.nodeSelection.excludeCategories],
            nodeTypeFilter: this.config.nodeSelection.nodeTypeFilter,
            onlyRegisteredNodes: this.config.nodeSelection.onlyRegisteredNodes
        };
    }

    /**
     * Set node selection
     */
    setNodeSelection(criteria) {
        const updates = {};
        
        if (criteria.selectedNodes !== undefined) {
            updates['nodeSelection.selectedNodes'] = criteria.selectedNodes;
        }
        
        if (criteria.excludedNodes !== undefined) {
            updates['nodeSelection.excludedNodes'] = criteria.excludedNodes;
        }
        
        if (criteria.includeCategories !== undefined) {
            updates['nodeSelection.includeCategories'] = criteria.includeCategories;
        }
        
        if (criteria.excludeCategories !== undefined) {
            updates['nodeSelection.excludeCategories'] = criteria.excludeCategories;
        }
        
        if (criteria.nodeTypeFilter !== undefined) {
            updates['nodeSelection.nodeTypeFilter'] = criteria.nodeTypeFilter;
        }
        
        if (criteria.onlyRegisteredNodes !== undefined) {
            updates['nodeSelection.onlyRegisteredNodes'] = criteria.onlyRegisteredNodes;
        }
        
        this.update(updates);
        return this;
    }

    /**
     * Get enabled test types
     */
    getEnabledTestTypes() {
        const enabled = [];
        for (const [type, isEnabled] of Object.entries(this.config.testTypes)) {
            if (isEnabled) {
                enabled.push(type);
            }
        }
        return enabled;
    }

    /**
     * Set test type enablement
     */
    setTestTypes(testTypes) {
        const updates = {};
        for (const [type, enabled] of Object.entries(testTypes)) {
            updates[`testTypes.${type}`] = enabled;
        }
        this.update(updates);
        return this;
    }

    /**
     * Get execution settings
     */
    getExecutionSettings() {
        return { ...this.config.execution };
    }

    /**
     * Set execution settings
     */
    setExecutionSettings(settings) {
        const updates = {};
        for (const [key, value] of Object.entries(settings)) {
            updates[`execution.${key}`] = value;
        }
        this.update(updates);
        return this;
    }

    /**
     * Get performance settings
     */
    getPerformanceSettings() {
        return { ...this.config.performance };
    }

    /**
     * Set performance settings
     */
    setPerformanceSettings(settings) {
        const updates = {};
        for (const [key, value] of Object.entries(settings)) {
            updates[`performance.${key}`] = value;
        }
        this.update(updates);
        return this;
    }

    /**
     * Get validation settings
     */
    getValidationSettings() {
        return { ...this.config.validation };
    }

    /**
     * Set validation settings
     */
    setValidationSettings(settings) {
        const updates = {};
        for (const [key, value] of Object.entries(settings)) {
            updates[`validation.${key}`] = value;
        }
        this.update(updates);
        return this;
    }

    /**
     * Get reporting settings
     */
    getReportingSettings() {
        return { ...this.config.reporting };
    }

    /**
     * Set reporting settings
     */
    setReportingSettings(settings) {
        const updates = {};
        for (const [key, value] of Object.entries(settings)) {
            updates[`reporting.${key}`] = value;
        }
        this.update(updates);
        return this;
    }

    /**
     * Export configuration
     */
    export() {
        return {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            config: this.get()
        };
    }

    /**
     * Import configuration
     */
    import(data) {
        try {
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }
            
            if (!data.config) {
                throw new Error('Invalid configuration format');
            }
            
            // Validate imported config structure
            const defaultConfig = this.getDefaultConfig();
            const importedConfig = this.mergeConfigs(defaultConfig, data.config);
            
            const oldConfig = this.get();
            this.config = importedConfig;
            this.saveToStorage();
            
            this.emit('configImported', { oldConfig, newConfig: this.config, source: data });
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Merge configurations
     */
    mergeConfigs(target, source) {
        const result = { ...target };
        
        for (const [key, value] of Object.entries(source)) {
            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                result[key] = this.mergeConfigs(target[key] || {}, value);
            } else {
                result[key] = value;
            }
        }
        
        return result;
    }

    /**
     * Create preset configuration
     */
    createPreset(name, description = '') {
        const preset = {
            name,
            description,
            timestamp: new Date().toISOString(),
            config: this.get()
        };
        
        const presets = this.getPresets();
        presets[name] = preset;
        localStorage.setItem('litegraph_test_presets', JSON.stringify(presets));
        
        this.emit('presetCreated', { preset });
        return preset;
    }

    /**
     * Load preset configuration
     */
    loadPreset(name) {
        const presets = this.getPresets();
        const preset = presets[name];
        
        if (!preset) {
            throw new Error(`Preset '${name}' not found`);
        }
        
        const oldConfig = this.get();
        this.config = preset.config;
        this.saveToStorage();
        
        this.emit('presetLoaded', { preset, oldConfig, newConfig: this.config });
        return preset;
    }

    /**
     * Delete preset
     */
    deletePreset(name) {
        const presets = this.getPresets();
        const preset = presets[name];
        
        if (preset) {
            delete presets[name];
            localStorage.setItem('litegraph_test_presets', JSON.stringify(presets));
            this.emit('presetDeleted', { preset });
            return true;
        }
        
        return false;
    }

    /**
     * Get all presets
     */
    getPresets() {
        try {
            const stored = localStorage.getItem('litegraph_test_presets');
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.warn('Failed to load presets:', error);
            return {};
        }
    }

    /**
     * Get preset names
     */
    getPresetNames() {
        return Object.keys(this.getPresets());
    }

    /**
     * Save configuration to localStorage
     */
    saveToStorage() {
        try {
            localStorage.setItem('litegraph_test_config', JSON.stringify(this.config));
        } catch (error) {
            console.warn('Failed to save configuration:', error);
        }
    }

    /**
     * Load configuration from localStorage
     */
    loadFromStorage() {
        try {
            const stored = localStorage.getItem('litegraph_test_config');
            if (stored) {
                const loadedConfig = JSON.parse(stored);
                this.config = this.mergeConfigs(this.getDefaultConfig(), loadedConfig);
            }
        } catch (error) {
            console.warn('Failed to load configuration:', error);
            this.config = this.getDefaultConfig();
        }
    }

    /**
     * Add event listener
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        return this;
    }

    /**
     * Remove event listener
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
        return this;
    }

    /**
     * Emit event
     */
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
     * Get configuration schema for UI generation
     */
    getSchema() {
        return {
            execution: {
                title: 'Execution Settings',
                description: 'Control how tests are executed',
                properties: {
                    timeout: {
                        type: 'number',
                        title: 'Timeout (ms)',
                        description: 'Maximum time to wait for each test',
                        min: 100,
                        max: 60000,
                        step: 100
                    },
                    maxConcurrent: {
                        type: 'number',
                        title: 'Max Concurrent Tests',
                        description: 'Maximum number of tests to run simultaneously',
                        min: 1,
                        max: 20
                    },
                    retryCount: {
                        type: 'number',
                        title: 'Retry Count',
                        description: 'Number of times to retry failed tests',
                        min: 0,
                        max: 5
                    },
                    retryDelay: {
                        type: 'number',
                        title: 'Retry Delay (ms)',
                        description: 'Delay between retry attempts',
                        min: 0,
                        max: 10000,
                        step: 100
                    },
                    stopOnFirstFailure: {
                        type: 'boolean',
                        title: 'Stop on First Failure',
                        description: 'Stop test execution when first test fails'
                    },
                    randomizeOrder: {
                        type: 'boolean',
                        title: 'Randomize Order',
                        description: 'Run tests in random order'
                    },
                    enableProfiling: {
                        type: 'boolean',
                        title: 'Enable Profiling',
                        description: 'Collect performance profiling data'
                    },
                    enableMemoryTracking: {
                        type: 'boolean',
                        title: 'Enable Memory Tracking',
                        description: 'Monitor memory usage during tests'
                    }
                }
            },
            
            testTypes: {
                title: 'Test Types',
                description: 'Select which types of tests to run',
                properties: {
                    basic: {
                        type: 'boolean',
                        title: 'Basic Functionality',
                        description: 'Test basic node operations'
                    },
                    inputValidation: {
                        type: 'boolean',
                        title: 'Input Validation',
                        description: 'Test input parameter validation'
                    },
                    outputValidation: {
                        type: 'boolean',
                        title: 'Output Validation',
                        description: 'Test output value validation'
                    },
                    performance: {
                        type: 'boolean',
                        title: 'Performance Tests',
                        description: 'Test execution performance'
                    },
                    stress: {
                        type: 'boolean',
                        title: 'Stress Tests',
                        description: 'Test with high load conditions'
                    },
                    errorHandling: {
                        type: 'boolean',
                        title: 'Error Handling',
                        description: 'Test error handling and recovery'
                    },
                    stateManagement: {
                        type: 'boolean',
                        title: 'State Management',
                        description: 'Test node state management'
                    },
                    integration: {
                        type: 'boolean',
                        title: 'Integration Tests',
                        description: 'Test node interactions and workflows'
                    }
                }
            },
            
            performance: {
                title: 'Performance Settings',
                description: 'Configure performance testing parameters',
                properties: {
                    maxExecutionTime: {
                        type: 'number',
                        title: 'Max Execution Time (ms)',
                        description: 'Maximum allowed execution time per test',
                        min: 10,
                        max: 10000,
                        step: 10
                    },
                    maxMemoryUsage: {
                        type: 'number',
                        title: 'Max Memory Usage (bytes)',
                        description: 'Maximum allowed memory usage per test',
                        min: 1024,
                        max: 1024 * 1024 * 1024
                    },
                    enableBenchmarking: {
                        type: 'boolean',
                        title: 'Enable Benchmarking',
                        description: 'Run performance benchmarks'
                    },
                    benchmarkIterations: {
                        type: 'number',
                        title: 'Benchmark Iterations',
                        description: 'Number of iterations for benchmarks',
                        min: 1,
                        max: 1000
                    },
                    warmupIterations: {
                        type: 'number',
                        title: 'Warmup Iterations',
                        description: 'Number of warmup iterations before benchmarking',
                        min: 0,
                        max: 100
                    }
                }
            },
            
            validation: {
                title: 'Validation Settings',
                description: 'Configure test validation behavior',
                properties: {
                    strictTypeChecking: {
                        type: 'boolean',
                        title: 'Strict Type Checking',
                        description: 'Enforce strict type validation'
                    },
                    validateConnections: {
                        type: 'boolean',
                        title: 'Validate Connections',
                        description: 'Validate node connections'
                    },
                    validateProperties: {
                        type: 'boolean',
                        title: 'Validate Properties',
                        description: 'Validate node properties'
                    },
                    allowUndefinedOutputs: {
                        type: 'boolean',
                        title: 'Allow Undefined Outputs',
                        description: 'Allow nodes to produce undefined outputs'
                    },
                    checkOutputTypes: {
                        type: 'boolean',
                        title: 'Check Output Types',
                        description: 'Validate output data types'
                    }
                }
            },
            
            reporting: {
                title: 'Reporting Settings',
                description: 'Configure test result reporting',
                properties: {
                    format: {
                        type: 'select',
                        title: 'Report Format',
                        description: 'Default format for test reports',
                        options: [
                            { value: 'console', label: 'Console' },
                            { value: 'html', label: 'HTML' },
                            { value: 'json', label: 'JSON' },
                            { value: 'csv', label: 'CSV' },
                            { value: 'markdown', label: 'Markdown' },
                            { value: 'junit', label: 'JUnit XML' }
                        ]
                    },
                    includeDetails: {
                        type: 'boolean',
                        title: 'Include Details',
                        description: 'Include detailed test information in reports'
                    },
                    includeCharts: {
                        type: 'boolean',
                        title: 'Include Charts',
                        description: 'Include visual charts in HTML reports'
                    },
                    autoExport: {
                        type: 'boolean',
                        title: 'Auto Export',
                        description: 'Automatically export reports after test completion'
                    },
                    theme: {
                        type: 'select',
                        title: 'Report Theme',
                        description: 'Visual theme for HTML reports',
                        options: [
                            { value: 'light', label: 'Light' },
                            { value: 'dark', label: 'Dark' }
                        ]
                    }
                }
            }
        };
    }
}

// Create singleton instance
const testConfig = new TestConfig();
export default testConfig;
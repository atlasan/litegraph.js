# LiteGraph Editor Testing Framework

A comprehensive testing framework for LiteGraph node editor applications, providing automated test generation, complex scenario testing, performance monitoring, and detailed reporting.

## Features

### 🚀 Core Testing Capabilities
- **Automated Test Generation**: Automatically generate tests for all registered node types
- **Complex Scenario Testing**: Test multi-node workflows, circular dependencies, and async operations
- **Performance Monitoring**: Track execution times, memory usage, and performance bottlenecks
- **Comprehensive Reporting**: Generate detailed HTML, JSON, CSV, and console reports with interactive charts

### 🎯 Advanced Testing Scenarios
- Multi-node workflow testing with various patterns (linear, fan-out, fan-in, diamond, tree, mesh)
- Circular dependency detection and handling
- Dynamic node creation and destruction
- Asynchronous workflow execution
- Error propagation testing
- Memory leak detection
- State synchronization validation

### 📊 Rich Reporting & Visualization
- Interactive HTML reports with Chart.js visualizations
- Performance timeline charts
- Error frequency analysis
- Node type performance comparison
- Duration distribution histograms
- Export capabilities (PNG, PDF, CSV)

## Quick Start

### Basic Usage

```javascript
import { TestFramework } from './js/test-framework.js';

// Initialize the testing framework
const testFramework = new TestFramework({
    timeout: 10000,
    enableMemoryTracking: true,
    enablePerformanceTracking: true
});

// Generate automated tests for all registered nodes
const generatedTests = testFramework.generateAutomatedTests({
    includeComplexScenarios: true,
    complexityLevel: 'medium',
    maxNodesPerScenario: 5
});

// Run all tests
const results = await testFramework.runTests();

// Generate HTML report
const htmlReport = testFramework.generateReport('html', {
    includeCharts: true,
    theme: 'light'
});

console.log(`Tests completed: ${results.length} tests run`);
```

### Manual Test Registration

```javascript
// Register a custom test
testFramework.registerTest('MyCustomNode', {
    name: 'Custom Node Validation Test',
    description: 'Validates custom node behavior',
    category: 'validation',
    priority: 'high',
    timeout: 5000,
    
    execute: async (node, graph) => {
        // Test setup
        node.setProperty('testValue', 42);
        
        // Execute node
        node.onExecute();
        
        // Validate results
        const output = node.getOutputData(0);
        if (output !== 84) {
            throw new Error(`Expected 84, got ${output}`);
        }
        
        return { success: true, output };
    },
    
    validate: (result) => {
        return {
            passed: result.success && result.output === 84,
            issues: result.success ? [] : ['Output validation failed']
        };
    }
});
```

### Complex Scenario Testing

```javascript
import { ComplexScenarioGenerator } from './js/complex-scenario-generator.js';

const complexGenerator = new ComplexScenarioGenerator();

// Generate complex scenarios
const scenarios = complexGenerator.generateComplexScenarios(
    ['MathNode', 'InputNode', 'OutputNode'], 
    {
        maxNodes: 8,
        complexityLevel: 'high',
        includeAsyncScenarios: true,
        includeErrorScenarios: true
    }
);

console.log(`Generated ${scenarios.length} complex scenarios`);
```

## Configuration Options

### TestFramework Configuration

```javascript
const config = {
    // Basic settings
    timeout: 10000,                    // Default test timeout (ms)
    maxConcurrentTests: 4,             // Max parallel test execution
    memoryThreshold: 100 * 1024 * 1024, // Memory threshold (bytes)
    
    // Feature toggles
    enableMemoryTracking: true,        // Track memory usage
    enablePerformanceTracking: true,   // Track performance metrics
    retryFailedTests: true,            // Retry failed tests
    maxRetries: 2,                     // Max retry attempts
    
    // Object pooling (performance optimization)
    objectPooling: {
        enabled: true,
        maxPoolSize: 100,
        cleanupInterval: 30000
    },
    
    // Reporting configuration
    reporting: {
        enableConsole: true,
        enableHTML: true,
        enableJSON: true,
        outputDirectory: './test-reports'
    }
};
```

### Test Generation Options

```javascript
const generationOptions = {
    // Complex scenario settings
    includeComplexScenarios: true,
    maxNodesPerScenario: 10,
    maxConnectionsPerScenario: 20,
    
    // Scenario types
    includeAsyncScenarios: true,
    includeErrorScenarios: true,
    complexityLevel: 'medium', // 'low', 'medium', 'high'
    
    // Node filtering
    skipInternal: true,        // Skip internal node types
    includeOnly: ['MathNode', 'LogicNode'], // Test only these types
    exclude: ['DeprecatedNode'] // Exclude these types
};
```

## Test Runner Options

```javascript
const runnerOptions = {
    // Execution settings
    parallel: true,
    maxConcurrency: 4,
    stopOnFirstFailure: false,
    timeout: 15000,
    
    // Retry settings
    retryFailedTests: true,
    maxRetries: 2,
    
    // Filtering
    categories: ['basic', 'validation'],
    priorities: ['high', 'critical'],
    nodeTypes: ['MathNode'],
    tags: ['regression'],
    
    // Progress callbacks
    onProgress: (current, total, testName) => {
        console.log(`Progress: ${current}/${total} - ${testName}`);
    },
    
    onTestComplete: (result) => {
        if (result.status === 'failed') {
            console.error(`Test failed: ${result.testName}`);
        }
    }
};
```

## Report Formats

### HTML Report (Interactive)

```javascript
const htmlReport = testFramework.generateReport('html', {
    includeCharts: true,
    theme: 'light', // 'light' or 'dark'
    showErrorDetails: true,
    enableFiltering: true,
    enableExport: true
});

// Save to file
fs.writeFileSync('./reports/test-report.html', htmlReport);
```

### JSON Report (Machine Readable)

```javascript
const jsonReport = testFramework.generateReport('json', {
    includeRawResults: true,
    includeStats: true,
    includeChartData: true
});

const reportData = JSON.parse(jsonReport);
console.log(`Success rate: ${reportData.stats.successRate}%`);
```

### Console Report (Development)

```javascript
const consoleReport = testFramework.generateReport('console', {
    colorize: true,
    showDetails: true,
    groupByCategory: true
});

console.log(consoleReport);
```

## Advanced Usage

### Custom Test Templates

```javascript
import { TestCaseGenerator } from './js/test-generator.js';

const generator = new TestCaseGenerator();

// Register custom template
generator.registerTemplate({
    name: 'Performance Stress Test',
    description: 'Tests node performance under stress',
    category: 'performance',
    priority: 'medium',
    
    generate: (nodeType, options) => {
        return [{
            name: `${nodeType} - Stress Test`,
            description: `Performance stress test for ${nodeType}`,
            category: 'performance',
            priority: 'medium',
            timeout: 30000,
            
            execute: async (node, graph) => {
                const iterations = 1000;
                const startTime = performance.now();
                
                for (let i = 0; i < iterations; i++) {
                    if (node.onExecute) {
                        node.onExecute();
                    }
                }
                
                const endTime = performance.now();
                const avgTime = (endTime - startTime) / iterations;
                
                return {
                    iterations,
                    totalTime: endTime - startTime,
                    averageTime: avgTime,
                    performance: avgTime < 1 ? 'excellent' : 
                                avgTime < 5 ? 'good' : 'poor'
                };
            }
        }];
    }
});
```

### Custom Report Formatters

```javascript
import { TestReporter } from './js/test-reporter.js';

const reporter = new TestReporter();

// Register custom formatter
reporter.registerFormatter({
    name: 'slack',
    description: 'Slack notification format',
    
    format: (results, stats, options) => {
        const emoji = stats.successRate > 90 ? '✅' : 
                     stats.successRate > 70 ? '⚠️' : '❌';
        
        return JSON.stringify({
            text: `${emoji} Test Results`,
            blocks: [{
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Test Summary*\n` +
                          `• Total: ${stats.total}\n` +
                          `• Passed: ${stats.passed}\n` +
                          `• Failed: ${stats.failed}\n` +
                          `• Success Rate: ${stats.successRate.toFixed(1)}%`
                }
            }]
        });
    }
});
```

### Memory and Performance Monitoring

```javascript
// Enable detailed monitoring
const framework = new TestFramework({
    enableMemoryTracking: true,
    enablePerformanceTracking: true,
    memoryThreshold: 50 * 1024 * 1024 // 50MB
});

// Run tests with monitoring
const results = await framework.runTests(null, {
    onTestComplete: (result) => {
        if (result.memoryUsage) {
            const memoryDelta = result.memoryUsage.after - result.memoryUsage.before;
            if (memoryDelta > 1024 * 1024) { // 1MB
                console.warn(`High memory usage in ${result.testName}: ${memoryDelta} bytes`);
            }
        }
        
        if (result.duration > 5000) { // 5 seconds
            console.warn(`Slow test detected: ${result.testName} took ${result.duration}ms`);
        }
    }
});
```

## Integration Examples

### CI/CD Integration

```javascript
// ci-test-runner.js
import { TestFramework } from './js/test-framework.js';

async function runCITests() {
    const framework = new TestFramework({
        timeout: 30000,
        enableMemoryTracking: true,
        retryFailedTests: true,
        maxRetries: 1
    });
    
    // Generate all tests
    framework.generateAutomatedTests({
        includeComplexScenarios: true,
        complexityLevel: 'medium'
    });
    
    // Run tests
    const results = await framework.runTests(null, {
        stopOnFirstFailure: false,
        parallel: true,
        maxConcurrency: 2
    });
    
    // Generate reports
    const jsonReport = framework.generateReport('json');
    const htmlReport = framework.generateReport('html');
    
    // Save reports
    fs.writeFileSync('./ci-reports/results.json', jsonReport);
    fs.writeFileSync('./ci-reports/report.html', htmlReport);
    
    // Exit with appropriate code
    const stats = framework.getStats();
    process.exit(stats.failed > 0 ? 1 : 0);
}

runCITests().catch(console.error);
```

### Web Integration

```html
<!DOCTYPE html>
<html>
<head>
    <title>LiteGraph Testing Dashboard</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div id="test-dashboard">
        <div id="controls">
            <button id="run-tests">Run Tests</button>
            <button id="generate-tests">Generate Tests</button>
            <select id="complexity-level">
                <option value="low">Low Complexity</option>
                <option value="medium" selected>Medium Complexity</option>
                <option value="high">High Complexity</option>
            </select>
        </div>
        
        <div id="progress">
            <div id="progress-bar"></div>
            <div id="progress-text">Ready</div>
        </div>
        
        <div id="results"></div>
    </div>
    
    <script type="module">
        import { TestFramework } from './js/test-framework.js';
        
        const framework = new TestFramework();
        
        document.getElementById('run-tests').addEventListener('click', async () => {
            const complexity = document.getElementById('complexity-level').value;
            
            // Generate tests
            framework.generateAutomatedTests({
                includeComplexScenarios: true,
                complexityLevel: complexity
            });
            
            // Run tests with progress updates
            const results = await framework.runTests(null, {
                onProgress: (current, total, testName) => {
                    const percent = (current / total) * 100;
                    document.getElementById('progress-bar').style.width = `${percent}%`;
                    document.getElementById('progress-text').textContent = 
                        `Running: ${testName} (${current}/${total})`;
                }
            });
            
            // Display results
            const htmlReport = framework.generateReport('html', {
                includeCharts: true,
                theme: 'light'
            });
            
            document.getElementById('results').innerHTML = htmlReport;
        });
    </script>
</body>
</html>
```

## File Structure

```
editor_tester/
├── js/
│   ├── test-framework.js          # Main testing framework
│   ├── test-generator.js          # Automated test generation
│   ├── complex-scenario-generator.js # Complex scenario testing
│   ├── test-reporter.js           # Report generation
│   ├── test-runner.js             # Test execution engine
│   ├── test-config.js             # Configuration management
│   └── chart-utils.js             # Chart utilities
├── css/
│   └── style.css                  # Styling for reports and UI
├── types/
│   └── test-framework.d.ts        # TypeScript definitions
├── examples/
│   ├── basic-usage.js             # Basic usage examples
│   ├── advanced-scenarios.js      # Advanced testing scenarios
│   └── ci-integration.js          # CI/CD integration example
└── README.md                      # This file
```

## API Reference

### TestFramework

#### Methods
- `registerTest(nodeType, test)` - Register a test for a node type
- `runTests(nodeTypes?, options?)` - Run tests
- `generateAutomatedTests(options?)` - Generate automated tests
- `getResults(nodeType?)` - Get test results
- `getStats()` - Get test statistics
- `generateReport(format, options?)` - Generate test report
- `clear()` - Clear all tests and results
- `reset()` - Reset framework state

### TestCaseGenerator

#### Methods
- `generateTestsForNode(nodeType, options?)` - Generate tests for a node
- `analyzeNodeType(nodeType)` - Analyze node type capabilities
- `registerTemplate(template)` - Register test template
- `getAvailableTemplates()` - Get available templates

### ComplexScenarioGenerator

#### Methods
- `generateComplexScenarios(nodeTypes, options?)` - Generate complex scenarios
- `generateLinearPattern(nodes)` - Generate linear workflow pattern
- `generateFanOutPattern(nodes)` - Generate fan-out pattern
- `generateFanInPattern(nodes)` - Generate fan-in pattern
- `generateDiamondPattern(nodes)` - Generate diamond pattern
- `generateTreePattern(nodes)` - Generate tree pattern
- `generateMeshPattern(nodes)` - Generate mesh pattern

### TestReporter

#### Methods
- `formatResults(results, format, options?)` - Format test results
- `generateChartData(results, stats)` - Generate chart data
- `registerFormatter(formatter)` - Register custom formatter
- `getAvailableFormatters()` - Get available formatters

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details
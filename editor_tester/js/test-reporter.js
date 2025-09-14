/**
 * Test Reporter
 * Handles formatting and displaying test results in various formats
 */

export class TestReporter {
    constructor() {
        this.formatters = new Map();
        this.initializeFormatters();
    }

    /**
     * Initialize result formatters
     */
    initializeFormatters() {
        // Console formatter
        this.formatters.set('console', {
            name: 'Console Output',
            description: 'Formatted output for console display',
            format: (results, options = {}) => this.formatConsole(results, options)
        });

        // HTML formatter
        this.formatters.set('html', {
            name: 'HTML Report',
            description: 'Rich HTML report with interactive elements',
            format: (results, options = {}) => this.formatHTML(results, options)
        });

        // JSON formatter
        this.formatters.set('json', {
            name: 'JSON Export',
            description: 'Structured JSON data for programmatic use',
            format: (results, options = {}) => this.formatJSON(results, options)
        });

        // CSV formatter
        this.formatters.set('csv', {
            name: 'CSV Export',
            description: 'Comma-separated values for spreadsheet analysis',
            format: (results, options = {}) => this.formatCSV(results, options)
        });

        // Markdown formatter
        this.formatters.set('markdown', {
            name: 'Markdown Report',
            description: 'Markdown formatted report for documentation',
            format: (results, options = {}) => this.formatMarkdown(results, options)
        });

        // JUnit XML formatter
        this.formatters.set('junit', {
            name: 'JUnit XML',
            description: 'JUnit XML format for CI/CD integration',
            format: (results, options = {}) => this.formatJUnit(results, options)
        });
    }

    /**
     * Format test results using specified formatter
     */
    formatResults(results, format = 'console', options = {}) {
        const formatter = this.formatters.get(format);
        if (!formatter) {
            throw new Error(`Unknown format: ${format}`);
        }

        return formatter.format(results, options);
    }

    /**
     * Get available formatters
     */
    getAvailableFormatters() {
        const formatters = [];
        for (const [key, formatter] of this.formatters) {
            formatters.push({
                key,
                name: formatter.name,
                description: formatter.description
            });
        }
        return formatters;
    }

    /**
     * Format results for console output
     */
    formatConsole(results, options = {}) {
        const { showDetails = false, colorize = true } = options;
        const lines = [];

        // Header
        lines.push('\n' + '='.repeat(60));
        lines.push('  LITEGRAPH NODE TEST RESULTS');
        lines.push('='.repeat(60));

        // Summary statistics
        const stats = this.calculateStats(results);
        lines.push('');
        lines.push('SUMMARY:');
        lines.push(`  Total Tests: ${stats.total}`);
        lines.push(`  Passed: ${colorize ? this.colorize(stats.passed, 'green') : stats.passed}`);
        lines.push(`  Failed: ${colorize ? this.colorize(stats.failed, 'red') : stats.failed}`);
        lines.push(`  Skipped: ${stats.skipped}`);
        lines.push(`  Success Rate: ${stats.successRate.toFixed(1)}%`);
        lines.push(`  Total Duration: ${stats.totalDuration.toFixed(2)}ms`);
        lines.push(`  Average Duration: ${stats.averageDuration.toFixed(2)}ms`);
        lines.push('');

        // Category breakdown
        if (stats.categories.size > 0) {
            lines.push('BY CATEGORY:');
            for (const [category, categoryStats] of stats.categories) {
                lines.push(`  ${category}: ${categoryStats.passed}/${categoryStats.total} passed`);
            }
            lines.push('');
        }

        // Node type breakdown
        if (stats.nodeTypes.size > 0) {
            lines.push('BY NODE TYPE:');
            for (const [nodeType, nodeStats] of stats.nodeTypes) {
                const status = nodeStats.failed > 0 ? 
                    (colorize ? this.colorize('FAILED', 'red') : 'FAILED') :
                    (colorize ? this.colorize('PASSED', 'green') : 'PASSED');
                lines.push(`  ${nodeType}: ${status} (${nodeStats.passed}/${nodeStats.total})`);
            }
            lines.push('');
        }

        // Detailed results
        if (showDetails) {
            lines.push('DETAILED RESULTS:');
            lines.push('-'.repeat(60));

            for (const result of results) {
                const status = result.status === 'passed' ?
                    (colorize ? this.colorize('✓ PASS', 'green') : '✓ PASS') :
                    (colorize ? this.colorize('✗ FAIL', 'red') : '✗ FAIL');

                lines.push(`${status} ${result.nodeType} - ${result.testId}`);
                lines.push(`      Duration: ${result.duration.toFixed(2)}ms`);

                if (result.errors.length > 0) {
                    lines.push('      Errors:');
                    for (const error of result.errors) {
                        lines.push(`        - ${error.message}`);
                    }
                }

                if (result.warnings.length > 0) {
                    lines.push('      Warnings:');
                    for (const warning of result.warnings) {
                        lines.push(`        - ${warning}`);
                    }
                }

                lines.push('');
            }
        }

        // Failed tests summary
        const failedTests = results.filter(r => r.status === 'failed');
        if (failedTests.length > 0) {
            lines.push('FAILED TESTS:');
            lines.push('-'.repeat(60));

            for (const result of failedTests) {
                lines.push(`${result.nodeType} - ${result.testId}`);
                for (const error of result.errors) {
                    lines.push(`  Error: ${error.message}`);
                }
                lines.push('');
            }
        }

        lines.push('='.repeat(60));
        return lines.join('\n');
    }

    /**
     * Format results as HTML report
     */
    formatHTML(results, options = {}) {
        const { includeCharts = true, theme = 'light' } = options;
        const stats = this.calculateStats(results);

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LiteGraph Test Report</title>
    <style>
        :root {
            --primary-color: #2196F3;
            --success-color: #4CAF50;
            --error-color: #F44336;
            --warning-color: #FF9800;
            --background-color: ${theme === 'dark' ? '#1a1a1a' : '#ffffff'};
            --text-color: ${theme === 'dark' ? '#ffffff' : '#333333'};
            --border-color: ${theme === 'dark' ? '#444444' : '#dddddd'};
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: var(--background-color);
            color: var(--text-color);
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: linear-gradient(135deg, var(--primary-color), #1976D2);
            color: white;
            border-radius: 8px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: var(--background-color);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .stat-label {
            color: #666;
            font-size: 0.9em;
        }
        
        .passed { color: var(--success-color); }
        .failed { color: var(--error-color); }
        .warning { color: var(--warning-color); }
        
        .section {
            margin-bottom: 30px;
        }
        
        .section-title {
            font-size: 1.5em;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid var(--primary-color);
        }
        
        .test-results {
            display: grid;
            gap: 10px;
        }
        
        .test-result {
            background: var(--background-color);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 15px;
            border-left: 4px solid var(--border-color);
        }
        
        .test-result.passed {
            border-left-color: var(--success-color);
        }
        
        .test-result.failed {
            border-left-color: var(--error-color);
        }
        
        .test-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .test-name {
            font-weight: bold;
        }
        
        .test-status {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .test-status.passed {
            background: var(--success-color);
            color: white;
        }
        
        .test-status.failed {
            background: var(--error-color);
            color: white;
        }
        
        .test-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
            font-size: 0.9em;
            color: #666;
        }
        
        .error-list, .warning-list {
            margin-top: 10px;
        }
        
        .error-item, .warning-item {
            padding: 5px 10px;
            margin: 5px 0;
            border-radius: 4px;
            font-size: 0.9em;
        }
        
        .error-item {
            background: rgba(244, 67, 54, 0.1);
            border-left: 3px solid var(--error-color);
        }
        
        .warning-item {
            background: rgba(255, 152, 0, 0.1);
            border-left: 3px solid var(--warning-color);
        }
        
        .chart-container {
            background: var(--background-color);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .progress-bar {
            width: 100%;
            height: 20px;
            background: var(--border-color);
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--success-color), #66BB6A);
            transition: width 0.3s ease;
        }
        
        .category-breakdown, .nodetype-breakdown {
            display: grid;
            gap: 10px;
        }
        
        .breakdown-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            background: var(--background-color);
            border: 1px solid var(--border-color);
            border-radius: 4px;
        }
        
        .breakdown-name {
            font-weight: bold;
        }
        
        .breakdown-stats {
            font-size: 0.9em;
            color: #666;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
            }
            
            .test-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
            }
            
            .test-details {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>LiteGraph Test Report</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${stats.total}</div>
                <div class="stat-label">Total Tests</div>
            </div>
            <div class="stat-card">
                <div class="stat-value passed">${stats.passed}</div>
                <div class="stat-label">Passed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value failed">${stats.failed}</div>
                <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.successRate.toFixed(1)}%</div>
                <div class="stat-label">Success Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.totalDuration.toFixed(0)}ms</div>
                <div class="stat-label">Total Duration</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.averageDuration.toFixed(1)}ms</div>
                <div class="stat-label">Average Duration</div>
            </div>
        </div>
        
        <div class="chart-container">
            <h3>Overall Progress</h3>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${stats.successRate}%"></div>
            </div>
            <p>${stats.passed} of ${stats.total} tests passed (${stats.successRate.toFixed(1)}%)</p>
        </div>
        
        ${stats.categories.size > 0 ? `
        <div class="section">
            <h2 class="section-title">Results by Category</h2>
            <div class="category-breakdown">
                ${Array.from(stats.categories.entries()).map(([category, categoryStats]) => `
                <div class="breakdown-item">
                    <span class="breakdown-name">${category}</span>
                    <span class="breakdown-stats">
                        <span class="passed">${categoryStats.passed}</span> / 
                        <span>${categoryStats.total}</span> passed
                    </span>
                </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        ${stats.nodeTypes.size > 0 ? `
        <div class="section">
            <h2 class="section-title">Results by Node Type</h2>
            <div class="nodetype-breakdown">
                ${Array.from(stats.nodeTypes.entries()).map(([nodeType, nodeStats]) => `
                <div class="breakdown-item">
                    <span class="breakdown-name">${nodeType}</span>
                    <span class="breakdown-stats">
                        <span class="${nodeStats.failed > 0 ? 'failed' : 'passed'}">
                            ${nodeStats.failed > 0 ? 'FAILED' : 'PASSED'}
                        </span>
                        (${nodeStats.passed}/${nodeStats.total})
                    </span>
                </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        <div class="section">
            <h2 class="section-title">Test Results</h2>
            <div class="test-results">
                ${results.map(result => `
                <div class="test-result ${result.status}">
                    <div class="test-header">
                        <span class="test-name">${result.nodeType} - ${result.testId}</span>
                        <span class="test-status ${result.status}">${result.status}</span>
                    </div>
                    <div class="test-details">
                        <span>Duration: ${result.duration.toFixed(2)}ms</span>
                        <span>Errors: ${result.errors.length}</span>
                        <span>Warnings: ${result.warnings.length}</span>
                        ${result.memoryUsage ? `<span>Memory: ${(result.memoryUsage.delta / 1024).toFixed(1)}KB</span>` : ''}
                    </div>
                    ${result.errors.length > 0 ? `
                    <div class="error-list">
                        ${result.errors.map(error => `
                        <div class="error-item">
                            <strong>${error.type || 'Error'}:</strong> ${error.message}
                        </div>
                        `).join('')}
                    </div>
                    ` : ''}
                    ${result.warnings.length > 0 ? `
                    <div class="warning-list">
                        ${result.warnings.map(warning => `
                        <div class="warning-item">
                            <strong>Warning:</strong> ${warning}
                        </div>
                        `).join('')}
                    </div>
                    ` : ''}
                </div>
                `).join('')}
            </div>
        </div>
    </div>
</body>
</html>`;

        return html;
    }

    /**
     * Format results as JSON
     */
    formatJSON(results, options = {}) {
        const { pretty = true, includeStats = true } = options;
        
        const data = {
            timestamp: new Date().toISOString(),
            results: results
        };
        
        if (includeStats) {
            data.statistics = this.calculateStats(results);
        }
        
        return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    }

    /**
     * Format results as CSV
     */
    formatCSV(results, options = {}) {
        const { includeDetails = false } = options;
        
        const headers = [
            'Test ID',
            'Node Type', 
            'Status',
            'Duration (ms)',
            'Errors',
            'Warnings'
        ];
        
        if (includeDetails) {
            headers.push('Error Messages', 'Warning Messages');
        }
        
        const rows = [headers.join(',')];
        
        for (const result of results) {
            const row = [
                `"${result.testId}"`,
                `"${result.nodeType}"`,
                result.status,
                result.duration.toFixed(2),
                result.errors.length,
                result.warnings.length
            ];
            
            if (includeDetails) {
                const errorMessages = result.errors.map(e => e.message).join('; ');
                const warningMessages = result.warnings.join('; ');
                row.push(`"${errorMessages}"`, `"${warningMessages}"`);
            }
            
            rows.push(row.join(','));
        }
        
        return rows.join('\n');
    }

    /**
     * Format results as Markdown
     */
    formatMarkdown(results, options = {}) {
        const { includeDetails = true } = options;
        const stats = this.calculateStats(results);
        
        const lines = [];
        
        // Header
        lines.push('# LiteGraph Test Report');
        lines.push('');
        lines.push(`Generated on: ${new Date().toLocaleString()}`);
        lines.push('');
        
        // Summary
        lines.push('## Summary');
        lines.push('');
        lines.push('| Metric | Value |');
        lines.push('|--------|-------|');
        lines.push(`| Total Tests | ${stats.total} |`);
        lines.push(`| Passed | ${stats.passed} |`);
        lines.push(`| Failed | ${stats.failed} |`);
        lines.push(`| Skipped | ${stats.skipped} |`);
        lines.push(`| Success Rate | ${stats.successRate.toFixed(1)}% |`);
        lines.push(`| Total Duration | ${stats.totalDuration.toFixed(2)}ms |`);
        lines.push(`| Average Duration | ${stats.averageDuration.toFixed(2)}ms |`);
        lines.push('');
        
        // Category breakdown
        if (stats.categories.size > 0) {
            lines.push('## Results by Category');
            lines.push('');
            lines.push('| Category | Passed | Total | Success Rate |');
            lines.push('|----------|--------|-------|--------------|');
            
            for (const [category, categoryStats] of stats.categories) {
                const successRate = categoryStats.total > 0 ? 
                    (categoryStats.passed / categoryStats.total * 100).toFixed(1) : '0.0';
                lines.push(`| ${category} | ${categoryStats.passed} | ${categoryStats.total} | ${successRate}% |`);
            }
            lines.push('');
        }
        
        // Node type breakdown
        if (stats.nodeTypes.size > 0) {
            lines.push('## Results by Node Type');
            lines.push('');
            lines.push('| Node Type | Status | Passed | Total |');
            lines.push('|-----------|--------|--------|-------|');
            
            for (const [nodeType, nodeStats] of stats.nodeTypes) {
                const status = nodeStats.failed > 0 ? '❌ FAILED' : '✅ PASSED';
                lines.push(`| ${nodeType} | ${status} | ${nodeStats.passed} | ${nodeStats.total} |`);
            }
            lines.push('');
        }
        
        // Detailed results
        if (includeDetails) {
            lines.push('## Detailed Results');
            lines.push('');
            
            for (const result of results) {
                const status = result.status === 'passed' ? '✅' : '❌';
                lines.push(`### ${status} ${result.nodeType} - ${result.testId}`);
                lines.push('');
                lines.push(`- **Status:** ${result.status.toUpperCase()}`);
                lines.push(`- **Duration:** ${result.duration.toFixed(2)}ms`);
                lines.push(`- **Errors:** ${result.errors.length}`);
                lines.push(`- **Warnings:** ${result.warnings.length}`);
                
                if (result.errors.length > 0) {
                    lines.push('');
                    lines.push('**Errors:**');
                    for (const error of result.errors) {
                        lines.push(`- ${error.type || 'Error'}: ${error.message}`);
                    }
                }
                
                if (result.warnings.length > 0) {
                    lines.push('');
                    lines.push('**Warnings:**');
                    for (const warning of result.warnings) {
                        lines.push(`- ${warning}`);
                    }
                }
                
                lines.push('');
            }
        }
        
        return lines.join('\n');
    }

    /**
     * Format results as JUnit XML
     */
    formatJUnit(results, options = {}) {
        const { suiteName = 'LiteGraph Tests' } = options;
        const stats = this.calculateStats(results);
        
        const xml = [];
        xml.push('<?xml version="1.0" encoding="UTF-8"?>');
        xml.push(`<testsuites name="${suiteName}" tests="${stats.total}" failures="${stats.failed}" time="${(stats.totalDuration / 1000).toFixed(3)}">`);
        
        // Group by node type
        const suites = new Map();
        for (const result of results) {
            if (!suites.has(result.nodeType)) {
                suites.set(result.nodeType, []);
            }
            suites.get(result.nodeType).push(result);
        }
        
        for (const [nodeType, suiteResults] of suites) {
            const suiteStats = this.calculateStats(suiteResults);
            
            xml.push(`  <testsuite name="${nodeType}" tests="${suiteStats.total}" failures="${suiteStats.failed}" time="${(suiteStats.totalDuration / 1000).toFixed(3)}">`);
            
            for (const result of suiteResults) {
                xml.push(`    <testcase name="${result.testId}" classname="${result.nodeType}" time="${(result.duration / 1000).toFixed(3)}">`);
                
                if (result.status === 'failed') {
                    const errorMessage = result.errors.map(e => e.message).join('; ');
                    xml.push(`      <failure message="${this.escapeXml(errorMessage)}">`);
                    xml.push(`        <![CDATA[${result.errors.map(e => `${e.type || 'Error'}: ${e.message}`).join('\n')}]]>`);
                    xml.push('      </failure>');
                }
                
                if (result.warnings.length > 0) {
                    xml.push(`      <system-out>`);
                    xml.push(`        <![CDATA[Warnings:\n${result.warnings.join('\n')}]]>`);
                    xml.push('      </system-out>');
                }
                
                xml.push('    </testcase>');
            }
            
            xml.push('  </testsuite>');
        }
        
        xml.push('</testsuites>');
        return xml.join('\n');
    }

    /**
     * Calculate statistics from test results
     */
    calculateStats(results) {
        const stats = {
            total: results.length,
            passed: 0,
            failed: 0,
            skipped: 0,
            totalDuration: 0,
            averageDuration: 0,
            successRate: 0,
            categories: new Map(),
            nodeTypes: new Map()
        };
        
        for (const result of results) {
            // Count by status
            if (result.status === 'passed') {
                stats.passed++;
            } else if (result.status === 'failed') {
                stats.failed++;
            } else {
                stats.skipped++;
            }
            
            // Duration
            stats.totalDuration += result.duration;
            
            // Category stats
            const category = this.extractCategory(result.testId) || 'other';
            if (!stats.categories.has(category)) {
                stats.categories.set(category, { total: 0, passed: 0, failed: 0 });
            }
            const categoryStats = stats.categories.get(category);
            categoryStats.total++;
            if (result.status === 'passed') {
                categoryStats.passed++;
            } else if (result.status === 'failed') {
                categoryStats.failed++;
            }
            
            // Node type stats
            if (!stats.nodeTypes.has(result.nodeType)) {
                stats.nodeTypes.set(result.nodeType, { total: 0, passed: 0, failed: 0 });
            }
            const nodeStats = stats.nodeTypes.get(result.nodeType);
            nodeStats.total++;
            if (result.status === 'passed') {
                nodeStats.passed++;
            } else if (result.status === 'failed') {
                nodeStats.failed++;
            }
        }
        
        // Calculate derived stats
        stats.averageDuration = stats.total > 0 ? stats.totalDuration / stats.total : 0;
        stats.successRate = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;
        
        return stats;
    }

    /**
     * Extract category from test ID
     */
    extractCategory(testId) {
        // Try to extract category from test ID pattern
        const match = testId.match(/^([^_]+)_/);
        return match ? match[1] : null;
    }

    /**
     * Colorize text for console output
     */
    colorize(text, color) {
        const colors = {
            red: '\x1b[31m',
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            blue: '\x1b[34m',
            magenta: '\x1b[35m',
            cyan: '\x1b[36m',
            white: '\x1b[37m',
            reset: '\x1b[0m'
        };
        
        return `${colors[color] || ''}${text}${colors.reset}`;
    }

    /**
     * Escape XML special characters
     */
    escapeXml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    /**
     * Generate summary report
     */
    generateSummary(results, format = 'console') {
        const stats = this.calculateStats(results);
        
        switch (format) {
            case 'console':
                return `Tests: ${stats.total}, Passed: ${stats.passed}, Failed: ${stats.failed}, Success Rate: ${stats.successRate.toFixed(1)}%`;
            
            case 'json':
                return JSON.stringify(stats, null, 2);
            
            case 'text':
                return `Test Summary:\n` +
                       `  Total: ${stats.total}\n` +
                       `  Passed: ${stats.passed}\n` +
                       `  Failed: ${stats.failed}\n` +
                       `  Success Rate: ${stats.successRate.toFixed(1)}%\n` +
                       `  Duration: ${stats.totalDuration.toFixed(2)}ms`;
            
            default:
                return this.formatResults(results, format);
        }
    }
}

export default TestReporter;
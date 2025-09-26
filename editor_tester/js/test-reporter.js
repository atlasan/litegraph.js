/**
 * Test Reporter
 * Handles formatting and displaying test results in various formats
 * Enhanced with detailed reporting capabilities and visualization
 */

function TestReporter() {
    this.formatters = {};
    this.initializeFormatters();
    this.lastResults = null;
    this.lastStats = null;
    this.lastLogs = null;
}

/**
 * Initialize result formatters
 */
TestReporter.prototype.initializeFormatters = function() {
    var self = this;
    
    // Console formatter
    this.formatters['console'] = {
        name: 'Console Output',
        description: 'Formatted output for console display',
        format: function(results, options) {
            options = options || {};
            return self.formatConsole(results, options);
        }
    };

    // HTML formatter
    this.formatters['html'] = {
        name: 'HTML Report',
        description: 'Rich HTML report with interactive elements',
        format: function(results, options) {
            options = options || {};
            return self.formatHTML(results, options);
        }
    };

    // JSON formatter
    this.formatters['json'] = {
        name: 'JSON Export',
        description: 'Structured JSON data for programmatic use',
        format: function(results, options) {
            options = options || {};
            return self.formatJSON(results, options);
        }
    };

    // CSV formatter
    this.formatters['csv'] = {
        name: 'CSV Export',
        description: 'Comma-separated values for spreadsheet analysis',
        format: function(results, options) {
            options = options || {};
            return self.formatCSV(results, options);
        }
    };

    // Markdown formatter
    this.formatters['markdown'] = {
        name: 'Markdown Report',
        description: 'Markdown formatted report for documentation',
        format: function(results, options) {
            options = options || {};
            return self.formatMarkdown(results, options);
        }
    };

    // Visual formatter
    this.formatters['visual'] = {
        name: 'Visual Report',
        description: 'Interactive HTML report with charts and visualizations',
        format: function(results, options) {
            options = options || {};
            return self.formatVisualReport(results, options);
        }
    };

    // JUnit formatter
    this.formatters['junit'] = {
        name: 'JUnit XML',
        description: 'JUnit XML format for CI/CD integration',
        format: function(results, options) {
            options = options || {};
            return self.formatJUnit(results, options);
        }
    };
};

/**
 * Format visual report with charts
 */
TestReporter.prototype.formatVisualReport = function(results, options) {
    options = options || {};
    var stats = this.calculateStats(results);
    var summary = this.generateSummary(results, 'text');
    var chartData = this.generateChartData(results, stats);
    
    return '<!DOCTYPE html>\n' +
        '<html lang="en">\n' +
        '<head>\n' +
        '    <meta charset="UTF-8">\n' +
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
        '    <title>LiteGraph Node Test Visual Report</title>\n' +
        '    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\n' +
        '    <style>\n' +
        '        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }\n' +
        '        .header { background: #f5f5f5; padding: 20px; border-bottom: 1px solid #ddd; margin-bottom: 20px; }\n' +
        '        .chart-container { width: 100%; max-width: 800px; margin: 0 auto 30px; }\n' +
        '        .chart-row { display: flex; flex-wrap: wrap; justify-content: space-between; }\n' +
        '        .chart-col { width: 48%; margin-bottom: 20px; }\n' +
        '        .summary-section { margin-bottom: 30px; }\n' +
        '        .summary-table { width: 100%; border-collapse: collapse; }\n' +
        '        .summary-table th, .summary-table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }\n' +
        '        .summary-table th { background: #f5f5f5; }\n' +
        '        .error-item { background: #fff0f0; padding: 10px; margin-bottom: 10px; border-radius: 4px; }\n' +
        '        @media (max-width: 768px) {\n' +
        '            .chart-col { width: 100%; }\n' +
        '        }\n' +
        '    </style>\n' +
        '</head>\n' +
        '<body>\n' +
        '    <div class="header">\n' +
        '        <h1>LiteGraph Node Test Visual Report</h1>\n' +
        '        <p>Generated on ' + new Date().toLocaleString() + '</p>\n' +
        '    </div>\n' +
        '\n' +
        '    <div class="summary-section">\n' +
        '        <h2>Test Summary</h2>\n' +
        '        <div class="chart-container">\n' +
        '            <canvas id="overviewChart"></canvas>\n' +
        '        </div>\n' +
        '\n' +
        '        <table class="summary-table">\n' +
        '            <tr>\n' +
        '                <th>Total Tests</th>\n' +
        '                <td>' + stats.total + '</td>\n' +
        '                <th>Duration</th>\n' +
        '                <td>' + stats.totalDuration.toFixed(2) + 'ms</td>\n' +
        '            </tr>\n' +
        '            <tr>\n' +
        '                <th>Pass Rate</th>\n' +
        '                <td>' + stats.successRate.toFixed(1) + '%</td>\n' +
        '                <th>Average Duration</th>\n' +
        '                <td>' + stats.averageDuration.toFixed(2) + 'ms</td>\n' +
        '            </tr>\n' +
        '        </table>\n' +
        '    </div>\n' +
        '\n' +
        '    <div class="chart-row">\n' +
        '        <div class="chart-col">\n' +
        '            <h2>Results by Category</h2>\n' +
        '            <canvas id="categoryChart"></canvas>\n' +
        '        </div>\n' +
        '        <div class="chart-col">\n' +
        '            <h2>Results by Node Type</h2>\n' +
        '            <canvas id="nodeTypeChart"></canvas>\n' +
        '        </div>\n' +
        '    </div>\n' +
        '\n' +
        '    <div class="summary-section">\n' +
        '        <h2>Top Failing Nodes</h2>\n' +
        '        <div class="chart-container">\n' +
        '            <canvas id="failingNodesChart"></canvas>\n' +
        '        </div>\n' +
        '    </div>\n' +
        '\n' +
        '    <div class="summary-section">\n' +
        '        <h2>Common Error Patterns</h2>\n' +
        '        <div id="errorPatterns">\n' +
        this.generateErrorPatterns(results) +
        '        </div>\n' +
        '    </div>\n' +
        '\n' +
        '    <script>\n' +
        '        // Initialize charts\n' +
        '        new Chart(document.getElementById("overviewChart"), {\n' +
        '            type: "pie",\n' +
        '            data: {\n' +
        '                labels: ["Passed", "Failed", "Skipped"],\n' +
        '                datasets: [{\n' +
        '                    data: [' + stats.passed + ', ' + stats.failed + ', ' + stats.skipped + '],\n' +
        '                    backgroundColor: ["#4caf50", "#f44336", "#9e9e9e"]\n' +
        '                }]\n' +
        '            },\n' +
        '            options: {\n' +
        '                responsive: true,\n' +
        '                plugins: {\n' +
        '                    title: {\n' +
        '                        display: true,\n' +
        '                        text: "Test Results Overview"\n' +
        '                    }\n' +
        '                }\n' +
        '            }\n' +
        '        });\n' +
        '\n' +
        '        // Category chart data\n' +
        '        var categoryLabels = ' + JSON.stringify(this.getMapKeys(stats.categories)) + ';\n' +
        '        var categoryPassed = ' + JSON.stringify(this.getMapValues(stats.categories, 'passed')) + ';\n' +
        '        var categoryFailed = ' + JSON.stringify(this.getMapValues(stats.categories, 'failed')) + ';\n' +
        '\n' +
        '        // Category chart\n' +
        '        new Chart(document.getElementById("categoryChart"), {\n' +
        '            type: "bar",\n' +
        '            data: {\n' +
        '                labels: categoryLabels,\n' +
        '                datasets: [\n' +
        '                    {\n' +
        '                        label: "Passed",\n' +
        '                        backgroundColor: "#4caf50",\n' +
        '                        data: categoryPassed\n' +
        '                    },\n' +
        '                    {\n' +
        '                        label: "Failed",\n' +
        '                        backgroundColor: "#f44336",\n' +
        '                        data: categoryFailed\n' +
        '                    }\n' +
        '                ]\n' +
        '            },\n' +
        '            options: {\n' +
        '                responsive: true,\n' +
        '                scales: {\n' +
        '                    x: { stacked: true },\n' +
        '                    y: { stacked: true }\n' +
        '                }\n' +
        '            }\n' +
        '        });\n' +
        '\n' +
        '        // Node type chart data\n' +
        '        var nodeTypeLabels = ' + JSON.stringify(this.getMapKeys(stats.nodeTypes)) + ';\n' +
        '        var nodeTypePassed = ' + JSON.stringify(this.getMapValues(stats.nodeTypes, 'passed')) + ';\n' +
        '        var nodeTypeFailed = ' + JSON.stringify(this.getMapValues(stats.nodeTypes, 'failed')) + ';\n' +
        '\n' +
        '        // Node type chart\n' +
        '        new Chart(document.getElementById("nodeTypeChart"), {\n' +
        '            type: "bar",\n' +
        '            data: {\n' +
        '                labels: nodeTypeLabels,\n' +
        '                datasets: [\n' +
        '                    {\n' +
        '                        label: "Passed",\n' +
        '                        backgroundColor: "#4caf50",\n' +
        '                        data: nodeTypePassed\n' +
        '                    },\n' +
        '                    {\n' +
        '                        label: "Failed",\n' +
        '                        backgroundColor: "#f44336",\n' +
        '                        data: nodeTypeFailed\n' +
        '                    }\n' +
        '                ]\n' +
        '            },\n' +
        '            options: {\n' +
        '                responsive: true,\n' +
        '                scales: {\n' +
        '                    x: { stacked: true },\n' +
        '                    y: { stacked: true }\n' +
        '                }\n' +
        '            }\n' +
        '        });\n' +
        '\n' +
        '        // Top failing nodes\n' +
        '        var topFailingNodes = ' + JSON.stringify(this.getTopFailingNodes(stats.nodeTypes)) + ';\n' +
        '\n' +
        '        new Chart(document.getElementById("failingNodesChart"), {\n' +
        '            type: "bar",\n' +
        '            data: {\n' +
        '                labels: topFailingNodes.map(function(n) { return n.nodeType; }),\n' +
        '                datasets: [{\n' +
        '                    label: "Failures",\n' +
        '                    backgroundColor: "#f44336",\n' +
        '                    data: topFailingNodes.map(function(n) { return n.count; })\n' +
        '                }]\n' +
        '            },\n' +
        '            options: {\n' +
        '                indexAxis: "y",\n' +
        '                responsive: true\n' +
        '            }\n' +
        '        });\n' +
        '    </script>\n' +
        '</body>\n' +
        '</html>';
};

/**
 * Format results using specified formatter
 */
TestReporter.prototype.formatResults = function(results, format, options) {
    format = format || 'console';
    options = options || {};
    
    var formatter = this.formatters[format];
    if (!formatter) {
        throw new Error('Unknown format: ' + format);
    }

    return formatter.format(results, options);
};

/**
 * Get available formatters
 */
TestReporter.prototype.getAvailableFormatters = function() {
    var formatters = [];
    for (var key in this.formatters) {
        if (this.formatters.hasOwnProperty(key)) {
            var formatter = this.formatters[key];
            formatters.push({
                key: key,
                name: formatter.name,
                description: formatter.description
            });
        }
    }
    return formatters;
};

/**
 * Format console output
 */
TestReporter.prototype.formatConsole = function(results, options) {
    options = options || {};
    var showDetails = options.showDetails || false;
    var colorize = options.colorize !== false;
    var lines = [];

    // Header
    lines.push('\n' + this.repeat('=', 60));
    lines.push('  LITEGRAPH NODE TEST RESULTS');
    lines.push(this.repeat('=', 60));

    // Summary
    var stats = this.calculateStats(results);
    lines.push('');
    lines.push('SUMMARY:');
    lines.push('  Total Tests: ' + stats.total);
    lines.push('  Passed: ' + (colorize ? this.colorize(stats.passed, 'green') : stats.passed));
    lines.push('  Failed: ' + (colorize ? this.colorize(stats.failed, 'red') : stats.failed));
    lines.push('  Skipped: ' + stats.skipped);
    lines.push('  Success Rate: ' + stats.successRate.toFixed(1) + '%');
    lines.push('  Total Duration: ' + stats.totalDuration.toFixed(2) + 'ms');
    lines.push('  Average Duration: ' + stats.averageDuration.toFixed(2) + 'ms');
    lines.push('');

    // Category breakdown
    if (this.getObjectSize(stats.categories) > 0) {
        lines.push('BY CATEGORY:');
        for (var category in stats.categories) {
            if (stats.categories.hasOwnProperty(category)) {
                var categoryStats = stats.categories[category];
                lines.push('  ' + category + ': ' + categoryStats.passed + ' passed, ' + categoryStats.failed + ' failed');
            }
        }
        lines.push('');
    }

    // Node type breakdown
    if (this.getObjectSize(stats.nodeTypes) > 0) {
        lines.push('BY NODE TYPE:');
        for (var nodeType in stats.nodeTypes) {
            if (stats.nodeTypes.hasOwnProperty(nodeType)) {
                var nodeStats = stats.nodeTypes[nodeType];
                var successRate = nodeStats.total > 0 ? ((nodeStats.passed / nodeStats.total) * 100).toFixed(1) : '0.0';
                lines.push('  ' + nodeType + ': ' + nodeStats.passed + '/' + nodeStats.total + ' (' + successRate + '%)');
            }
        }
        lines.push('');
    }

    // Detailed results
    if (showDetails) {
        lines.push('DETAILED RESULTS:');
        lines.push(this.repeat('-', 60));

        for (var i = 0; i < results.length; i++) {
            var result = results[i];
            var status = result.status === 'passed' ? 
                (colorize ? this.colorize('PASS', 'green') : 'PASS') :
                (colorize ? this.colorize('FAIL', 'red') : 'FAIL');
            
            lines.push('');
            lines.push('[' + status + '] ' + result.testId + ' (' + result.duration.toFixed(2) + 'ms)');
            
            if (result.nodeType) {
                lines.push('  Node Type: ' + result.nodeType);
            }
            
            if (result.description) {
                lines.push('  Description: ' + result.description);
            }
            
            if (result.status === 'failed' && result.error) {
                lines.push('  Error: ' + result.error);
                if (result.stack) {
                    var stackLines = result.stack.split('\n');
                    for (var j = 0; j < Math.min(stackLines.length, 3); j++) {
                        lines.push('    ' + stackLines[j]);
                    }
                }
            }
            
            if (result.logs && result.logs.length > 0) {
                lines.push('  Logs:');
                for (var k = 0; k < result.logs.length; k++) {
                    lines.push('    ' + result.logs[k]);
                }
            }
        }
    }

    return lines.join('\n');
};

/**
 * Format HTML output
 */
TestReporter.prototype.formatHTML = function(results, options) {
    options = options || {};
    var stats = this.calculateStats(results);
    var title = options.title || 'LiteGraph Node Test Results';
    
    var html = '<!DOCTYPE html>\n' +
        '<html lang="en">\n' +
        '<head>\n' +
        '    <meta charset="UTF-8">\n' +
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
        '    <title>' + title + '</title>\n' +
        '    <style>\n' +
        '        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }\n' +
        '        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }\n' +
        '        .summary { display: flex; gap: 20px; margin-bottom: 20px; }\n' +
        '        .stat-card { background: white; padding: 15px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); flex: 1; }\n' +
        '        .stat-value { font-size: 24px; font-weight: bold; margin-bottom: 5px; }\n' +
        '        .stat-label { color: #666; font-size: 14px; }\n' +
        '        .passed { color: #4caf50; }\n' +
        '        .failed { color: #f44336; }\n' +
        '        .skipped { color: #ff9800; }\n' +
        '        .test-result { margin-bottom: 10px; padding: 10px; border-radius: 5px; }\n' +
        '        .test-result.passed { background: #e8f5e8; border-left: 4px solid #4caf50; }\n' +
        '        .test-result.failed { background: #ffeaea; border-left: 4px solid #f44336; }\n' +
        '        .test-result.skipped { background: #fff3e0; border-left: 4px solid #ff9800; }\n' +
        '        .test-id { font-weight: bold; margin-bottom: 5px; }\n' +
        '        .test-meta { font-size: 12px; color: #666; margin-bottom: 5px; }\n' +
        '        .test-error { background: #f5f5f5; padding: 10px; border-radius: 3px; margin-top: 5px; font-family: monospace; font-size: 12px; }\n' +
        '    </style>\n' +
        '</head>\n' +
        '<body>\n' +
        '    <div class="header">\n' +
        '        <h1>' + title + '</h1>\n' +
        '        <p>Generated on ' + new Date().toLocaleString() + '</p>\n' +
        '    </div>\n' +
        '\n' +
        '    <div class="summary">\n' +
        '        <div class="stat-card">\n' +
        '            <div class="stat-value">' + stats.total + '</div>\n' +
        '            <div class="stat-label">Total Tests</div>\n' +
        '        </div>\n' +
        '        <div class="stat-card">\n' +
        '            <div class="stat-value passed">' + stats.passed + '</div>\n' +
        '            <div class="stat-label">Passed</div>\n' +
        '        </div>\n' +
        '        <div class="stat-card">\n' +
        '            <div class="stat-value failed">' + stats.failed + '</div>\n' +
        '            <div class="stat-label">Failed</div>\n' +
        '        </div>\n' +
        '        <div class="stat-card">\n' +
        '            <div class="stat-value skipped">' + stats.skipped + '</div>\n' +
        '            <div class="stat-label">Skipped</div>\n' +
        '        </div>\n' +
        '        <div class="stat-card">\n' +
        '            <div class="stat-value">' + stats.successRate.toFixed(1) + '%</div>\n' +
        '            <div class="stat-label">Success Rate</div>\n' +
        '        </div>\n' +
        '    </div>\n' +
        '\n' +
        '    <h2>Test Results</h2>\n';

    for (var i = 0; i < results.length; i++) {
        var result = results[i];
        html += '    <div class="test-result ' + result.status + '">\n' +
            '        <div class="test-id">' + this.escapeHtml(result.testId) + '</div>\n' +
            '        <div class="test-meta">\n' +
            '            Status: ' + result.status.toUpperCase() + ' | ' +
            '            Duration: ' + result.duration.toFixed(2) + 'ms';
        
        if (result.nodeType) {
            html += ' | Node Type: ' + this.escapeHtml(result.nodeType);
        }
        
        html += '\n        </div>\n';
        
        if (result.description) {
            html += '        <div>' + this.escapeHtml(result.description) + '</div>\n';
        }
        
        if (result.status === 'failed' && result.error) {
            html += '        <div class="test-error">' + this.escapeHtml(result.error) + '</div>\n';
        }
        
        html += '    </div>\n';
    }

    html += '</body>\n</html>';
    return html;
};

/**
 * Format JSON output
 */
TestReporter.prototype.formatJSON = function(results, options) {
    options = options || {};
    var includeStats = options.includeStats !== false;
    var includeLogs = options.includeLogs !== false;
    
    var output = {
        timestamp: new Date().toISOString(),
        results: results
    };
    
    if (includeStats) {
        output.stats = this.calculateStats(results);
    }
    
    if (!includeLogs) {
        output.results = results.map(function(result) {
            var cleanResult = {};
            for (var key in result) {
                if (result.hasOwnProperty(key) && key !== 'logs') {
                    cleanResult[key] = result[key];
                }
            }
            return cleanResult;
        });
    }
    
    return JSON.stringify(output, null, 2);
};

/**
 * Format CSV output
 */
TestReporter.prototype.formatCSV = function(results, options) {
    options = options || {};
    var includeHeaders = options.includeHeaders !== false;
    var lines = [];
    
    if (includeHeaders) {
        lines.push('Test ID,Status,Duration (ms),Node Type,Description,Error');
    }
    
    for (var i = 0; i < results.length; i++) {
        var result = results[i];
        var row = [
            this.escapeCsv(result.testId || ''),
            this.escapeCsv(result.status || ''),
            result.duration || 0,
            this.escapeCsv(result.nodeType || ''),
            this.escapeCsv(result.description || ''),
            this.escapeCsv(result.error || '')
        ];
        lines.push(row.join(','));
    }
    
    return lines.join('\n');
};

/**
 * Format Markdown output
 */
TestReporter.prototype.formatMarkdown = function(results, options) {
    options = options || {};
    var includeDetails = options.includeDetails !== false;
    var stats = this.calculateStats(results);
    var lines = [];
    
    lines.push('# LiteGraph Node Test Results');
    lines.push('');
    lines.push('Generated on ' + new Date().toLocaleString());
    lines.push('');
    
    // Summary table
    lines.push('## Summary');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push('| Total Tests | ' + stats.total + ' |');
    lines.push('| Passed | ' + stats.passed + ' |');
    lines.push('| Failed | ' + stats.failed + ' |');
    lines.push('| Skipped | ' + stats.skipped + ' |');
    lines.push('| Success Rate | ' + stats.successRate.toFixed(1) + '% |');
    lines.push('| Total Duration | ' + stats.totalDuration.toFixed(2) + 'ms |');
    lines.push('| Average Duration | ' + stats.averageDuration.toFixed(2) + 'ms |');
    lines.push('');
    
    // Category breakdown
    if (this.getObjectSize(stats.categories) > 0) {
        lines.push('## Results by Category');
        lines.push('');
        lines.push('| Category | Passed | Failed | Total |');
        lines.push('|----------|--------|--------|-------|');
        
        for (var category in stats.categories) {
            if (stats.categories.hasOwnProperty(category)) {
                var categoryStats = stats.categories[category];
                lines.push('| ' + category + ' | ' + categoryStats.passed + ' | ' + categoryStats.failed + ' | ' + categoryStats.total + ' |');
            }
        }
        lines.push('');
    }
    
    // Node type breakdown
    if (this.getObjectSize(stats.nodeTypes) > 0) {
        lines.push('## Results by Node Type');
        lines.push('');
        lines.push('| Node Type | Passed | Failed | Total | Success Rate |');
        lines.push('|-----------|--------|--------|-------|--------------|');
        
        for (var nodeType in stats.nodeTypes) {
            if (stats.nodeTypes.hasOwnProperty(nodeType)) {
                var nodeStats = stats.nodeTypes[nodeType];
                var successRate = nodeStats.total > 0 ? ((nodeStats.passed / nodeStats.total) * 100).toFixed(1) : '0.0';
                lines.push('| ' + nodeType + ' | ' + nodeStats.passed + ' | ' + nodeStats.failed + ' | ' + nodeStats.total + ' | ' + successRate + '% |');
            }
        }
        lines.push('');
    }
    
    // Detailed results
    if (includeDetails) {
        lines.push('## Detailed Results');
        lines.push('');
        
        for (var i = 0; i < results.length; i++) {
            var result = results[i];
            var statusIcon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️';
            
            lines.push('### ' + statusIcon + ' ' + result.testId);
            lines.push('');
            lines.push('- **Status:** ' + result.status.toUpperCase());
            lines.push('- **Duration:** ' + result.duration.toFixed(2) + 'ms');
            
            if (result.nodeType) {
                lines.push('- **Node Type:** ' + result.nodeType);
            }
            
            if (result.description) {
                lines.push('- **Description:** ' + result.description);
            }
            
            if (result.status === 'failed' && result.error) {
                lines.push('- **Error:**');
                lines.push('  ```');
                lines.push('  ' + result.error);
                lines.push('  ```');
            }
            
            if (result.logs && result.logs.length > 0) {
                lines.push('- **Logs:**');
                for (var j = 0; j < result.logs.length; j++) {
                    lines.push('  - ' + result.logs[j]);
                }
            }
            
            lines.push('');
        }
    }
    
    return lines.join('\n');
};

/**
 * Format JUnit XML output
 */
TestReporter.prototype.formatJUnit = function(results, options) {
    options = options || {};
    var suiteName = options.suiteName || 'LiteGraph Tests';
    var stats = this.calculateStats(results);
    
    var xml = [];
    xml.push('<?xml version="1.0" encoding="UTF-8"?>');
    xml.push('<testsuites name="' + suiteName + '" tests="' + stats.total + '" failures="' + stats.failed + '" time="' + (stats.totalDuration / 1000).toFixed(3) + '">');
    
    // Group by node type
    var suites = {};
    for (var i = 0; i < results.length; i++) {
        var result = results[i];
        var nodeType = result.nodeType || 'Unknown';
        if (!suites[nodeType]) {
            suites[nodeType] = [];
        }
        suites[nodeType].push(result);
    }
    
    for (var nodeType in suites) {
        if (suites.hasOwnProperty(nodeType)) {
            var suiteResults = suites[nodeType];
            var suitePassed = 0;
            var suiteFailed = 0;
            var suiteDuration = 0;
            
            for (var j = 0; j < suiteResults.length; j++) {
                var result = suiteResults[j];
                if (result.status === 'passed') suitePassed++;
                else if (result.status === 'failed') suiteFailed++;
                suiteDuration += result.duration || 0;
            }
            
            xml.push('  <testsuite name="' + this.escapeXml(nodeType) + '" tests="' + suiteResults.length + '" failures="' + suiteFailed + '" time="' + (suiteDuration / 1000).toFixed(3) + '">');
            
            for (var k = 0; k < suiteResults.length; k++) {
                var testResult = suiteResults[k];
                xml.push('    <testcase name="' + this.escapeXml(testResult.testId) + '" time="' + (testResult.duration / 1000).toFixed(3) + '">');
                
                if (testResult.status === 'failed') {
                    xml.push('      <failure message="' + this.escapeXml(testResult.error || 'Test failed') + '">');
                    xml.push('        ' + this.escapeXml(testResult.error || 'No error details available'));
                    xml.push('      </failure>');
                } else if (testResult.status === 'skipped') {
                    xml.push('      <skipped/>');
                }
                
                xml.push('    </testcase>');
            }
            
            xml.push('  </testsuite>');
        }
    }
    
    xml.push('</testsuites>');
    return xml.join('\n');
};

/**
 * Generate chart data for visualizations
 */
TestReporter.prototype.generateChartData = function(results, stats) {
    var chartData = {
        // Status distribution
        statusDistribution: {
            labels: ['Passed', 'Failed', 'Skipped'],
            data: [stats.passed, stats.failed, stats.skipped],
            colors: ['#4CAF50', '#F44336', '#FF9800']
        },
        
        // Performance timeline
        performanceTimeline: this.generatePerformanceTimeline(results),
        
        // Category breakdown
        categoryBreakdown: {
            labels: this.getObjectKeys(stats.categories),
            datasets: [
                {
                    label: 'Passed',
                    data: this.getObjectValues(stats.categories, 'passed'),
                    backgroundColor: '#4CAF50'
                },
                {
                    label: 'Failed',
                    data: this.getObjectValues(stats.categories, 'failed'),
                    backgroundColor: '#F44336'
                }
            ]
        },
        
        // Node type performance
        nodeTypePerformance: this.generateNodeTypePerformance(results),
        
        // Duration distribution
        durationDistribution: this.generateDurationDistribution(results),
        
        // Error frequency
        errorFrequency: this.generateErrorFrequency(results)
    };
    
    return chartData;
};

/**
 * Get chart utilities inline
 */
TestReporter.prototype.getChartUtilsInline = function() {
    return '\n' +
        '            function initializeEnhancedCharts(chartData, rawResults, statsData) {\n' +
        '                Chart.defaults.font.family = "Inter, -apple-system, BlinkMacSystemFont, sans-serif";\n' +
        '                Chart.defaults.font.size = 12;\n' +
        '                Chart.defaults.color = "#64748b";\n' +
        '                Chart.defaults.plugins.legend.position = "bottom";\n' +
        '                Chart.defaults.plugins.legend.labels.usePointStyle = true;\n' +
        '                Chart.defaults.plugins.legend.labels.padding = 20;\n' +
        '\n' +
        '                initializeStatusChart(chartData.statusDistribution);\n' +
        '                initializePerformanceChart(chartData.performanceTimeline);\n' +
        '                initializeCategoryChart(chartData.categoryBreakdown);\n' +
        '                initializeNodeTypeChart(chartData.nodeTypePerformance);\n' +
        '                initializeDurationChart(chartData.durationDistribution);\n' +
        '                initializeErrorChart(chartData.errorFrequency);\n' +
        '                initializeTimelineChart(chartData.performanceTimeline);\n' +
        '            }\n' +
        '\n' +
        '            function initializeStatusChart(data) {\n' +
        '                var ctx = document.getElementById("statusChart");\n' +
        '                if (!ctx) return;\n' +
        '\n' +
        '                window.statusChart = new Chart(ctx, {\n' +
        '                    type: "doughnut",\n' +
        '                    data: {\n' +
        '                        labels: data.labels,\n' +
        '                        datasets: [{\n' +
        '                            data: data.data,\n' +
        '                            backgroundColor: data.colors,\n' +
        '                            borderWidth: 0,\n' +
        '                            hoverBorderWidth: 2,\n' +
        '                            hoverBorderColor: "#ffffff"\n' +
        '                        }]\n' +
        '                    },\n' +
        '                    options: {\n' +
        '                        responsive: true,\n' +
        '                        maintainAspectRatio: false,\n' +
        '                        cutout: "60%",\n' +
        '                        plugins: {\n' +
        '                            legend: {\n' +
        '                                position: "bottom",\n' +
        '                                labels: {\n' +
        '                                    padding: 20,\n' +
        '                                    generateLabels: function(chart) {\n' +
        '                                        var data = chart.data;\n' +
        '                                        return data.labels.map(function(label, i) {\n' +
        '                                            return {\n' +
        '                                                text: label + ": " + data.datasets[0].data[i],\n' +
        '                                                fillStyle: data.datasets[0].backgroundColor[i],\n' +
        '                                                strokeStyle: data.datasets[0].backgroundColor[i],\n' +
        '                                                lineWidth: 0,\n' +
        '                                                pointStyle: "circle"\n' +
        '                                            };\n' +
        '                                        });\n' +
        '                                    }\n' +
        '                                }\n' +
        '                            },\n' +
        '                            tooltip: {\n' +
        '                                callbacks: {\n' +
        '                                    label: function(context) {\n' +
        '                                        var total = context.dataset.data.reduce(function(a, b) { return a + b; }, 0);\n' +
        '                                        var percentage = ((context.parsed / total) * 100).toFixed(1);\n' +
        '                                        return context.label + ": " + context.parsed + " (" + percentage + "%)";\n' +
        '                                    }\n' +
        '                                }\n' +
        '                            }\n' +
        '                        },\n' +
        '                        animation: {\n' +
        '                            animateRotate: true,\n' +
        '                            duration: 1000\n' +
        '                        }\n' +
        '                    }\n' +
        '                });\n' +
        '            }\n' +
        '        ';
};

/**
 * Generate performance timeline
 */
TestReporter.prototype.generatePerformanceTimeline = function(results) {
    var timeline = {};
    
    for (var i = 0; i < results.length; i++) {
        var result = results[i];
        var timestamp = result.timestamp || new Date().toISOString();
        var timeKey = timestamp.substring(0, 16); // Group by minute
        
        if (!timeline[timeKey]) {
            timeline[timeKey] = {
                durations: [],
                count: 0
            };
        }
        
        timeline[timeKey].durations.push(result.duration || 0);
        timeline[timeKey].count++;
    }
    
    var labels = this.getObjectKeys(timeline).sort();
    var avgDurations = labels.map(function(key) {
        var durations = timeline[key].durations;
        var sum = durations.reduce(function(a, b) { return a + b; }, 0);
        return sum / durations.length;
    });
    
    return {
        labels: labels,
        datasets: [{
            label: 'Average Duration (ms)',
            data: avgDurations,
            borderColor: '#2196F3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            tension: 0.4
        }]
    };
};

/**
 * Generate node type performance
 */
TestReporter.prototype.generateNodeTypePerformance = function(results) {
    var nodePerformance = {};
    
    for (var i = 0; i < results.length; i++) {
        var result = results[i];
        var nodeType = result.nodeType || 'Unknown';
        
        if (!nodePerformance[nodeType]) {
            nodePerformance[nodeType] = {
                durations: [],
                passed: 0,
                failed: 0,
                total: 0
            };
        }
        
        nodePerformance[nodeType].durations.push(result.duration || 0);
        nodePerformance[nodeType].total++;
        
        if (result.status === 'passed') {
            nodePerformance[nodeType].passed++;
        } else if (result.status === 'failed') {
            nodePerformance[nodeType].failed++;
        }
    }
    
    var labels = this.getObjectKeys(nodePerformance);
    var avgDurations = labels.map(function(nodeType) {
        var durations = nodePerformance[nodeType].durations;
        var sum = durations.reduce(function(a, b) { return a + b; }, 0);
        return sum / durations.length;
    });
    
    var successRates = labels.map(function(nodeType) {
        var stats = nodePerformance[nodeType];
        return stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;
    });
    
    return {
        labels: labels,
        datasets: [
            {
                label: 'Average Duration (ms)',
                data: avgDurations,
                backgroundColor: 'rgba(33, 150, 243, 0.7)',
                yAxisID: 'y'
            },
            {
                label: 'Success Rate (%)',
                data: successRates,
                backgroundColor: 'rgba(76, 175, 80, 0.7)',
                yAxisID: 'y1'
            }
        ]
    };
};

/**
 * Generate duration distribution
 */
TestReporter.prototype.generateDurationDistribution = function(results) {
    var durations = results.map(function(result) { return result.duration || 0; });
    
    if (durations.length === 0) return { labels: [], data: [] };
    
    var min = Math.min.apply(Math, durations);
    var max = Math.max.apply(Math, durations);
    var bucketCount = Math.min(10, Math.ceil(Math.sqrt(durations.length)));
    var bucketSize = (max - min) / bucketCount;
    
    var buckets = new Array(bucketCount).fill(0);
    var labels = [];
    
    for (var i = 0; i < bucketCount; i++) {
        var start = min + (i * bucketSize);
        var end = start + bucketSize;
        labels.push(start.toFixed(1) + '-' + end.toFixed(1) + 'ms');
    }
    
    for (var j = 0; j < durations.length; j++) {
        var duration = durations[j];
        var bucketIndex = Math.min(Math.floor((duration - min) / bucketSize), bucketCount - 1);
        buckets[bucketIndex]++;
    }
    
    return {
        labels: labels,
        datasets: [{
            label: 'Test Count',
            data: buckets,
            backgroundColor: 'rgba(255, 152, 0, 0.7)'
        }]
    };
};

/**
 * Generate error frequency
 */
TestReporter.prototype.generateErrorFrequency = function(results) {
    var errorTypes = {};
    
    for (var i = 0; i < results.length; i++) {
        var result = results[i];
        if (result.status === 'failed' && result.error) {
            var errorType = this.categorizeError(result.error);
            errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
        }
    }
    
    return {
        labels: this.getObjectKeys(errorTypes),
        datasets: [{
            label: 'Error Count',
            data: this.getObjectValues(errorTypes),
            backgroundColor: [
                '#F44336', '#E91E63', '#9C27B0', '#673AB7',
                '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4'
            ]
        }]
    };
};

/**
 * Calculate statistics from results
 */
TestReporter.prototype.calculateStats = function(results) {
    var stats = {
        total: results.length,
        passed: 0,
        failed: 0,
        skipped: 0,
        totalDuration: 0,
        averageDuration: 0,
        successRate: 0,
        categories: {},
        nodeTypes: {}
    };
    
    for (var i = 0; i < results.length; i++) {
        var result = results[i];
        
        // Count by status
        if (result.status === 'passed') {
            stats.passed++;
        } else if (result.status === 'failed') {
            stats.failed++;
        } else if (result.status === 'skipped') {
            stats.skipped++;
        }
        
        // Sum duration
        stats.totalDuration += result.duration || 0;
        
        // Group by category
        var category = this.extractCategory(result.testId);
        if (category) {
            if (!stats.categories[category]) {
                stats.categories[category] = { passed: 0, failed: 0, total: 0 };
            }
            stats.categories[category].total++;
            if (result.status === 'passed') {
                stats.categories[category].passed++;
            } else if (result.status === 'failed') {
                stats.categories[category].failed++;
            }
        }
        
        // Group by node type
        var nodeType = result.nodeType || 'Unknown';
        if (!stats.nodeTypes[nodeType]) {
            stats.nodeTypes[nodeType] = { passed: 0, failed: 0, total: 0 };
        }
        stats.nodeTypes[nodeType].total++;
        if (result.status === 'passed') {
            stats.nodeTypes[nodeType].passed++;
        } else if (result.status === 'failed') {
            stats.nodeTypes[nodeType].failed++;
        }
    }
    
    // Calculate derived stats
    stats.averageDuration = stats.total > 0 ? stats.totalDuration / stats.total : 0;
    stats.successRate = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;
    
    return stats;
};

/**
 * Extract category from test ID
 */
TestReporter.prototype.extractCategory = function(testId) {
    if (!testId) return null;
    var match = testId.match(/^([^_]+)_/);
    return match ? match[1] : null;
};

/**
 * Colorize text for console output
 */
TestReporter.prototype.colorize = function(text, color) {
    var colors = {
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m',
        reset: '\x1b[0m'
    };

    return (colors[color] || '') + text + colors.reset;
};

/**
 * Escape XML special characters
 */
TestReporter.prototype.escapeXml = function(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
};

/**
 * Generate summary text
 */
TestReporter.prototype.generateSummary = function(results, format) {
    format = format || 'console';
    var stats = this.calculateStats(results);

    switch (format) {
        case 'text':
            return 'Tests: ' + stats.total + ', Passed: ' + stats.passed + ', Failed: ' + stats.failed + ', Success Rate: ' + stats.successRate.toFixed(1) + '%';
        case 'json':
            return JSON.stringify(stats);
        default:
            return this.formatConsole(results, { showDetails: false });
    }
};

// Helper methods for ES5 compatibility

TestReporter.prototype.repeat = function(str, count) {
    return new Array(count + 1).join(str);
};

TestReporter.prototype.getObjectSize = function(obj) {
    var count = 0;
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            count++;
        }
    }
    return count;
};

TestReporter.prototype.getObjectKeys = function(obj) {
    var keys = [];
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            keys.push(key);
        }
    }
    return keys;
};

TestReporter.prototype.getObjectValues = function(obj, property) {
    var values = [];
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (property) {
                values.push(obj[key][property] || 0);
            } else {
                values.push(obj[key]);
            }
        }
    }
    return values;
};

TestReporter.prototype.getMapKeys = function(map) {
    var keys = [];
    for (var key in map) {
        if (map.hasOwnProperty(key)) {
            keys.push(key);
        }
    }
    return keys;
};

TestReporter.prototype.getMapValues = function(map, property) {
    var values = [];
    for (var key in map) {
        if (map.hasOwnProperty(key)) {
            if (property) {
                values.push(map[key][property] || 0);
            } else {
                values.push(map[key]);
            }
        }
    }
    return values;
};

TestReporter.prototype.getTopFailingNodes = function(nodeTypes) {
    var nodes = [];
    for (var nodeType in nodeTypes) {
        if (nodeTypes.hasOwnProperty(nodeType)) {
            var nodeStats = nodeTypes[nodeType];
            if (nodeStats.failed > 0) {
                nodes.push({ nodeType: nodeType, count: nodeStats.failed });
            }
        }
    }
    
    nodes.sort(function(a, b) {
        return b.count - a.count;
    });
    
    return nodes.slice(0, 10);
};

TestReporter.prototype.generateErrorPatterns = function(results) {
    var patterns = {};
    
    for (var i = 0; i < results.length; i++) {
        var result = results[i];
        if (result.status === 'failed' && result.error) {
            var pattern = this.categorizeError(result.error);
            patterns[pattern] = (patterns[pattern] || 0) + 1;
        }
    }
    
    var html = '';
    for (var pattern in patterns) {
        if (patterns.hasOwnProperty(pattern)) {
            html += '<div class="error-item">' +
                '<strong>' + this.escapeHtml(pattern) + '</strong>: ' + patterns[pattern] + ' occurrences' +
                '</div>';
        }
    }
    
    return html;
};

TestReporter.prototype.categorizeError = function(error) {
    if (!error) return 'Unknown Error';
    
    if (error.indexOf('TypeError') !== -1) return 'Type Error';
    if (error.indexOf('ReferenceError') !== -1) return 'Reference Error';
    if (error.indexOf('SyntaxError') !== -1) return 'Syntax Error';
    if (error.indexOf('RangeError') !== -1) return 'Range Error';
    if (error.indexOf('timeout') !== -1) return 'Timeout Error';
    if (error.indexOf('network') !== -1) return 'Network Error';
    if (error.indexOf('permission') !== -1) return 'Permission Error';
    
    return 'Other Error';
};

TestReporter.prototype.escapeHtml = function(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

TestReporter.prototype.escapeCsv = function(text) {
    if (typeof text !== 'string') {
        text = String(text);
    }
    
    if (text.indexOf(',') !== -1 || text.indexOf('"') !== -1 || text.indexOf('\n') !== -1) {
        return '"' + text.replace(/"/g, '""') + '"';
    }
    
    return text;
};

window.TestReporter = TestReporter;
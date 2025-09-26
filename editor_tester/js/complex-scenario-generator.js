/**
 * Complex Scenario Generator for LiteGraph Editor Tester
 * Generates advanced testing scenarios including multi-node workflows,
 * circular dependencies, dynamic creation/destruction, and async patterns
 */

/**
 * ComplexScenarioGenerator constructor
 */
function ComplexScenarioGenerator() {
    this.scenarioTemplates = new Map();
    this.workflowPatterns = new Map();
    this.initializeComplexTemplates();
    this.initializeWorkflowPatterns();
}

/**
 * Initialize complex scenario templates
 */
ComplexScenarioGenerator.prototype.initializeComplexTemplates = function() {
    // Multi-node workflow template
    this.scenarioTemplates.set('multi_node_workflow', {
        name: 'Multi-Node Workflow',
        description: 'Complex workflow with multiple connected nodes',
        minNodes: 3,
        maxNodes: 10,
        patterns: ['linear', 'fanout', 'fanin', 'diamond'],
        complexity: 'high'
    });

    // Circular dependency template
    this.scenarioTemplates.set('circular_dependency', {
        name: 'Circular Dependency',
        description: 'Tests circular dependency detection and handling',
        minNodes: 3,
        maxNodes: 5,
        patterns: ['circular'],
        complexity: 'high'
    });

    // Dynamic lifecycle template
    this.scenarioTemplates.set('dynamic_lifecycle', {
        name: 'Dynamic Node Lifecycle',
        description: 'Runtime node creation and destruction',
        minNodes: 5,
        maxNodes: 15,
        patterns: ['dynamic'],
        complexity: 'medium'
    });

    // Async workflow template
    this.scenarioTemplates.set('async_workflow', {
        name: 'Async Workflow',
        description: 'Asynchronous node execution patterns',
        minNodes: 4,
        maxNodes: 8,
        patterns: ['async'],
        complexity: 'high'
    });

    // Error cascade template
    this.scenarioTemplates.set('error_cascade', {
        name: 'Error Cascade',
        description: 'Error propagation through node chains',
        minNodes: 3,
        maxNodes: 7,
        patterns: ['linear', 'fanout'],
        complexity: 'medium'
    });

    // Performance stress template
    this.scenarioTemplates.set('performance_stress', {
        name: 'Performance Stress',
        description: 'High-load performance testing scenarios',
        minNodes: 10,
        maxNodes: 50,
        patterns: ['fanout', 'fanin', 'grid'],
        complexity: 'extreme'
    });
};

/**
 * Initialize workflow patterns
 */
ComplexScenarioGenerator.prototype.initializeWorkflowPatterns = function() {
    var self = this;
    
    // Linear pattern
    this.workflowPatterns.set('linear', {
        name: 'Linear Chain',
        description: 'Sequential node chain',
        generator: function(nodes) {
            return self.generateLinearPattern(nodes);
        }
    });

    // Fan-out pattern
    this.workflowPatterns.set('fanout', {
        name: 'Fan-Out',
        description: 'One input to multiple outputs',
        generator: function(nodes) {
            return self.generateFanOutPattern(nodes);
        }
    });

    // Fan-in pattern
    this.workflowPatterns.set('fanin', {
        name: 'Fan-In',
        description: 'Multiple inputs to one output',
        generator: function(nodes) {
            return self.generateFanInPattern(nodes);
        }
    });

    // Diamond pattern
    this.workflowPatterns.set('diamond', {
        name: 'Diamond',
        description: 'Split and merge pattern',
        generator: function(nodes) {
            return self.generateDiamondPattern(nodes);
        }
    });

    // Circular pattern
    this.workflowPatterns.set('circular', {
        name: 'Circular',
        description: 'Circular dependency pattern',
        generator: function(nodes) {
            return self.generateCircularPattern(nodes);
        }
    });

    // Grid pattern
    this.workflowPatterns.set('grid', {
        name: 'Grid',
        description: 'Grid-like interconnection',
        generator: function(nodes) {
            return self.generateGridPattern(nodes);
        }
    });

    // Dynamic pattern
    this.workflowPatterns.set('dynamic', {
        name: 'Dynamic',
        description: 'Runtime node manipulation',
        generator: function(nodes) {
            return self.generateDynamicPattern(nodes);
        }
    });

    // Async pattern
    this.workflowPatterns.set('async', {
        name: 'Async',
        description: 'Asynchronous execution',
        generator: function(nodes) {
            return self.generateAsyncPattern(nodes);
        }
    });
};

/**
 * Generate complex scenario
 */
ComplexScenarioGenerator.prototype.generateComplexScenario = function(templateName, options) {
    options = options || {};
    
    var template = this.scenarioTemplates.get(templateName);
    if (!template) {
        throw new Error('Unknown scenario template: ' + templateName);
    }

    var nodeCount = options.nodeCount || this.randomBetween(template.minNodes, template.maxNodes);
    var pattern = options.pattern || this.randomChoice(template.patterns);
    
    var nodes = this.generateNodes(nodeCount, options.nodeTypes);
    var connections = this.generateConnections(nodes, pattern);
    
    return {
        name: template.name + ' (' + pattern + ')',
        description: template.description,
        complexity: template.complexity,
        nodes: nodes,
        connections: connections,
        pattern: pattern,
        metadata: {
            nodeCount: nodeCount,
            connectionCount: connections.length,
            template: templateName,
            generatedAt: new Date().toISOString()
        }
    };
};

/**
 * Generate nodes for scenario
 */
ComplexScenarioGenerator.prototype.generateNodes = function(count, nodeTypes) {
    var nodes = [];
    var availableTypes = nodeTypes || this.getAvailableNodeTypes();
    
    for (var i = 0; i < count; i++) {
        var nodeType = this.randomChoice(availableTypes);
        var node = {
            id: 'node_' + i,
            type: nodeType,
            title: nodeType + '_' + i,
            pos: [Math.random() * 800, Math.random() * 600],
            properties: this.generateNodeProperties(nodeType),
            inputs: this.getNodeInputs(nodeType),
            outputs: this.getNodeOutputs(nodeType)
        };
        nodes.push(node);
    }
    
    return nodes;
};

/**
 * Generate connections based on pattern
 */
ComplexScenarioGenerator.prototype.generateConnections = function(nodes, pattern) {
    var patternGenerator = this.workflowPatterns.get(pattern);
    if (!patternGenerator) {
        throw new Error('Unknown pattern: ' + pattern);
    }
    
    return patternGenerator.generator(nodes);
};

/**
 * Generate linear pattern connections
 */
ComplexScenarioGenerator.prototype.generateLinearPattern = function(nodes) {
    var connections = [];
    
    for (var i = 0; i < nodes.length - 1; i++) {
        var sourceNode = nodes[i];
        var targetNode = nodes[i + 1];
        
        if (sourceNode.outputs.length > 0 && targetNode.inputs.length > 0) {
            connections.push({
                source: { node: sourceNode.id, slot: 0 },
                target: { node: targetNode.id, slot: 0 }
            });
        }
    }
    
    return connections;
};

/**
 * Generate fan-out pattern connections
 */
ComplexScenarioGenerator.prototype.generateFanOutPattern = function(nodes) {
    var connections = [];
    
    if (nodes.length < 2) return connections;
    
    var sourceNode = nodes[0];
    
    for (var i = 1; i < nodes.length; i++) {
        var targetNode = nodes[i];
        
        if (sourceNode.outputs.length > 0 && targetNode.inputs.length > 0) {
            connections.push({
                source: { node: sourceNode.id, slot: 0 },
                target: { node: targetNode.id, slot: 0 }
            });
        }
    }
    
    return connections;
};

/**
 * Generate fan-in pattern connections
 */
ComplexScenarioGenerator.prototype.generateFanInPattern = function(nodes) {
    var connections = [];
    
    if (nodes.length < 2) return connections;
    
    var targetNode = nodes[nodes.length - 1];
    
    for (var i = 0; i < nodes.length - 1; i++) {
        var sourceNode = nodes[i];
        
        if (sourceNode.outputs.length > 0 && targetNode.inputs.length > i) {
            connections.push({
                source: { node: sourceNode.id, slot: 0 },
                target: { node: targetNode.id, slot: i }
            });
        }
    }
    
    return connections;
};

/**
 * Generate diamond pattern connections
 */
ComplexScenarioGenerator.prototype.generateDiamondPattern = function(nodes) {
    var connections = [];
    
    if (nodes.length < 4) return this.generateLinearPattern(nodes);
    
    var input = nodes[0];
    var output = nodes[nodes.length - 1];
    var middle = nodes.slice(1, -1);
    
    // Connect input to all middle nodes
    for (var i = 0; i < middle.length; i++) {
        if (input.outputs.length > 0 && middle[i].inputs.length > 0) {
            connections.push({
                source: { node: input.id, slot: 0 },
                target: { node: middle[i].id, slot: 0 }
            });
        }
    }
    
    // Connect all middle nodes to output
    for (var i = 0; i < middle.length; i++) {
        if (middle[i].outputs.length > 0 && output.inputs.length > i) {
            connections.push({
                source: { node: middle[i].id, slot: 0 },
                target: { node: output.id, slot: i }
            });
        }
    }
    
    return connections;
};

/**
 * Generate circular pattern connections
 */
ComplexScenarioGenerator.prototype.generateCircularPattern = function(nodes) {
    var connections = [];
    
    // Create a circular chain
    for (var i = 0; i < nodes.length; i++) {
        var sourceNode = nodes[i];
        var targetNode = nodes[(i + 1) % nodes.length];
        
        if (sourceNode.outputs.length > 0 && targetNode.inputs.length > 0) {
            connections.push({
                source: { node: sourceNode.id, slot: 0 },
                target: { node: targetNode.id, slot: 0 }
            });
        }
    }
    
    return connections;
};

/**
 * Generate grid pattern connections
 */
ComplexScenarioGenerator.prototype.generateGridPattern = function(nodes) {
    var connections = [];
    var gridSize = Math.ceil(Math.sqrt(nodes.length));
    
    for (var i = 0; i < nodes.length; i++) {
        var row = Math.floor(i / gridSize);
        var col = i % gridSize;
        
        // Connect to right neighbor
        if (col < gridSize - 1 && i + 1 < nodes.length) {
            var rightNode = nodes[i + 1];
            if (nodes[i].outputs.length > 0 && rightNode.inputs.length > 0) {
                connections.push({
                    source: { node: nodes[i].id, slot: 0 },
                    target: { node: rightNode.id, slot: 0 }
                });
            }
        }
        
        // Connect to bottom neighbor
        if (row < gridSize - 1 && i + gridSize < nodes.length) {
            var bottomNode = nodes[i + gridSize];
            if (nodes[i].outputs.length > 1 && bottomNode.inputs.length > 0) {
                connections.push({
                    source: { node: nodes[i].id, slot: Math.min(1, nodes[i].outputs.length - 1) },
                    target: { node: bottomNode.id, slot: 0 }
                });
            }
        }
    }
    
    return connections;
};

/**
 * Generate dynamic pattern connections
 */
ComplexScenarioGenerator.prototype.generateDynamicPattern = function(nodes) {
    var connections = this.generateLinearPattern(nodes);
    
    // Add dynamic behavior metadata
    for (var i = 0; i < nodes.length; i++) {
        nodes[i].dynamicBehavior = {
            canCreate: Math.random() > 0.7,
            canDestroy: Math.random() > 0.8,
            canModify: Math.random() > 0.5
        };
    }
    
    return connections;
};

/**
 * Generate async pattern connections
 */
ComplexScenarioGenerator.prototype.generateAsyncPattern = function(nodes) {
    var connections = this.generateLinearPattern(nodes);
    
    // Add async behavior to nodes
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        node.asyncBehavior = {
            delay: Math.random() * 1000,
            isAsync: Math.random() > 0.5
        };
        
        // Override onExecute for async simulation
        if (node.asyncBehavior.isAsync) {
            node.onExecute = function() {
                var self = this;
                setTimeout(function() {
                    // Simulate async work completion
                    if (self.outputs && self.outputs.length > 0) {
                        self.setOutputData(0, 'async_result_' + Date.now());
                    }
                }, self.asyncBehavior.delay);
            };
        }
    }
    
    return connections;
};

/**
 * Get available node types
 */
ComplexScenarioGenerator.prototype.getAvailableNodeTypes = function() {
    if (typeof LiteGraph !== 'undefined' && LiteGraph.registered_node_types) {
        return Object.keys(LiteGraph.registered_node_types);
    }
    
    // Fallback node types
    return [
        'basic/const',
        'basic/watch',
        'math/operation',
        'logic/compare',
        'string/concatenate',
        'events/sequence',
        'time/delay'
    ];
};

/**
 * Generate node properties
 */
ComplexScenarioGenerator.prototype.generateNodeProperties = function(nodeType) {
    var properties = {};
    
    // Generate random properties based on node type
    if (nodeType.includes('math')) {
        properties.operation = this.randomChoice(['+', '-', '*', '/', '%']);
        properties.value = Math.random() * 100;
    } else if (nodeType.includes('logic')) {
        properties.condition = this.randomChoice(['>', '<', '==', '!=', '>=', '<=']);
        properties.threshold = Math.random() * 10;
    } else if (nodeType.includes('string')) {
        properties.separator = this.randomChoice([' ', ',', '-', '_']);
        properties.prefix = 'test_';
    } else if (nodeType.includes('time')) {
        properties.delay = Math.random() * 1000;
    }
    
    return properties;
};

/**
 * Get node inputs
 */
ComplexScenarioGenerator.prototype.getNodeInputs = function(nodeType) {
    if (nodeType.includes('const')) {
        return [];
    } else if (nodeType.includes('math') || nodeType.includes('logic')) {
        return [
            { name: 'A', type: 'number' },
            { name: 'B', type: 'number' }
        ];
    } else if (nodeType.includes('string')) {
        return [
            { name: 'text1', type: 'string' },
            { name: 'text2', type: 'string' }
        ];
    } else {
        return [{ name: 'input', type: '*' }];
    }
};

/**
 * Get node outputs
 */
ComplexScenarioGenerator.prototype.getNodeOutputs = function(nodeType) {
    if (nodeType.includes('watch')) {
        return [];
    } else {
        return [{ name: 'output', type: '*' }];
    }
};

/**
 * Generate test cases for scenario
 */
ComplexScenarioGenerator.prototype.generateTestCases = function(scenario) {
    var testCases = [];
    
    // Basic execution test
    testCases.push({
        name: 'Basic Execution - ' + scenario.name,
        description: 'Test basic scenario execution',
        type: 'execution',
        scenario: scenario,
        expectedResults: this.generateExpectedResults(scenario)
    });
    
    // Error handling test
    testCases.push({
        name: 'Error Handling - ' + scenario.name,
        description: 'Test error handling in scenario',
        type: 'error_handling',
        scenario: this.injectErrors(scenario),
        expectedResults: { shouldFail: true }
    });
    
    // Performance test
    if (scenario.complexity === 'high' || scenario.complexity === 'extreme') {
        testCases.push({
            name: 'Performance - ' + scenario.name,
            description: 'Test scenario performance',
            type: 'performance',
            scenario: scenario,
            expectedResults: {
                maxExecutionTime: scenario.nodes.length * 100,
                maxMemoryUsage: scenario.nodes.length * 1024 * 1024
            }
        });
    }
    
    return testCases;
};

/**
 * Generate expected results
 */
ComplexScenarioGenerator.prototype.generateExpectedResults = function(scenario) {
    return {
        executionSuccess: true,
        nodesExecuted: scenario.nodes.length,
        connectionsValid: scenario.connections.length,
        outputsGenerated: scenario.nodes.filter(function(node) {
            return node.outputs.length > 0;
        }).length
    };
};

/**
 * Inject errors into scenario
 */
ComplexScenarioGenerator.prototype.injectErrors = function(scenario) {
    var errorScenario = JSON.parse(JSON.stringify(scenario));
    
    // Randomly corrupt some nodes
    for (var i = 0; i < errorScenario.nodes.length; i++) {
        if (Math.random() > 0.8) {
            var node = errorScenario.nodes[i];
            // Inject various types of errors
            if (Math.random() > 0.5) {
                node.type = 'invalid/node/type';
            } else {
                node.properties = { invalidProperty: 'error' };
            }
        }
    }
    
    return errorScenario;
};

/**
 * Utility: Random number between min and max
 */
ComplexScenarioGenerator.prototype.randomBetween = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Utility: Random choice from array
 */
ComplexScenarioGenerator.prototype.randomChoice = function(array) {
    return array[Math.floor(Math.random() * array.length)];
};

/**
 * Get all scenario templates
 */
ComplexScenarioGenerator.prototype.getScenarioTemplates = function() {
    var templates = {};
    var self = this;
    this.scenarioTemplates.forEach(function(template, key) {
        templates[key] = template;
    });
    return templates;
};

/**
 * Get all workflow patterns
 */
ComplexScenarioGenerator.prototype.getWorkflowPatterns = function() {
    var patterns = {};
    var self = this;
    this.workflowPatterns.forEach(function(pattern, key) {
        patterns[key] = pattern;
    });
    return patterns;
};

// Create global instance
window.ComplexScenarioGenerator = ComplexScenarioGenerator;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComplexScenarioGenerator;
}
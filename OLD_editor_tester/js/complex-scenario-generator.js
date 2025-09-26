/**
 * Complex Scenario Test Generator
 * Generates sophisticated test scenarios for complex node interactions and workflows
 */

import { LiteGraph } from '/src/litegraph.js';
import TestCaseGenerator from './test-generator.js';

export class ComplexScenarioGenerator extends TestCaseGenerator {
    constructor() {
        super();
        this.scenarioTemplates = new Map();
        this.workflowPatterns = new Map();
        this.initializeComplexTemplates();
        this.initializeWorkflowPatterns();
    }

    /**
     * Initialize complex scenario templates
     */
    initializeComplexTemplates() {
        // Multi-node workflow tests
        this.scenarioTemplates.set('workflow', {
            name: 'Multi-Node Workflow',
            description: 'Tests complex workflows with multiple interconnected nodes',
            category: 'workflow',
            priority: 'high',
            generate: (nodeTypes, config) => this.generateWorkflowTest(nodeTypes, config)
        });

        // Circular dependency tests
        this.scenarioTemplates.set('circular_dependency', {
            name: 'Circular Dependency Detection',
            description: 'Tests detection and handling of circular dependencies',
            category: 'dependency',
            priority: 'high',
            generate: (nodeTypes, config) => this.generateCircularDependencyTest(nodeTypes, config)
        });

        // Dynamic node creation tests
        this.scenarioTemplates.set('dynamic_creation', {
            name: 'Dynamic Node Creation',
            description: 'Tests runtime node creation and destruction scenarios',
            category: 'dynamic',
            priority: 'medium',
            generate: (nodeTypes, config) => this.generateDynamicCreationTest(nodeTypes, config)
        });

        // Async workflow tests
        this.scenarioTemplates.set('async_workflow', {
            name: 'Asynchronous Workflow',
            description: 'Tests complex asynchronous node execution patterns',
            category: 'async',
            priority: 'high',
            generate: (nodeTypes, config) => this.generateAsyncWorkflowTest(nodeTypes, config)
        });

        // Data transformation pipeline tests
        this.scenarioTemplates.set('data_pipeline', {
            name: 'Data Transformation Pipeline',
            description: 'Tests complex data transformation workflows',
            category: 'pipeline',
            priority: 'high',
            generate: (nodeTypes, config) => this.generateDataPipelineTest(nodeTypes, config)
        });

        // Error propagation tests
        this.scenarioTemplates.set('error_propagation', {
            name: 'Error Propagation',
            description: 'Tests how errors propagate through complex node networks',
            category: 'error',
            priority: 'high',
            generate: (nodeTypes, config) => this.generateErrorPropagationTest(nodeTypes, config)
        });

        // Performance bottleneck tests
        this.scenarioTemplates.set('bottleneck_detection', {
            name: 'Performance Bottleneck Detection',
            description: 'Tests identification of performance bottlenecks in complex workflows',
            category: 'performance',
            priority: 'medium',
            generate: (nodeTypes, config) => this.generateBottleneckTest(nodeTypes, config)
        });

        // State synchronization tests
        this.scenarioTemplates.set('state_sync', {
            name: 'State Synchronization',
            description: 'Tests state synchronization across multiple nodes',
            category: 'state',
            priority: 'medium',
            generate: (nodeTypes, config) => this.generateStateSyncTest(nodeTypes, config)
        });
    }

    /**
     * Initialize common workflow patterns
     */
    initializeWorkflowPatterns() {
        // Linear pipeline pattern
        this.workflowPatterns.set('linear', {
            name: 'Linear Pipeline',
            description: 'Sequential processing pipeline',
            generate: (nodeTypes) => this.generateLinearPattern(nodeTypes)
        });

        // Fan-out pattern
        this.workflowPatterns.set('fan_out', {
            name: 'Fan-Out Pattern',
            description: 'One input node feeding multiple processing nodes',
            generate: (nodeTypes) => this.generateFanOutPattern(nodeTypes)
        });

        // Fan-in pattern
        this.workflowPatterns.set('fan_in', {
            name: 'Fan-In Pattern',
            description: 'Multiple input nodes feeding into one aggregation node',
            generate: (nodeTypes) => this.generateFanInPattern(nodeTypes)
        });

        // Diamond pattern
        this.workflowPatterns.set('diamond', {
            name: 'Diamond Pattern',
            description: 'Split-process-merge workflow pattern',
            generate: (nodeTypes) => this.generateDiamondPattern(nodeTypes)
        });

        // Tree pattern
        this.workflowPatterns.set('tree', {
            name: 'Tree Pattern',
            description: 'Hierarchical processing tree',
            generate: (nodeTypes) => this.generateTreePattern(nodeTypes)
        });

        // Mesh pattern
        this.workflowPatterns.set('mesh', {
            name: 'Mesh Pattern',
            description: 'Complex interconnected node mesh',
            generate: (nodeTypes) => this.generateMeshPattern(nodeTypes)
        });
    }

    /**
     * Generate complex test scenarios for multiple node types
     */
    generateComplexScenarios(nodeTypes, options = {}) {
        const scenarios = [];
        const config = {
            maxNodes: options.maxNodes || 10,
            maxConnections: options.maxConnections || 20,
            includeAsyncNodes: options.includeAsyncNodes !== false,
            includeErrorScenarios: options.includeErrorScenarios !== false,
            complexityLevel: options.complexityLevel || 'medium',
            ...options
        };

        // Generate scenarios based on templates
        for (const [templateId, template] of this.scenarioTemplates) {
            if (this.shouldGenerateScenario(templateId, config)) {
                try {
                    const scenario = template.generate(nodeTypes, config);
                    if (scenario) {
                        scenarios.push(scenario);
                    }
                } catch (error) {
                    console.warn(`Failed to generate ${templateId} scenario:`, error);
                }
            }
        }

        return scenarios;
    }

    /**
     * Generate workflow test scenario
     */
    generateWorkflowTest(nodeTypes, config) {
        const selectedNodes = this.selectNodesForWorkflow(nodeTypes, config.maxNodes);
        const pattern = this.selectWorkflowPattern(selectedNodes, config);
        
        return {
            name: `Complex Workflow - ${pattern.name}`,
            description: `Tests ${pattern.description} with ${selectedNodes.length} nodes`,
            category: 'workflow',
            priority: 'high',
            timeout: 30000,
            setup: (graph) => {
                const nodes = [];
                const connections = [];
                
                // Create nodes
                for (const nodeType of selectedNodes) {
                    const NodeClass = LiteGraph.registered_node_types[nodeType];
                    if (NodeClass) {
                        const node = new NodeClass();
                        node.id = nodes.length;
                        graph.add(node);
                        nodes.push(node);
                    }
                }
                
                // Create connections based on pattern
                const patternConnections = pattern.generate(nodes);
                for (const conn of patternConnections) {
                    try {
                        nodes[conn.from].connect(conn.fromSlot, nodes[conn.to], conn.toSlot);
                        connections.push(conn);
                    } catch (error) {
                        console.warn(`Failed to connect nodes:`, error);
                    }
                }
                
                return { nodes, connections, pattern: pattern.name };
            },
            execute: (graph, setupData) => {
                const results = {
                    executionOrder: [],
                    dataFlow: [],
                    performance: {},
                    errors: []
                };
                
                const startTime = performance.now();
                
                try {
                    // Execute workflow
                    graph.runStep();
                    
                    // Collect execution data
                    for (const node of setupData.nodes) {
                        if (node.executionTime) {
                            results.executionOrder.push({
                                nodeId: node.id,
                                nodeType: node.type,
                                executionTime: node.executionTime
                            });
                        }
                        
                        // Check data flow
                        if (node.outputs) {
                            for (let i = 0; i < node.outputs.length; i++) {
                                const outputData = node.getOutputData(i);
                                if (outputData !== undefined) {
                                    results.dataFlow.push({
                                        nodeId: node.id,
                                        outputSlot: i,
                                        data: outputData,
                                        dataType: typeof outputData
                                    });
                                }
                            }
                        }
                    }
                    
                    results.performance.totalTime = performance.now() - startTime;
                    results.performance.nodesExecuted = results.executionOrder.length;
                    results.performance.dataFlowItems = results.dataFlow.length;
                    
                } catch (error) {
                    results.errors.push({
                        type: 'execution_error',
                        message: error.message,
                        stack: error.stack
                    });
                }
                
                return results;
            },
            validate: (graph, setupData, executionResult) => {
                const validation = { passed: true, issues: [], metrics: {} };
                
                // Validate execution order
                if (executionResult.executionOrder.length === 0) {
                    validation.issues.push('No nodes were executed');
                    validation.passed = false;
                }
                
                // Validate data flow
                if (executionResult.dataFlow.length === 0 && setupData.connections.length > 0) {
                    validation.issues.push('No data flow detected despite connections');
                    validation.passed = false;
                }
                
                // Check for errors
                if (executionResult.errors.length > 0) {
                    validation.issues.push(`${executionResult.errors.length} execution errors occurred`);
                    validation.passed = false;
                }
                
                // Performance validation
                if (executionResult.performance.totalTime > 10000) {
                    validation.issues.push('Workflow execution took too long (>10s)');
                }
                
                validation.metrics = {
                    nodesExecuted: executionResult.executionOrder.length,
                    dataFlowItems: executionResult.dataFlow.length,
                    executionTime: executionResult.performance.totalTime,
                    errorCount: executionResult.errors.length
                };
                
                return validation;
            }
        };
    }

    /**
     * Generate circular dependency test
     */
    generateCircularDependencyTest(nodeTypes, config) {
        return {
            name: 'Circular Dependency Detection',
            description: 'Tests detection and handling of circular dependencies',
            category: 'dependency',
            priority: 'high',
            timeout: 15000,
            setup: (graph) => {
                const nodes = [];
                
                // Create a simple circular dependency: A -> B -> C -> A
                const nodeTypesList = Array.from(nodeTypes).slice(0, 3);
                
                for (let i = 0; i < 3; i++) {
                    const nodeType = nodeTypesList[i % nodeTypesList.length];
                    const NodeClass = LiteGraph.registered_node_types[nodeType];
                    if (NodeClass) {
                        const node = new NodeClass();
                        node.id = i;
                        graph.add(node);
                        nodes.push(node);
                    }
                }
                
                // Create circular connections
                const connections = [];
                for (let i = 0; i < nodes.length; i++) {
                    const fromNode = nodes[i];
                    const toNode = nodes[(i + 1) % nodes.length];
                    
                    if (fromNode.outputs && fromNode.outputs.length > 0 &&
                        toNode.inputs && toNode.inputs.length > 0) {
                        try {
                            fromNode.connect(0, toNode, 0);
                            connections.push({ from: i, to: (i + 1) % nodes.length });
                        } catch (error) {
                            console.warn('Failed to create circular connection:', error);
                        }
                    }
                }
                
                return { nodes, connections };
            },
            execute: (graph, setupData) => {
                const results = {
                    circularDependencyDetected: false,
                    executionAttempted: false,
                    errors: [],
                    warnings: []
                };
                
                try {
                    // Attempt to execute the graph
                    results.executionAttempted = true;
                    graph.runStep();
                    
                    // If we get here without error, check if circular dependency was handled
                    results.circularDependencyDetected = false;
                    
                } catch (error) {
                    if (error.message.includes('circular') || error.message.includes('cycle')) {
                        results.circularDependencyDetected = true;
                    } else {
                        results.errors.push({
                            type: 'unexpected_error',
                            message: error.message
                        });
                    }
                }
                
                return results;
            },
            validate: (graph, setupData, executionResult) => {
                const validation = { passed: true, issues: [] };
                
                // Circular dependency should be detected or handled gracefully
                if (!executionResult.circularDependencyDetected && executionResult.errors.length > 0) {
                    validation.issues.push('Circular dependency not properly detected or handled');
                    validation.passed = false;
                }
                
                return validation;
            }
        };
    }

    /**
     * Generate dynamic node creation test
     */
    generateDynamicCreationTest(nodeTypes, config) {
        return {
            name: 'Dynamic Node Creation and Destruction',
            description: 'Tests runtime node lifecycle management',
            category: 'dynamic',
            priority: 'medium',
            timeout: 20000,
            execute: (graph) => {
                const results = {
                    nodesCreated: 0,
                    nodesDestroyed: 0,
                    creationErrors: [],
                    destructionErrors: [],
                    memoryLeaks: []
                };
                
                const createdNodes = [];
                const nodeTypesList = Array.from(nodeTypes).slice(0, 5);
                
                // Dynamic creation phase
                for (let i = 0; i < 10; i++) {
                    try {
                        const nodeType = nodeTypesList[i % nodeTypesList.length];
                        const NodeClass = LiteGraph.registered_node_types[nodeType];
                        
                        if (NodeClass) {
                            const node = new NodeClass();
                            graph.add(node);
                            createdNodes.push(node);
                            results.nodesCreated++;
                        }
                    } catch (error) {
                        results.creationErrors.push({
                            iteration: i,
                            error: error.message
                        });
                    }
                }
                
                // Dynamic destruction phase
                for (const node of createdNodes) {
                    try {
                        graph.remove(node);
                        results.nodesDestroyed++;
                    } catch (error) {
                        results.destructionErrors.push({
                            nodeId: node.id,
                            error: error.message
                        });
                    }
                }
                
                return results;
            },
            validate: (graph, setupData, executionResult) => {
                const validation = { passed: true, issues: [] };
                
                if (executionResult.creationErrors.length > 0) {
                    validation.issues.push(`${executionResult.creationErrors.length} node creation errors`);
                }
                
                if (executionResult.destructionErrors.length > 0) {
                    validation.issues.push(`${executionResult.destructionErrors.length} node destruction errors`);
                }
                
                if (executionResult.nodesCreated !== executionResult.nodesDestroyed) {
                    validation.issues.push('Node creation/destruction count mismatch');
                    validation.passed = false;
                }
                
                return validation;
            }
        };
    }

    /**
     * Generate asynchronous workflow test
     */
    generateAsyncWorkflowTest(nodeTypes, config) {
        return {
            name: 'Asynchronous Workflow Execution',
            description: 'Tests complex asynchronous node execution patterns',
            category: 'async',
            priority: 'high',
            timeout: 25000,
            setup: (graph) => {
                const asyncNodes = [];
                const nodeTypesList = Array.from(nodeTypes).slice(0, 4);
                
                // Create nodes with simulated async behavior
                for (const nodeType of nodeTypesList) {
                    const NodeClass = LiteGraph.registered_node_types[nodeType];
                    if (NodeClass) {
                        const node = new NodeClass();
                        
                        // Add async execution simulation
                        const originalExecute = node.onExecute;
                        node.onExecute = async function() {
                            // Simulate async delay
                            await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
                            if (originalExecute) {
                                return originalExecute.call(this);
                            }
                        };
                        
                        graph.add(node);
                        asyncNodes.push(node);
                    }
                }
                
                // Create connections
                for (let i = 0; i < asyncNodes.length - 1; i++) {
                    const fromNode = asyncNodes[i];
                    const toNode = asyncNodes[i + 1];
                    
                    if (fromNode.outputs && fromNode.outputs.length > 0 &&
                        toNode.inputs && toNode.inputs.length > 0) {
                        try {
                            fromNode.connect(0, toNode, 0);
                        } catch (error) {
                            console.warn('Failed to connect async nodes:', error);
                        }
                    }
                }
                
                return { asyncNodes };
            },
            execute: async (graph, setupData) => {
                const results = {
                    executionTimes: [],
                    completionOrder: [],
                    errors: [],
                    totalTime: 0
                };
                
                const startTime = performance.now();
                
                try {
                    // Execute async workflow
                    const promises = setupData.asyncNodes.map(async (node, index) => {
                        const nodeStartTime = performance.now();
                        
                        try {
                            if (typeof node.onExecute === 'function') {
                                await node.onExecute();
                            }
                            
                            const nodeEndTime = performance.now();
                            const executionTime = nodeEndTime - nodeStartTime;
                            
                            results.executionTimes.push({
                                nodeIndex: index,
                                executionTime
                            });
                            
                            results.completionOrder.push(index);
                            
                        } catch (error) {
                            results.errors.push({
                                nodeIndex: index,
                                error: error.message
                            });
                        }
                    });
                    
                    await Promise.all(promises);
                    
                } catch (error) {
                    results.errors.push({
                        type: 'workflow_error',
                        error: error.message
                    });
                }
                
                results.totalTime = performance.now() - startTime;
                return results;
            },
            validate: (graph, setupData, executionResult) => {
                const validation = { passed: true, issues: [] };
                
                if (executionResult.errors.length > 0) {
                    validation.issues.push(`${executionResult.errors.length} async execution errors`);
                    validation.passed = false;
                }
                
                if (executionResult.completionOrder.length !== setupData.asyncNodes.length) {
                    validation.issues.push('Not all async nodes completed execution');
                    validation.passed = false;
                }
                
                if (executionResult.totalTime > 20000) {
                    validation.issues.push('Async workflow took too long to complete');
                }
                
                return validation;
            }
        };
    }

    /**
     * Helper methods for workflow pattern generation
     */
    generateLinearPattern(nodes) {
        const connections = [];
        for (let i = 0; i < nodes.length - 1; i++) {
            connections.push({
                from: i,
                to: i + 1,
                fromSlot: 0,
                toSlot: 0
            });
        }
        return connections;
    }

    generateFanOutPattern(nodes) {
        const connections = [];
        if (nodes.length > 1) {
            for (let i = 1; i < nodes.length; i++) {
                connections.push({
                    from: 0,
                    to: i,
                    fromSlot: 0,
                    toSlot: 0
                });
            }
        }
        return connections;
    }

    generateFanInPattern(nodes) {
        const connections = [];
        if (nodes.length > 1) {
            const lastIndex = nodes.length - 1;
            for (let i = 0; i < lastIndex; i++) {
                connections.push({
                    from: i,
                    to: lastIndex,
                    fromSlot: 0,
                    toSlot: i
                });
            }
        }
        return connections;
    }

    generateDiamondPattern(nodes) {
        const connections = [];
        if (nodes.length >= 4) {
            // Split: 0 -> 1, 2
            connections.push({ from: 0, to: 1, fromSlot: 0, toSlot: 0 });
            connections.push({ from: 0, to: 2, fromSlot: 0, toSlot: 0 });
            // Merge: 1, 2 -> 3
            connections.push({ from: 1, to: 3, fromSlot: 0, toSlot: 0 });
            connections.push({ from: 2, to: 3, fromSlot: 0, toSlot: 1 });
        }
        return connections;
    }

    generateTreePattern(nodes) {
        const connections = [];
        for (let i = 0; i < Math.floor(nodes.length / 2); i++) {
            const leftChild = 2 * i + 1;
            const rightChild = 2 * i + 2;
            
            if (leftChild < nodes.length) {
                connections.push({ from: i, to: leftChild, fromSlot: 0, toSlot: 0 });
            }
            if (rightChild < nodes.length) {
                connections.push({ from: i, to: rightChild, fromSlot: 0, toSlot: 0 });
            }
        }
        return connections;
    }

    generateMeshPattern(nodes) {
        const connections = [];
        const maxConnections = Math.min(nodes.length * 2, 20); // Limit complexity
        
        for (let i = 0; i < maxConnections; i++) {
            const from = Math.floor(Math.random() * nodes.length);
            const to = Math.floor(Math.random() * nodes.length);
            
            if (from !== to) {
                connections.push({
                    from,
                    to,
                    fromSlot: 0,
                    toSlot: 0
                });
            }
        }
        
        return connections;
    }

    /**
     * Helper methods
     */
    selectNodesForWorkflow(nodeTypes, maxNodes) {
        const nodeTypesList = Array.from(nodeTypes);
        const selectedCount = Math.min(maxNodes, nodeTypesList.length);
        
        // Shuffle and select
        const shuffled = nodeTypesList.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, selectedCount);
    }

    selectWorkflowPattern(nodes, config) {
        const patterns = Array.from(this.workflowPatterns.values());
        const complexityLevel = config.complexityLevel || 'medium';
        
        // Select pattern based on complexity level and node count
        if (complexityLevel === 'low' || nodes.length <= 2) {
            return this.workflowPatterns.get('linear');
        } else if (complexityLevel === 'medium' || nodes.length <= 4) {
            const mediumPatterns = ['linear', 'fan_out', 'fan_in', 'diamond'];
            const randomPattern = mediumPatterns[Math.floor(Math.random() * mediumPatterns.length)];
            return this.workflowPatterns.get(randomPattern);
        } else {
            const complexPatterns = ['tree', 'mesh', 'diamond'];
            const randomPattern = complexPatterns[Math.floor(Math.random() * complexPatterns.length)];
            return this.workflowPatterns.get(randomPattern);
        }
    }

    shouldGenerateScenario(templateId, config) {
        // Skip async scenarios if not enabled
        if (templateId === 'async_workflow' && !config.includeAsyncNodes) {
            return false;
        }
        
        // Skip error scenarios if not enabled
        if (templateId.includes('error') && !config.includeErrorScenarios) {
            return false;
        }
        
        // Skip complex scenarios for low complexity
        if (config.complexityLevel === 'low' && 
            ['mesh', 'bottleneck_detection', 'state_sync'].includes(templateId)) {
            return false;
        }
        
        return true;
    }

    /**
     * Generate additional complex scenario methods (stubs for future implementation)
     */
    generateDataPipelineTest(nodeTypes, config) {
        // TODO: Implement data transformation pipeline test
        return null;
    }

    generateErrorPropagationTest(nodeTypes, config) {
        // TODO: Implement error propagation test
        return null;
    }

    generateBottleneckTest(nodeTypes, config) {
        // TODO: Implement performance bottleneck detection test
        return null;
    }

    generateStateSyncTest(nodeTypes, config) {
        // TODO: Implement state synchronization test
        return null;
    }
}

export default ComplexScenarioGenerator;
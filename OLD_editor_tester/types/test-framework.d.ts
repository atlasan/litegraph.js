/**
 * TypeScript definitions for the LiteGraph Editor Testing Framework
 * Provides comprehensive type definitions for all testing components
 */

// Core LiteGraph types (basic definitions)
export interface LGraphNode {
    id: number;
    type: string;
    title?: string;
    pos: [number, number];
    size: [number, number];
    inputs?: LGraphNodeInput[];
    outputs?: LGraphNodeOutput[];
    properties?: Record<string, any>;
    flags?: Record<string, any>;
    
    onExecute?(): void;
    onStart?(): void;
    onStop?(): void;
    onDrawBackground?(ctx: CanvasRenderingContext2D): void;
    onDrawForeground?(ctx: CanvasRenderingContext2D): void;
    onMouseDown?(event: MouseEvent, pos: [number, number], canvas: any): boolean;
    onMouseMove?(event: MouseEvent, pos: [number, number], canvas: any): boolean;
    onMouseUp?(event: MouseEvent, pos: [number, number], canvas: any): boolean;
    onKeyDown?(event: KeyboardEvent): boolean;
    onKeyUp?(event: KeyboardEvent): boolean;
    
    connect(outputSlot: number, targetNode: LGraphNode, inputSlot: number): boolean;
    disconnect(outputSlot: number, targetNode?: LGraphNode, inputSlot?: number): boolean;
    getInputData(slot: number): any;
    setOutputData(slot: number, data: any): void;
    getOutputData(slot: number): any;
    
    serialize(): any;
    configure(data: any): void;
    clone(): LGraphNode;
    
    executionTime?: number;
}

export interface LGraphNodeInput {
    name: string;
    type: string;
    link?: number;
    widget?: any;
}

export interface LGraphNodeOutput {
    name: string;
    type: string;
    links?: number[];
}

export interface LGraph {
    _nodes: LGraphNode[];
    _nodes_by_id: Record<number, LGraphNode>;
    _nodes_in_order: LGraphNode[];
    
    add(node: LGraphNode): void;
    remove(node: LGraphNode): void;
    clear(): void;
    runStep(): void;
    start(): void;
    stop(): void;
    
    serialize(): any;
    configure(data: any): void;
    
    getNodeById(id: number): LGraphNode | null;
    getNodesByType(type: string): LGraphNode[];
}

export interface LiteGraphStatic {
    registered_node_types: Record<string, new() => LGraphNode>;
    registerNodeType(type: string, nodeClass: new() => LGraphNode): void;
    createNode(type: string): LGraphNode | null;
}

// Test Framework Types
export interface TestCase {
    name: string;
    description?: string;
    category?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    timeout?: number;
    tags?: string[];
    
    setup?(): Promise<any> | any;
    execute(node?: LGraphNode, graph?: LGraph): Promise<any> | any;
    teardown?(): Promise<void> | void;
    
    // Validation function
    validate?(result: any): TestValidationResult;
}

export interface TestValidationResult {
    passed: boolean;
    issues: string[];
    metrics?: Record<string, any>;
    warnings?: string[];
}

export interface TestResult {
    testName: string;
    nodeType?: string;
    category: string;
    priority: string;
    status: 'passed' | 'failed' | 'skipped' | 'timeout';
    duration: number;
    startTime: number;
    endTime: number;
    error?: Error;
    result?: any;
    validation?: TestValidationResult;
    memoryUsage?: {
        before: number;
        after: number;
        peak: number;
    };
}

export interface TestStats {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    timeout: number;
    duration: number;
    
    // Enhanced statistics
    medianDuration?: number;
    minDuration?: number;
    maxDuration?: number;
    standardDeviation?: number;
    errorRate?: number;
    successRate?: number;
    
    categories: Record<string, {
        total: number;
        passed: number;
        failed: number;
        duration: number;
    }>;
    
    priorities: Record<string, {
        total: number;
        passed: number;
        failed: number;
        duration: number;
    }>;
    
    nodeTypes: Record<string, {
        total: number;
        passed: number;
        failed: number;
        duration: number;
    }>;
}

export interface TestFrameworkConfig {
    timeout: number;
    maxConcurrentTests: number;
    memoryThreshold: number;
    enableMemoryTracking: boolean;
    enablePerformanceTracking: boolean;
    retryFailedTests: boolean;
    maxRetries: number;
    
    // Object pooling configuration
    objectPooling: {
        enabled: boolean;
        maxPoolSize: number;
        cleanupInterval: number;
    };
    
    // Reporting configuration
    reporting: {
        enableConsole: boolean;
        enableHTML: boolean;
        enableJSON: boolean;
        outputDirectory: string;
    };
}

export interface TestGenerationOptions {
    includeComplexScenarios?: boolean;
    maxNodesPerScenario?: number;
    maxConnectionsPerScenario?: number;
    includeAsyncScenarios?: boolean;
    includeErrorScenarios?: boolean;
    complexityLevel?: 'low' | 'medium' | 'high';
    skipInternal?: boolean;
    includeOnly?: string[];
    exclude?: string[];
}

// Complex Scenario Types
export interface ComplexScenario {
    name: string;
    description: string;
    category: string;
    priority: 'low' | 'medium' | 'high';
    timeout?: number;
    
    setup?(graph: LGraph): Promise<any> | any;
    execute?(graph: LGraph, setupData?: any): Promise<any> | any;
    validate?(graph: LGraph, setupData?: any, executionResult?: any): TestValidationResult;
}

export interface WorkflowPattern {
    name: string;
    description: string;
    generate(nodes: LGraphNode[]): ConnectionSpec[];
}

export interface ConnectionSpec {
    from: number;
    to: number;
    fromSlot: number;
    toSlot: number;
}

export interface ScenarioTemplate {
    name: string;
    description: string;
    category: string;
    priority: 'low' | 'medium' | 'high';
    generate(nodeTypes: string[], config: TestGenerationOptions): ComplexScenario | null;
}

// Test Reporter Types
export interface ReportFormatter {
    name: string;
    description: string;
    format(results: TestResult[], stats: TestStats, options?: any): string;
}

export interface ChartData {
    status: {
        labels: string[];
        data: number[];
        colors: string[];
    };
    performance: {
        labels: string[];
        datasets: Array<{
            label: string;
            data: number[];
            borderColor: string;
            backgroundColor: string;
        }>;
    };
    categories: {
        labels: string[];
        datasets: Array<{
            label: string;
            data: number[];
            backgroundColor: string[];
        }>;
    };
    nodeTypes: {
        labels: string[];
        data: number[];
        backgroundColor: string[];
    };
    duration: {
        labels: string[];
        data: number[];
        backgroundColor: string;
    };
    errors: {
        labels: string[];
        data: number[];
        backgroundColor: string[];
    };
    timeline: {
        labels: string[];
        datasets: Array<{
            label: string;
            data: Array<{
                x: string;
                y: number;
            }>;
            borderColor: string;
            backgroundColor: string;
        }>;
    };
}

// Test Runner Types
export interface TestRunnerOptions {
    parallel?: boolean;
    maxConcurrency?: number;
    stopOnFirstFailure?: boolean;
    timeout?: number;
    retryFailedTests?: boolean;
    maxRetries?: number;
    
    // Filtering options
    categories?: string[];
    priorities?: string[];
    nodeTypes?: string[];
    tags?: string[];
    
    // Progress reporting
    onProgress?(current: number, total: number, currentTest: string): void;
    onTestStart?(testName: string): void;
    onTestComplete?(result: TestResult): void;
}

export interface TestExecutionContext {
    testName: string;
    nodeType?: string;
    graph: LGraph;
    node?: LGraphNode;
    startTime: number;
    timeout: number;
    memoryBefore?: number;
}

// Test Generator Types
export interface TestTemplate {
    name: string;
    description: string;
    category: string;
    priority: 'low' | 'medium' | 'high';
    
    generate(nodeType: string, options?: any): TestCase[];
    
    // Template configuration
    applicableNodeTypes?: string[];
    requiredInputs?: string[];
    requiredOutputs?: string[];
    requiredMethods?: string[];
}

export interface NodeAnalysis {
    nodeType: string;
    hasInputs: boolean;
    hasOutputs: boolean;
    inputCount: number;
    outputCount: number;
    inputTypes: string[];
    outputTypes: string[];
    
    // Method analysis
    hasOnExecute: boolean;
    hasOnStart: boolean;
    hasOnStop: boolean;
    hasCustomMethods: string[];
    
    // Property analysis
    properties: Record<string, any>;
    defaultValues: Record<string, any>;
    
    // Complexity metrics
    complexity: 'low' | 'medium' | 'high';
    estimatedExecutionTime: number;
}

// Main Framework Classes
export declare class TestFramework {
    config: TestFrameworkConfig;
    tests: Map<string, TestCase[]>;
    results: Map<string, TestResult[]>;
    stats: TestStats;
    
    constructor(config?: Partial<TestFrameworkConfig>);
    
    registerTest(nodeType: string, test: TestCase): void;
    runTests(nodeTypes?: string[], options?: TestRunnerOptions): Promise<TestResult[]>;
    generateAutomatedTests(options?: TestGenerationOptions): TestCase[];
    generateComplexScenarioTests(nodeTypes: string[], options?: TestGenerationOptions): TestCase[];
    
    getResults(nodeType?: string): TestResult[];
    getStats(): TestStats;
    generateReport(format?: string, options?: any): string;
    
    clear(): void;
    reset(): void;
}

export declare class TestCaseGenerator {
    templates: Map<string, TestTemplate>;
    
    constructor();
    
    generateTestsForNode(nodeType: string, options?: TestGenerationOptions): TestCase[];
    analyzeNodeType(nodeType: string): NodeAnalysis;
    
    registerTemplate(template: TestTemplate): void;
    getAvailableTemplates(): TestTemplate[];
}

export declare class ComplexScenarioGenerator extends TestCaseGenerator {
    scenarioTemplates: Map<string, ScenarioTemplate>;
    workflowPatterns: Map<string, WorkflowPattern>;
    
    constructor();
    
    generateComplexScenarios(nodeTypes: string[], options?: TestGenerationOptions): ComplexScenario[];
    
    // Pattern generators
    generateLinearPattern(nodes: LGraphNode[]): ConnectionSpec[];
    generateFanOutPattern(nodes: LGraphNode[]): ConnectionSpec[];
    generateFanInPattern(nodes: LGraphNode[]): ConnectionSpec[];
    generateDiamondPattern(nodes: LGraphNode[]): ConnectionSpec[];
    generateTreePattern(nodes: LGraphNode[]): ConnectionSpec[];
    generateMeshPattern(nodes: LGraphNode[]): ConnectionSpec[];
}

export declare class TestReporter {
    formatters: Map<string, ReportFormatter>;
    
    constructor();
    
    formatResults(results: TestResult[], format: string, options?: any): string;
    generateChartData(results: TestResult[], stats: TestStats): ChartData;
    
    registerFormatter(formatter: ReportFormatter): void;
    getAvailableFormatters(): string[];
}

export declare class TestRunner {
    constructor();
    
    runTest(test: TestCase, context: TestExecutionContext): Promise<TestResult>;
    runTests(tests: TestCase[], options?: TestRunnerOptions): Promise<TestResult[]>;
    
    // Utility methods
    createExecutionContext(testName: string, nodeType?: string): TestExecutionContext;
    measureMemoryUsage(): number;
    createTimeoutPromise(timeout: number): Promise<never>;
}

// Utility Types
export type TestStatus = 'passed' | 'failed' | 'skipped' | 'timeout';
export type TestPriority = 'low' | 'medium' | 'high' | 'critical';
export type ComplexityLevel = 'low' | 'medium' | 'high';
export type ReportFormat = 'console' | 'html' | 'json' | 'csv' | 'markdown' | 'junit';

// Global declarations
declare global {
    const LiteGraph: LiteGraphStatic;
    const LGraph: new() => LGraph;
}

// Export everything
export * from './test-framework';
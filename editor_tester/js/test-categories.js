/**
 * Test Categories
 * Defines standard test categories for node testing
 */

// Define test categories globally
window.TEST_CATEGORIES = {
    // Functional categories
    CORE: "core",
    MATH: "math",
    LOGIC: "logic",
    STRING: "string",
    ARRAY: "array",
    OBJECT: "object",
    CONTROL_FLOW: "control_flow",
    EVENT: "event",
    
    // Domain-specific categories
    DATA_PROCESSING: "data_processing",
    VISUALIZATION: "visualization",
    NETWORKING: "networking",
    FILE_OPERATIONS: "file_operations",
    DATABASE: "database",
    
    // Complexity categories
    SIMPLE: "simple",
    COMPLEX: "complex",
    
    // Status categories
    STABLE: "stable",
    EXPERIMENTAL: "experimental",
    DEPRECATED: "deprecated",
    
    // Performance categories
    HIGH_PERFORMANCE: "high_performance",
    RESOURCE_INTENSIVE: "resource_intensive",
    
    // Integration categories
    STANDALONE: "standalone",
    INTEGRATION_REQUIRED: "integration_required",
    
    // Special categories
    CUSTOM: "custom",
    THIRD_PARTY: "third_party",
    SYSTEM: "system"
};

/**
 * Category metadata with descriptions and UI display properties
 */
var CATEGORY_METADATA = {};
CATEGORY_METADATA[TEST_CATEGORIES.CORE] = {
    label: "Core",
    description: "Essential nodes for basic graph functionality",
    color: "#4285F4",
    priority: 1
};
CATEGORY_METADATA[TEST_CATEGORIES.MATH] = {
    label: "Math",
    description: "Mathematical operations and functions",
    color: "#EA4335",
    priority: 2
};
CATEGORY_METADATA[TEST_CATEGORIES.LOGIC] = {
    label: "Logic",
    description: "Boolean logic and conditional operations",
    color: "#FBBC05",
    priority: 2
};
CATEGORY_METADATA[TEST_CATEGORIES.STRING] = {
    label: "String",
    description: "String manipulation and processing",
    color: "#34A853",
    priority: 2
};
CATEGORY_METADATA[TEST_CATEGORIES.ARRAY] = {
    label: "Array",
    description: "Array operations and transformations",
    color: "#FF6D01",
    priority: 2
};
CATEGORY_METADATA[TEST_CATEGORIES.OBJECT] = {
    label: "Object",
    description: "Object manipulation and property access",
    color: "#46BDC6",
    priority: 2
};
CATEGORY_METADATA[TEST_CATEGORIES.CONTROL_FLOW] = {
    label: "Control Flow",
    description: "Flow control and execution management",
    color: "#7B1FA2",
    priority: 3
};
CATEGORY_METADATA[TEST_CATEGORIES.EVENT] = {
    label: "Event",
    description: "Event handling and callbacks",
    color: "#C2185B",
    priority: 3
};
CATEGORY_METADATA[TEST_CATEGORIES.DATA_PROCESSING] = {
    label: "Data Processing",
    description: "Data transformation and analysis",
    color: "#0097A7",
    priority: 4
};
CATEGORY_METADATA[TEST_CATEGORIES.VISUALIZATION] = {
    label: "Visualization",
    description: "Data visualization and display",
    color: "#00796B",
    priority: 4
};
CATEGORY_METADATA[TEST_CATEGORIES.NETWORKING] = {
    label: "Networking",
    description: "Network requests and API interactions",
    color: "#3949AB",
    priority: 4
};
CATEGORY_METADATA[TEST_CATEGORIES.FILE_OPERATIONS] = {
    label: "File Operations",
    description: "File system interactions",
    color: "#5E35B1",
    priority: 4
};
CATEGORY_METADATA[TEST_CATEGORIES.DATABASE] = {
    label: "Database",
    description: "Database operations and queries",
    color: "#1565C0",
    priority: 4
};
CATEGORY_METADATA[TEST_CATEGORIES.SIMPLE] = {
    label: "Simple",
    description: "Nodes with simple functionality",
    color: "#43A047",
    priority: 5
};
CATEGORY_METADATA[TEST_CATEGORIES.COMPLEX] = {
    label: "Complex",
    description: "Nodes with complex functionality",
    color: "#E53935",
    priority: 5
};
CATEGORY_METADATA[TEST_CATEGORIES.STABLE] = {
    label: "Stable",
    description: "Stable and well-tested nodes",
    color: "#43A047",
    priority: 6
};
CATEGORY_METADATA[TEST_CATEGORIES.EXPERIMENTAL] = {
    label: "Experimental",
    description: "Experimental nodes under development",
    color: "#FB8C00",
    priority: 6
};
CATEGORY_METADATA[TEST_CATEGORIES.DEPRECATED] = {
    label: "Deprecated",
    description: "Deprecated nodes scheduled for removal",
    color: "#757575",
    priority: 6
};
CATEGORY_METADATA[TEST_CATEGORIES.HIGH_PERFORMANCE] = {
    label: "High Performance",
    description: "Optimized for high performance",
    color: "#00C853",
    priority: 7
};
CATEGORY_METADATA[TEST_CATEGORIES.RESOURCE_INTENSIVE] = {
    label: "Resource Intensive",
    description: "Requires significant system resources",
    color: "#D50000",
    priority: 7
};
CATEGORY_METADATA[TEST_CATEGORIES.STANDALONE] = {
    label: "Standalone",
    description: "Can operate independently",
    color: "#00B0FF",
    priority: 8
};
CATEGORY_METADATA[TEST_CATEGORIES.INTEGRATION_REQUIRED] = {
    label: "Integration Required",
    description: "Requires integration with other nodes",
    color: "#FF6D00",
    priority: 8
};
CATEGORY_METADATA[TEST_CATEGORIES.CUSTOM] = {
    label: "Custom",
    description: "Custom user-defined nodes",
    color: "#9C27B0",
    priority: 9
};
CATEGORY_METADATA[TEST_CATEGORIES.THIRD_PARTY] = {
    label: "Third Party",
    description: "Nodes from third-party libraries",
    color: "#607D8B",
    priority: 9
};
CATEGORY_METADATA[TEST_CATEGORIES.SYSTEM] = {
    label: "System",
    description: "System-level nodes",
    color: "#212121",
    priority: 9
};

/**
 * Get category metadata by category ID
 * @param {string} categoryId - Category identifier
 * @returns {Object} Category metadata
 */
function getCategoryMetadata(categoryId) {
    return CATEGORY_METADATA[categoryId] || {
        label: categoryId,
        description: "Custom category",
        color: "#9E9E9E",
        priority: 10
    };
}

/**
 * Get all categories as an array
 * @returns {Array} Array of category objects with id and metadata
 */
function getAllCategories() {
    return Object.keys(TEST_CATEGORIES).map(key => ({
        id: TEST_CATEGORIES[key],
        ...getCategoryMetadata(TEST_CATEGORIES[key])
    }));
}

/**
 * Map node type to categories based on naming conventions
 * @param {string} nodeType - Node type identifier
 * @returns {Array} Array of category IDs
 */
function mapNodeTypeToCategories(nodeType) {
    const categories = [];
    
    // Map based on naming conventions
    if (nodeType.includes("Math") || nodeType.includes("Arithmetic")) {
        categories.push(TEST_CATEGORIES.MATH);
    }
    
    if (nodeType.includes("String") || nodeType.includes("Text")) {
        categories.push(TEST_CATEGORIES.STRING);
    }
    
    if (nodeType.includes("Array") || nodeType.includes("List")) {
        categories.push(TEST_CATEGORIES.ARRAY);
    }
    
    if (nodeType.includes("Object") || nodeType.includes("JSON")) {
        categories.push(TEST_CATEGORIES.OBJECT);
    }
    
    if (nodeType.includes("Logic") || nodeType.includes("Condition") || 
        nodeType.includes("If") || nodeType.includes("Switch")) {
        categories.push(TEST_CATEGORIES.LOGIC);
    }
    
    if (nodeType.includes("Event") || nodeType.includes("Trigger") || 
        nodeType.includes("Callback")) {
        categories.push(TEST_CATEGORIES.EVENT);
    }
    
    if (nodeType.includes("Network") || nodeType.includes("HTTP") || 
        nodeType.includes("API") || nodeType.includes("Request")) {
        categories.push(TEST_CATEGORIES.NETWORKING);
    }
    
    if (nodeType.includes("File") || nodeType.includes("Directory")) {
        categories.push(TEST_CATEGORIES.FILE_OPERATIONS);
    }
    
    if (nodeType.includes("DB") || nodeType.includes("Database") || 
        nodeType.includes("Query") || nodeType.includes("SQL")) {
        categories.push(TEST_CATEGORIES.DATABASE);
    }
    
    if (nodeType.includes("Visualize") || nodeType.includes("Chart") || 
        nodeType.includes("Display") || nodeType.includes("UI")) {
        categories.push(TEST_CATEGORIES.VISUALIZATION);
    }
    
    // Add default category if none matched
    if (categories.length === 0) {
        categories.push(TEST_CATEGORIES.CORE);
    }
    
    return categories;
}

// Make functions globally available
window.CATEGORY_METADATA = CATEGORY_METADATA;
window.getCategoryMetadata = getCategoryMetadata;
window.getAllCategories = getAllCategories;
window.mapNodeTypeToCategories = mapNodeTypeToCategories;
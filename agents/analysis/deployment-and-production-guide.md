# LiteGraph Deployment and Production Guide

## Overview

This guide covers deploying LiteGraph applications in production environments, including server-side execution, containerization, scaling strategies, and monitoring best practices.

## Deployment Architectures

### 1. Browser-Only Deployment

**Use Cases**: Client-side graph editing and execution
**Architecture**: Static file hosting with CDN

```html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" type="text/css" href="css/litegraph.css">
</head>
<body>
    <canvas id="mycanvas" width="1024" height="720"></canvas>
    <script src="build/litegraph.js"></script>
    <script>
        // Production configuration
        LiteGraph.debug_level = 0;
        LiteGraph.graphDefaultConfig.catch_exceptions = true;
        LiteGraph.allow_scripts = false; // Security
        
        var graph = new LGraph();
        var canvas = new LGraphCanvas("#mycanvas", graph);
    </script>
</body>
</html>
```

### 2. Hybrid Deployment

**Use Cases**: Client editing with server-side execution
**Architecture**: Web frontend + Node.js backend

```javascript
// Frontend (browser)
const graph = new LGraph();
const canvas = new LGraphCanvas("#canvas", graph);

// Send graph to server for execution
fetch('/api/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ graph: graph.serialize() })
});

// Backend (Node.js)
const express = require('express');
const { LiteGraph, LGraph } = require('./build_node/litegraph_nodejs.full.cjs');

app.post('/api/execute', (req, res) => {
    const graph = new LGraph();
    graph.configure(req.body.graph);
    
    // Execute in headless mode
    graph.runStep();
    
    res.json({ result: graph.serialize() });
});
```

### 3. Server-Only Deployment

**Use Cases**: Headless graph execution, batch processing
**Architecture**: Node.js server with REST/WebSocket API

```javascript
// Headless server implementation
const { GraphRunner } = require('./headless/graphrunner/server');

const runner = new GraphRunner({
    port: process.env.PORT || 3000,
    workflowsDir: './workflows',
    logsDir: './logs',
    maxConcurrentGraphs: 10
});

runner.start();
```

## Production Configuration

### 1. Performance Optimization

```javascript
// Production performance settings
LiteGraph.graphDefaultConfig = {
    // Execution optimization
    max_iterations: 1000,
    max_execution_time: 5000, // 5 second timeout
    skip_render_if_not_visible: true,
    
    // Error handling
    catch_exceptions: true,
    throw_errors: false,
    
    // Security
    allow_scripts: false,
    sanitize_html: true,
    validate_inputs: true
};

// Canvas performance (if using visual components)
if (canvas) {
    canvas.render_shadows = false;
    canvas.render_connections_shadows = false;
    canvas.always_render_background = false;
    canvas.skip_render = false;
}

// Debug settings
LiteGraph.debug_level = 0; // No debug output in production
```

### 2. Environment-Specific Configuration

```javascript
// Environment detection and configuration
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

if (isProduction) {
    // Production settings
    LiteGraph.debug_level = 0;
    LiteGraph.graphDefaultConfig.catch_exceptions = true;
    LiteGraph.graphDefaultConfig.max_execution_time = 5000;
} else if (isDevelopment) {
    // Development settings
    LiteGraph.debug_level = 4;
    LiteGraph.graphDefaultConfig.catch_exceptions = false;
    LiteGraph.graphDefaultConfig.throw_errors = true;
}

// Server-specific configuration
if (typeof global !== "undefined") {
    LiteGraph.graphDefaultConfig.headless_mode = true;
    LiteGraph.graphDefaultConfig.disable_ui = true;
    LiteGraph.graphDefaultConfig.canvas_polyfill = "node-canvas";
}
```

## Containerization

### 1. Docker Configuration

```dockerfile
# Dockerfile for LiteGraph application
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    build-base \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S litegraph -u 1001

# Set ownership
RUN chown -R litegraph:nodejs /app
USER litegraph

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node healthcheck.js

# Start application
CMD ["node", "server.js"]
```

### 2. Docker Compose for Development

```yaml
# docker-compose.yml
version: '3.8'

services:
  litegraph-app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - LOG_LEVEL=info
    volumes:
      - ./workflows:/app/workflows
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - litegraph-app
    restart: unless-stopped
```

### 3. Kubernetes Deployment

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: litegraph-app
  labels:
    app: litegraph
spec:
  replicas: 3
  selector:
    matchLabels:
      app: litegraph
  template:
    metadata:
      labels:
        app: litegraph
    spec:
      containers:
      - name: litegraph
        image: litegraph:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: litegraph-service
spec:
  selector:
    app: litegraph
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

## Scaling Strategies

### 1. Horizontal Scaling

```javascript
// Load balancer configuration
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);
    
    // Fork workers
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
    
    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
        cluster.fork(); // Restart worker
    });
} else {
    // Worker process
    const app = require('./app');
    app.listen(process.env.PORT || 3000);
    console.log(`Worker ${process.pid} started`);
}
```

### 2. Vertical Scaling

```javascript
// Resource optimization for single instance
const { GraphRunner } = require('./headless/graphrunner/server');

const runner = new GraphRunner({
    // Adjust based on available resources
    maxConcurrentGraphs: process.env.MAX_CONCURRENT || 20,
    workerThreads: process.env.WORKER_THREADS || 4,
    memoryLimit: process.env.MEMORY_LIMIT || '2GB',
    
    // Performance tuning
    executionTimeout: 30000,
    cleanupInterval: 60000,
    
    // Resource monitoring
    enableMetrics: true,
    metricsPort: 9090
});
```

### 3. Microservices Architecture

```javascript
// Graph execution service
class GraphExecutionService {
    constructor(config) {
        this.config = config;
        this.activeGraphs = new Map();
        this.metrics = new MetricsCollector();
    }
    
    async executeGraph(graphData, options = {}) {
        const graphId = this.generateId();
        
        try {
            const graph = new LGraph();
            graph.configure(graphData);
            
            // Track execution
            this.activeGraphs.set(graphId, {
                graph,
                startTime: Date.now(),
                options
            });
            
            // Execute with timeout
            const result = await this.executeWithTimeout(graph, options.timeout);
            
            // Collect metrics
            this.metrics.recordExecution(graphId, Date.now() - this.activeGraphs.get(graphId).startTime);
            
            return { graphId, result };
        } finally {
            this.activeGraphs.delete(graphId);
        }
    }
    
    async executeWithTimeout(graph, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('Graph execution timeout'));
            }, timeout);
            
            try {
                graph.runStep();
                clearTimeout(timer);
                resolve(graph.serialize());
            } catch (error) {
                clearTimeout(timer);
                reject(error);
            }
        });
    }
}
```

## Monitoring and Logging

### 1. Application Monitoring

```javascript
// Metrics collection
const prometheus = require('prom-client');

// Create metrics
const graphExecutions = new prometheus.Counter({
    name: 'litegraph_executions_total',
    help: 'Total number of graph executions',
    labelNames: ['status', 'graph_type']
});

const executionDuration = new prometheus.Histogram({
    name: 'litegraph_execution_duration_seconds',
    help: 'Graph execution duration in seconds',
    labelNames: ['graph_type'],
    buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const activeGraphs = new prometheus.Gauge({
    name: 'litegraph_active_graphs',
    help: 'Number of currently executing graphs'
});

// Middleware for metrics collection
function metricsMiddleware(req, res, next) {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        executionDuration.observe({ graph_type: req.body.type || 'unknown' }, duration);
        graphExecutions.inc({ status: res.statusCode >= 400 ? 'error' : 'success' });
    });
    
    next();
}
```

### 2. Structured Logging

```javascript
// Winston logger configuration
const winston = require('winston');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'litegraph-server' },
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// Graph execution logging
class GraphLogger {
    static logExecution(graphId, graphType, duration, status, error = null) {
        const logData = {
            graphId,
            graphType,
            duration,
            status,
            timestamp: new Date().toISOString()
        };
        
        if (error) {
            logData.error = error.message;
            logData.stack = error.stack;
            logger.error('Graph execution failed', logData);
        } else {
            logger.info('Graph execution completed', logData);
        }
    }
    
    static logPerformance(metrics) {
        logger.info('Performance metrics', {
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage(),
            activeConnections: metrics.activeConnections,
            queueLength: metrics.queueLength
        });
    }
}
```

### 3. Health Checks

```javascript
// Health check implementation
class HealthChecker {
    constructor(dependencies = {}) {
        this.dependencies = dependencies;
        this.checks = new Map();
        
        // Register default checks
        this.registerCheck('memory', this.checkMemory.bind(this));
        this.registerCheck('cpu', this.checkCPU.bind(this));
        this.registerCheck('disk', this.checkDisk.bind(this));
    }
    
    registerCheck(name, checkFunction) {
        this.checks.set(name, checkFunction);
    }
    
    async runHealthChecks() {
        const results = {};
        let overallStatus = 'healthy';
        
        for (const [name, checkFn] of this.checks) {
            try {
                const result = await checkFn();
                results[name] = result;
                
                if (result.status !== 'healthy') {
                    overallStatus = 'unhealthy';
                }
            } catch (error) {
                results[name] = {
                    status: 'error',
                    message: error.message
                };
                overallStatus = 'unhealthy';
            }
        }
        
        return {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            checks: results
        };
    }
    
    async checkMemory() {
        const usage = process.memoryUsage();
        const threshold = 0.9; // 90% memory usage threshold
        
        const memoryUsagePercent = usage.heapUsed / usage.heapTotal;
        
        return {
            status: memoryUsagePercent < threshold ? 'healthy' : 'unhealthy',
            usage: usage,
            usagePercent: memoryUsagePercent
        };
    }
    
    async checkCPU() {
        // Simple CPU check - in production, use more sophisticated monitoring
        return {
            status: 'healthy',
            usage: process.cpuUsage()
        };
    }
    
    async checkDisk() {
        // Check available disk space
        const fs = require('fs');
        const stats = fs.statSync('.');
        
        return {
            status: 'healthy',
            available: stats.size
        };
    }
}

// Express health check endpoints
app.get('/health', async (req, res) => {
    const healthChecker = new HealthChecker();
    const health = await healthChecker.runHealthChecks();
    
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

app.get('/ready', (req, res) => {
    // Readiness check - is the service ready to accept requests?
    const isReady = /* check if service is initialized */;
    res.status(isReady ? 200 : 503).json({ ready: isReady });
});
```

## Security Considerations

### 1. Input Validation

```javascript
// Graph validation middleware
function validateGraph(req, res, next) {
    const { graph } = req.body;
    
    if (!graph || typeof graph !== 'object') {
        return res.status(400).json({ error: 'Invalid graph data' });
    }
    
    // Validate graph structure
    if (!graph.nodes || !Array.isArray(graph.nodes)) {
        return res.status(400).json({ error: 'Graph must contain nodes array' });
    }
    
    // Check for dangerous node types
    const dangerousTypes = ['script', 'eval', 'function'];
    const hasDangerousNodes = graph.nodes.some(node => 
        dangerousTypes.includes(node.type)
    );
    
    if (hasDangerousNodes && !req.user?.isAdmin) {
        return res.status(403).json({ error: 'Unauthorized node types' });
    }
    
    next();
}

// Sanitize node properties
function sanitizeNodeProperties(node) {
    if (node.properties) {
        for (const [key, value] of Object.entries(node.properties)) {
            if (typeof value === 'string') {
                // Remove potentially dangerous content
                node.properties[key] = value
                    .replace(/<script[^>]*>.*?<\/script>/gi, '')
                    .replace(/javascript:/gi, '')
                    .replace(/on\w+\s*=/gi, '');
            }
        }
    }
    return node;
}
```

### 2. Authentication and Authorization

```javascript
// JWT authentication middleware
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.sendStatus(401);
    }
    
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// Role-based access control
function requireRole(role) {
    return (req, res, next) => {
        if (!req.user || !req.user.roles.includes(role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
}

// Apply security middleware
app.use('/api/admin', authenticateToken, requireRole('admin'));
app.use('/api/execute', authenticateToken, validateGraph);
```

### 3. Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

// General API rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP'
});

// Stricter limits for graph execution
const executionLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 executions per minute
    message: 'Too many graph executions, please try again later'
});

app.use('/api/', apiLimiter);
app.use('/api/execute', executionLimiter);
```

## Performance Optimization

### 1. Caching Strategies

```javascript
// Redis caching for graph results
const redis = require('redis');
const client = redis.createClient();

class GraphCache {
    static generateKey(graphData) {
        const crypto = require('crypto');
        return crypto.createHash('sha256')
            .update(JSON.stringify(graphData))
            .digest('hex');
    }
    
    static async get(graphData) {
        const key = this.generateKey(graphData);
        const cached = await client.get(key);
        return cached ? JSON.parse(cached) : null;
    }
    
    static async set(graphData, result, ttl = 3600) {
        const key = this.generateKey(graphData);
        await client.setex(key, ttl, JSON.stringify(result));
    }
}

// Use caching in execution endpoint
app.post('/api/execute', async (req, res) => {
    try {
        // Check cache first
        const cached = await GraphCache.get(req.body.graph);
        if (cached) {
            return res.json({ result: cached, cached: true });
        }
        
        // Execute graph
        const result = await executeGraph(req.body.graph);
        
        // Cache result
        await GraphCache.set(req.body.graph, result);
        
        res.json({ result, cached: false });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

### 2. Connection Pooling

```javascript
// Database connection pooling
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    max: 20, // maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
});

// Graph persistence with connection pooling
class GraphPersistence {
    static async saveGraph(graphId, graphData) {
        const client = await pool.connect();
        try {
            const query = 'INSERT INTO graphs (id, data, created_at) VALUES ($1, $2, NOW())';
            await client.query(query, [graphId, JSON.stringify(graphData)]);
        } finally {
            client.release();
        }
    }
    
    static async loadGraph(graphId) {
        const client = await pool.connect();
        try {
            const query = 'SELECT data FROM graphs WHERE id = $1';
            const result = await client.query(query, [graphId]);
            return result.rows[0] ? JSON.parse(result.rows[0].data) : null;
        } finally {
            client.release();
        }
    }
}
```

## Troubleshooting

### 1. Common Issues

#### Memory Leaks
```javascript
// Memory leak detection
function detectMemoryLeaks() {
    const usage = process.memoryUsage();
    
    if (usage.heapUsed > 500 * 1024 * 1024) { // 500MB threshold
        logger.warn('High memory usage detected', usage);
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
            logger.info('Forced garbage collection');
        }
    }
}

// Run memory check every 30 seconds
setInterval(detectMemoryLeaks, 30000);
```

#### Graph Execution Timeouts
```javascript
// Timeout handling with cleanup
class TimeoutManager {
    constructor() {
        this.activeTimeouts = new Map();
    }
    
    createTimeout(graphId, duration, callback) {
        const timeout = setTimeout(() => {
            callback();
            this.activeTimeouts.delete(graphId);
        }, duration);
        
        this.activeTimeouts.set(graphId, timeout);
        return timeout;
    }
    
    clearTimeout(graphId) {
        const timeout = this.activeTimeouts.get(graphId);
        if (timeout) {
            clearTimeout(timeout);
            this.activeTimeouts.delete(graphId);
        }
    }
    
    clearAllTimeouts() {
        for (const timeout of this.activeTimeouts.values()) {
            clearTimeout(timeout);
        }
        this.activeTimeouts.clear();
    }
}
```

### 2. Debugging Tools

```javascript
// Debug endpoint for production troubleshooting
app.get('/debug/status', requireRole('admin'), (req, res) => {
    const status = {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        activeGraphs: graphRunner.getActiveGraphCount(),
        queueLength: graphRunner.getQueueLength(),
        version: require('./package.json').version,
        environment: process.env.NODE_ENV
    };
    
    res.json(status);
});

// Performance profiling endpoint
app.post('/debug/profile', requireRole('admin'), (req, res) => {
    const profiler = require('v8-profiler-next');
    
    // Start profiling
    profiler.startProfiling('graph-execution');
    
    // Execute graph with profiling
    executeGraph(req.body.graph)
        .then(result => {
            const profile = profiler.stopProfiling('graph-execution');
            
            res.json({
                result,
                profile: profile.export()
            });
            
            profile.delete();
        })
        .catch(error => {
            profiler.stopProfiling('graph-execution');
            res.status(500).json({ error: error.message });
        });
});
```

## Best Practices Summary

### 1. Configuration Management
- Use environment variables for configuration
- Separate development and production settings
- Validate configuration on startup
- Document all configuration options

### 2. Security
- Always validate and sanitize input
- Implement proper authentication and authorization
- Use HTTPS in production
- Regular security audits and updates

### 3. Performance
- Implement caching where appropriate
- Use connection pooling for databases
- Monitor resource usage continuously
- Optimize graph execution paths

### 4. Monitoring
- Implement comprehensive logging
- Set up health checks and metrics
- Use structured logging formats
- Monitor both application and infrastructure metrics

### 5. Deployment
- Use containerization for consistency
- Implement proper CI/CD pipelines
- Plan for horizontal scaling
- Regular backup and disaster recovery procedures

This comprehensive deployment guide provides the foundation for running LiteGraph applications reliably in production environments while maintaining security, performance, and scalability.
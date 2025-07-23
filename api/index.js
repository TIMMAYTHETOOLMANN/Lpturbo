// === LP TURBO: REST API LAYER ===
// Professional REST API for external integrations and remote control
// Purpose: Easy integration with external systems and web interfaces

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const { body, validationResult, param } = require('express-validator');

// Import system components
const { 
    inject_liquidity, 
    withdraw_liquidity, 
    globalTelemetry, 
    globalDashboard,
    initializeAllSystems,
    LIQUIDITY_ADAPTERS
} = require('../lpturbo-monolith');
const { globalSecurity } = require('../security');
const { globalConfig } = require('../config');

class LPTurboAPI {
    constructor(port = 3000) {
        this.port = port;
        this.app = express();
        this.server = null;
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }
    
    setupMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"]
                }
            }
        }));
        
        // CORS
        this.app.use(cors({
            origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
            credentials: true
        }));
        
        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
            message: {
                error: 'Too many requests',
                retryAfter: '15 minutes'
            }
        });
        this.app.use(limiter);
        
        // Compression and parsing
        this.app.use(compression());
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));
        
        // Logging
        this.app.use(morgan('combined'));
        
        // Authentication middleware
        this.app.use(this.authenticate.bind(this));
    }
    
    authenticate(req, res, next) {
        // Skip auth for health check
        if (req.path === '/health' || req.path === '/') {
            return next();
        }
        
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Authentication token required',
                code: 'AUTH_REQUIRED'
            });
        }
        
        try {
            const tokenData = globalSecurity.validateAuthToken(token);
            req.user = tokenData;
            next();
        } catch (error) {
            return res.status(401).json({
                success: false,
                error: error.message,
                code: 'AUTH_FAILED'
            });
        }
    }
    
    setupRoutes() {
        // Health check
        this.app.get('/', (req, res) => {
            res.json({
                service: 'LP Turbo API',
                version: '2.0.0',
                status: 'healthy',
                timestamp: new Date().toISOString()
            });
        });
        
        this.app.get('/health', async (req, res) => {
            try {
                const status = await globalDashboard.status_check();
                res.json({
                    success: true,
                    health: status.overall,
                    systems: Object.keys(status.systems).length,
                    uptime: process.uptime(),
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: 'Health check failed',
                    details: error.message
                });
            }
        });
        
        // Authentication endpoints
        this.app.post('/auth/token', [
            body('identifier').notEmpty().withMessage('Identifier is required')
        ], (req, res) => {
            try {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(400).json({
                        success: false,
                        error: 'Validation failed',
                        details: errors.array()
                    });
                }
                
                const token = globalSecurity.generateAuthToken(req.body.identifier);
                
                res.json({
                    success: true,
                    token,
                    expires: Date.now() + 3600000,
                    message: 'Authentication token generated'
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });
        
        // System management endpoints
        this.app.post('/system/init', async (req, res) => {
            try {
                globalTelemetry.log('info', 'API_INIT', 'System initialization requested via API', {
                    user: req.user.identifier
                });
                
                const result = await initializeAllSystems();
                
                res.json({
                    success: true,
                    data: result,
                    message: 'System initialized successfully'
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message,
                    code: 'INIT_FAILED'
                });
            }
        });
        
        this.app.get('/system/status', async (req, res) => {
            try {
                const status = await globalDashboard.status_check();
                const securityReport = globalSecurity.getSecurityReport();
                const configSummary = globalConfig.getConfigSummary();
                
                res.json({
                    success: true,
                    data: {
                        system: status,
                        security: {
                            environment: securityReport.environment,
                            activeTokens: securityReport.activeTokens
                        },
                        config: configSummary
                    },
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message,
                    code: 'STATUS_FAILED'
                });
            }
        });
        
        // Liquidity management endpoints
        this.app.post('/liquidity/inject', [
            body('network').isIn(['ethereum', 'base', 'bsc', 'solana', 'polygon', 'arbitrum']).withMessage('Invalid network'),
            body('amount').isNumeric().withMessage('Amount must be numeric'),
            body('tokenA').optional().isEthereumAddress().withMessage('Invalid token A address'),
            body('tokenB').optional().isEthereumAddress().withMessage('Invalid token B address')
        ], async (req, res) => {
            try {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(400).json({
                        success: false,
                        error: 'Validation failed',
                        details: errors.array()
                    });
                }
                
                const { network, amount, tokenA, tokenB } = req.body;
                
                globalTelemetry.log('info', 'API_LIQUIDITY_INJECT', 'Liquidity injection requested via API', {
                    user: req.user.identifier,
                    network,
                    amount
                });
                
                // Rate limit check for liquidity operations
                globalSecurity.checkRateLimit(`liquidity:${req.user.identifier}`, 5, 300000); // 5 per 5 minutes
                
                const result = await inject_liquidity(network, tokenA || 'ETH', tokenB || 'USDC', amount, amount);
                
                res.json({
                    success: true,
                    data: result,
                    message: `Liquidity injected to ${network}`,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message,
                    code: 'INJECTION_FAILED'
                });
            }
        });
        
        this.app.post('/liquidity/withdraw', [
            body('network').isIn(['ethereum', 'base', 'bsc', 'solana', 'polygon', 'arbitrum']).withMessage('Invalid network'),
            body('amount').isNumeric().withMessage('Amount must be numeric'),
            body('lpToken').optional().isEthereumAddress().withMessage('Invalid LP token address')
        ], async (req, res) => {
            try {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(400).json({
                        success: false,
                        error: 'Validation failed',
                        details: errors.array()
                    });
                }
                
                const { network, amount, lpToken } = req.body;
                
                globalTelemetry.log('info', 'API_LIQUIDITY_WITHDRAW', 'Liquidity withdrawal requested via API', {
                    user: req.user.identifier,
                    network,
                    amount
                });
                
                globalSecurity.checkRateLimit(`liquidity:${req.user.identifier}`, 5, 300000);
                
                const result = await withdraw_liquidity(network, lpToken || 'LP_TOKEN', amount);
                
                res.json({
                    success: true,
                    data: result,
                    message: `Liquidity withdrawn from ${network}`,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message,
                    code: 'WITHDRAWAL_FAILED'
                });
            }
        });
        
        // Network information endpoints
        this.app.get('/networks', (req, res) => {
            try {
                const networks = Object.keys(LIQUIDITY_ADAPTERS).map(network => ({
                    name: network,
                    adapter: LIQUIDITY_ADAPTERS[network].constructor.name,
                    supported: true
                }));
                
                res.json({
                    success: true,
                    data: networks,
                    total: networks.length
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });
        
        this.app.get('/networks/:network/status', [
            param('network').isIn(['ethereum', 'base', 'bsc', 'solana', 'polygon', 'arbitrum'])
        ], async (req, res) => {
            try {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid network',
                        details: errors.array()
                    });
                }
                
                const network = req.params.network;
                const adapter = LIQUIDITY_ADAPTERS[network];
                
                if (!adapter) {
                    return res.status(404).json({
                        success: false,
                        error: 'Network not found'
                    });
                }
                
                const metrics = await adapter.getMetrics ? adapter.getMetrics() : { healthy: true };
                
                res.json({
                    success: true,
                    data: {
                        network,
                        adapter: adapter.constructor.name,
                        metrics,
                        timestamp: new Date().toISOString()
                    }
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });
        
        // Configuration endpoints
        this.app.get('/config', (req, res) => {
            try {
                const config = globalConfig.getAll();
                
                res.json({
                    success: true,
                    data: config,
                    summary: globalConfig.getConfigSummary()
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });
        
        this.app.put('/config/:key', [
            param('key').notEmpty().withMessage('Configuration key is required'),
            body('value').notEmpty().withMessage('Configuration value is required')
        ], (req, res) => {
            try {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(400).json({
                        success: false,
                        error: 'Validation failed',
                        details: errors.array()
                    });
                }
                
                const { key } = req.params;
                const { value } = req.body;
                
                globalTelemetry.log('info', 'API_CONFIG_UPDATE', 'Configuration updated via API', {
                    user: req.user.identifier,
                    key,
                    newValue: key.includes('KEY') ? '[REDACTED]' : value
                });
                
                globalConfig.set(key, value);
                
                res.json({
                    success: true,
                    message: `Configuration ${key} updated`,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(400).json({
                    success: false,
                    error: error.message,
                    code: 'CONFIG_UPDATE_FAILED'
                });
            }
        });
        
        // Security endpoints
        this.app.get('/security/report', (req, res) => {
            try {
                const report = globalSecurity.getSecurityReport();
                
                res.json({
                    success: true,
                    data: report,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });
        
        // Telemetry endpoints
        this.app.get('/telemetry/metrics', (req, res) => {
            try {
                const metrics = globalTelemetry.getMetrics ? globalTelemetry.getMetrics() : {
                    operations: 0,
                    errors: 0,
                    successRate: '0.00'
                };
                
                res.json({
                    success: true,
                    data: metrics,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });
        
        // WebSocket endpoint for real-time monitoring
        this.app.get('/stream/status', (req, res) => {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*'
            });
            
            const sendStatus = async () => {
                try {
                    const status = await globalDashboard.status_check();
                    res.write(`data: ${JSON.stringify(status)}\n\n`);
                } catch (error) {
                    res.write(`data: ${JSON.stringify({error: error.message})}\n\n`);
                }
            };
            
            // Send initial status
            sendStatus();
            
            // Send updates every 10 seconds
            const interval = setInterval(sendStatus, 10000);
            
            // Clean up on client disconnect
            req.on('close', () => {
                clearInterval(interval);
            });
        });
    }
    
    setupErrorHandling() {
        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                success: false,
                error: 'Endpoint not found',
                code: 'NOT_FOUND',
                path: req.path
            });
        });
        
        // Global error handler
        this.app.use((error, req, res, next) => {
            console.error('API Error:', error);
            
            globalTelemetry.log('error', 'API_ERROR', 'Unhandled API error', {
                error: error.message,
                stack: error.stack,
                path: req.path,
                method: req.method
            });
            
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                code: 'INTERNAL_ERROR',
                message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
            });
        });
    }
    
    start() {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(this.port, (error) => {
                if (error) {
                    reject(error);
                } else {
                    console.log(`🚀 LP Turbo API listening on port ${this.port}`);
                    console.log(`📊 Health check: http://localhost:${this.port}/health`);
                    console.log(`📖 API Documentation: http://localhost:${this.port}/`);
                    
                    globalTelemetry.log('info', 'API_STARTED', 'LP Turbo API server started', {
                        port: this.port,
                        environment: process.env.NODE_ENV || 'development'
                    });
                    
                    resolve(this.server);
                }
            });
        });
    }
    
    stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log('🛑 LP Turbo API server stopped');
                    globalTelemetry.log('info', 'API_STOPPED', 'LP Turbo API server stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
    
    getApp() {
        return this.app;
    }
}

// API Documentation generator
class APIDocGenerator {
    static generateDocs() {
        return {
            openapi: '3.0.0',
            info: {
                title: 'LP Turbo API',
                version: '2.0.0',
                description: 'REST API for LP Turbo Sovereign Liquidity Flash Engine'
            },
            servers: [
                {
                    url: 'http://localhost:3000',
                    description: 'Development server'
                }
            ],
            paths: {
                '/health': {
                    get: {
                        summary: 'Health check',
                        responses: {
                            '200': {
                                description: 'System health status'
                            }
                        }
                    }
                },
                '/auth/token': {
                    post: {
                        summary: 'Generate authentication token',
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            identifier: {
                                                type: 'string',
                                                description: 'User identifier'
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/system/status': {
                    get: {
                        summary: 'Get system status',
                        security: [{ bearerAuth: [] }]
                    }
                },
                '/liquidity/inject': {
                    post: {
                        summary: 'Inject liquidity',
                        security: [{ bearerAuth: [] }],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            network: {
                                                type: 'string',
                                                enum: ['ethereum', 'base', 'bsc', 'solana', 'polygon', 'arbitrum']
                                            },
                                            amount: {
                                                type: 'string',
                                                description: 'Amount to inject'
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer'
                    }
                }
            }
        };
    }
}

module.exports = {
    LPTurboAPI,
    APIDocGenerator
};
// === LP TURBO: TELEMETRY & COMMAND DASHBOARD ===
// Core telemetry logging and command dashboard functionality

const EventEmitter = require('events');

/**
 * Central telemetry system for monitoring all operations
 */
class Telemetry extends EventEmitter {
    constructor() {
        super();
        this.metrics = {
            operations: 0,
            networks: new Set(),
            errors: 0,
            successRate: 0,
            startTime: Date.now(),
            lastOperation: null
        };
        this.logs = [];
        this.maxLogs = 1000;
    }
    
    log(level, module, message, data = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            module,
            message,
            data,
            id: this.generateId()
        };
        
        this.logs.unshift(logEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs.pop();
        }
        
        this.updateMetrics(level, data);
        this.emit('log', logEntry);
        
        console.log(`[${level.toUpperCase()}] ${module}: ${message}`, data);
        return logEntry.id;
    }
    
    updateMetrics(level, data) {
        this.metrics.operations++;
        this.metrics.lastOperation = Date.now();
        
        if (data.network) {
            this.metrics.networks.add(data.network);
        }
        
        if (level === 'error') {
            this.metrics.errors++;
        }
        
        this.metrics.successRate = ((this.metrics.operations - this.metrics.errors) / this.metrics.operations * 100).toFixed(2);
    }
    
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }
    
    getMetrics() {
        return {
            ...this.metrics,
            networks: Array.from(this.metrics.networks),
            uptime: Date.now() - this.metrics.startTime
        };
    }
    
    getLogs(limit = 50) {
        return this.logs.slice(0, limit);
    }
    
    log_all_systems() {
        console.log("🎯 TELEMETRY SYSTEM INITIALIZED");
        this.log('info', 'TELEMETRY', 'All systems initialized and ready for monitoring');
        return this.getMetrics();
    }
}

/**
 * Command dashboard for system status and control
 */
class CommandDashboard {
    constructor(telemetry = null) {
        this.telemetry = telemetry || new Telemetry();
        this.systems = new Map();
        this.alerts = [];
        this.lastStatusCheck = null;
    }
    
    registerSystem(name, system, healthCheck = null) {
        this.systems.set(name, {
            system,
            healthCheck,
            status: 'unknown',
            lastCheck: null,
            errors: 0
        });
        
        this.telemetry.log('info', 'DASHBOARD', `System registered: ${name}`);
    }
    
    async status_check() {
        console.log("🎯 COMMAND DASHBOARD STATUS CHECK INITIATED");
        
        const results = {
            timestamp: new Date().toISOString(),
            systems: {},
            overall: 'healthy',
            metrics: this.telemetry.getMetrics(),
            alerts: this.alerts.slice(-10)
        };
        
        for (const [name, config] of this.systems) {
            try {
                let status = 'healthy';
                
                if (config.healthCheck) {
                    const checkResult = await config.healthCheck();
                    status = checkResult.healthy ? 'healthy' : 'degraded';
                }
                
                config.status = status;
                config.lastCheck = Date.now();
                
                results.systems[name] = {
                    status,
                    lastCheck: config.lastCheck,
                    errors: config.errors
                };
                
                this.telemetry.log('debug', 'DASHBOARD', `Health check completed for ${name}`, { status });
                
            } catch (error) {
                config.errors++;
                config.status = 'error';
                results.systems[name] = {
                    status: 'error',
                    error: error.message,
                    errors: config.errors
                };
                
                this.telemetry.log('error', 'DASHBOARD', `Health check failed for ${name}`, { error: error.message });
                results.overall = 'degraded';
            }
        }
        
        this.lastStatusCheck = results;
        this.telemetry.log('info', 'DASHBOARD', 'System status check completed', { overall: results.overall });
        
        console.log("📊 SYSTEM STATUS:", JSON.stringify(results, null, 2));
        return results;
    }
    
    addAlert(level, message, data = {}) {
        const alert = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data,
            id: Math.random().toString(36).substr(2, 9)
        };
        
        this.alerts.unshift(alert);
        if (this.alerts.length > 100) {
            this.alerts.pop();
        }
        
        this.telemetry.log(level, 'ALERT', message, data);
        return alert.id;
    }
    
    getSystemStatus(systemName) {
        return this.systems.get(systemName);
    }
    
    getAllSystems() {
        const systemsStatus = {};
        for (const [name, config] of this.systems) {
            systemsStatus[name] = {
                status: config.status,
                lastCheck: config.lastCheck,
                errors: config.errors
            };
        }
        return systemsStatus;
    }
    
    getDashboard() {
        return {
            lastStatusCheck: this.lastStatusCheck,
            metrics: this.telemetry.getMetrics(),
            recentLogs: this.telemetry.getLogs(20),
            alerts: this.alerts.slice(0, 10),
            systems: this.getAllSystems()
        };
    }
}

// Global instances
const globalTelemetry = new Telemetry();
const globalDashboard = new CommandDashboard(globalTelemetry);

module.exports = {
    Telemetry,
    CommandDashboard,
    globalTelemetry,
    globalDashboard
};
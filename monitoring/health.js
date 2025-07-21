// === LP TURBO: MONITORING & HEALTH CHECK MODULE ===
// Advanced monitoring, health checks, and automated recovery

const EventEmitter = require('events');
const { globalTelemetry } = require('../core/telemetry');

/**
 * Health Check System
 */
class HealthCheck extends EventEmitter {
    constructor() {
        super();
        this.checks = new Map();
        this.intervals = new Map();
        this.status = 'stopped';
        this.checkHistory = [];
        this.maxHistory = 1000;
        
        globalTelemetry.log('info', 'HEALTH_CHECK', 'Health check system initialized');
    }
    
    addCheck(name, checkFunction, interval = 30000) {
        this.checks.set(name, {
            function: checkFunction,
            interval,
            lastRun: null,
            lastResult: null,
            failures: 0,
            consecutiveFailures: 0
        });
        
        globalTelemetry.log('info', 'HEALTH_CHECK', `Added health check: ${name}`, { interval });
    }
    
    start() {
        if (this.status === 'running') {
            globalTelemetry.log('warn', 'HEALTH_CHECK', 'Health check already running');
            return;
        }
        
        this.status = 'running';
        globalTelemetry.log('info', 'HEALTH_CHECK', 'Starting health check system');
        
        for (const [name, check] of this.checks) {
            const intervalId = setInterval(async () => {
                await this.runCheck(name);
            }, check.interval);
            
            this.intervals.set(name, intervalId);
            
            // Run initial check
            this.runCheck(name);
        }
        
        this.emit('started');
    }
    
    stop() {
        this.status = 'stopped';
        
        for (const intervalId of this.intervals.values()) {
            clearInterval(intervalId);
        }
        
        this.intervals.clear();
        globalTelemetry.log('info', 'HEALTH_CHECK', 'Health check system stopped');
        this.emit('stopped');
    }
    
    async runCheck(name) {
        const check = this.checks.get(name);
        if (!check) return;
        
        const startTime = Date.now();
        
        try {
            const result = await check.function();
            const duration = Date.now() - startTime;
            
            check.lastRun = startTime;
            check.lastResult = { success: true, result, duration };
            check.consecutiveFailures = 0;
            
            this.recordCheckResult(name, true, result, duration);
            
            globalTelemetry.log('debug', 'HEALTH_CHECK', `Check passed: ${name}`, { duration, result });
            this.emit('checkPassed', { name, result, duration });
            
        } catch (error) {
            const duration = Date.now() - startTime;
            
            check.lastRun = startTime;
            check.lastResult = { success: false, error: error.message, duration };
            check.failures++;
            check.consecutiveFailures++;
            
            this.recordCheckResult(name, false, { error: error.message }, duration);
            
            globalTelemetry.log('error', 'HEALTH_CHECK', `Check failed: ${name}`, { error: error.message, duration });
            this.emit('checkFailed', { name, error, duration, consecutiveFailures: check.consecutiveFailures });
            
            // Trigger alert for multiple consecutive failures
            if (check.consecutiveFailures >= 3) {
                this.emit('criticalFailure', { name, consecutiveFailures: check.consecutiveFailures });
            }
        }
    }
    
    recordCheckResult(name, success, data, duration) {
        const record = {
            timestamp: new Date().toISOString(),
            name,
            success,
            data,
            duration
        };
        
        this.checkHistory.unshift(record);
        if (this.checkHistory.length > this.maxHistory) {
            this.checkHistory.pop();
        }
    }
    
    getStatus() {
        const status = {
            systemStatus: this.status,
            checks: {},
            summary: {
                total: this.checks.size,
                healthy: 0,
                unhealthy: 0,
                unknown: 0
            }
        };
        
        for (const [name, check] of this.checks) {
            const checkStatus = {
                lastRun: check.lastRun,
                lastResult: check.lastResult,
                failures: check.failures,
                consecutiveFailures: check.consecutiveFailures,
                status: check.lastResult?.success === true ? 'healthy' : 
                       check.lastResult?.success === false ? 'unhealthy' : 'unknown'
            };
            
            status.checks[name] = checkStatus;
            status.summary[checkStatus.status]++;
        }
        
        return status;
    }
    
    getHistory(checkName = null, limit = 100) {
        let history = this.checkHistory;
        
        if (checkName) {
            history = history.filter(record => record.name === checkName);
        }
        
        return history.slice(0, limit);
    }
}

/**
 * Failover Manager
 */
class FailoverManager extends EventEmitter {
    constructor(healthCheck) {
        super();
        this.healthCheck = healthCheck;
        this.failoverRules = new Map();
        this.autoSwitch = false;
        this.backupSystems = new Map();
        
        this.setupHealthCheckListeners();
        globalTelemetry.log('info', 'FAILOVER', 'Failover manager initialized');
    }
    
    setupHealthCheckListeners() {
        this.healthCheck.on('criticalFailure', (event) => {
            this.handleCriticalFailure(event);
        });
        
        this.healthCheck.on('checkFailed', (event) => {
            this.handleCheckFailure(event);
        });
    }
    
    addFailoverRule(systemName, rule) {
        this.failoverRules.set(systemName, rule);
        globalTelemetry.log('info', 'FAILOVER', `Added failover rule for ${systemName}`, { rule });
    }
    
    addBackupSystem(primaryName, backupSystem) {
        this.backupSystems.set(primaryName, backupSystem);
        globalTelemetry.log('info', 'FAILOVER', `Added backup system for ${primaryName}`);
    }
    
    enable_auto_switch() {
        this.autoSwitch = true;
        globalTelemetry.log('info', 'FAILOVER', 'Auto-switch enabled');
    }
    
    disable_auto_switch() {
        this.autoSwitch = false;
        globalTelemetry.log('info', 'FAILOVER', 'Auto-switch disabled');
    }
    
    async handleCriticalFailure(event) {
        const { name, consecutiveFailures } = event;
        
        globalTelemetry.log('error', 'FAILOVER', `Critical failure detected: ${name}`, { consecutiveFailures });
        
        const rule = this.failoverRules.get(name);
        if (!rule) {
            globalTelemetry.log('warn', 'FAILOVER', `No failover rule for ${name}`);
            return;
        }
        
        if (this.autoSwitch && rule.autoFailover) {
            await this.executeFailover(name, rule);
        } else {
            this.emit('manualFailoverRequired', { name, rule, event });
        }
    }
    
    async handleCheckFailure(event) {
        const { name, consecutiveFailures } = event;
        
        if (consecutiveFailures === 1) {
            // First failure - log and monitor
            globalTelemetry.log('warn', 'FAILOVER', `First failure detected: ${name}`);
        } else if (consecutiveFailures === 2) {
            // Second failure - prepare for potential failover
            globalTelemetry.log('warn', 'FAILOVER', `Second consecutive failure: ${name} - preparing failover`);
            this.emit('failoverPrepare', { name, consecutiveFailures });
        }
    }
    
    async executeFailover(systemName, rule) {
        globalTelemetry.log('info', 'FAILOVER', `Executing failover for ${systemName}`, { rule });
        
        try {
            // Stop the failing system
            if (rule.stopCommand) {
                await rule.stopCommand();
            }
            
            // Start backup system
            const backupSystem = this.backupSystems.get(systemName);
            if (backupSystem && rule.startBackup) {
                await rule.startBackup(backupSystem);
            }
            
            // Execute custom failover logic
            if (rule.customAction) {
                await rule.customAction();
            }
            
            this.emit('failoverExecuted', { systemName, rule });
            globalTelemetry.log('info', 'FAILOVER', `Failover completed for ${systemName}`);
            
        } catch (error) {
            globalTelemetry.log('error', 'FAILOVER', `Failover failed for ${systemName}`, { error: error.message });
            this.emit('failoverFailed', { systemName, error });
        }
    }
    
    getFailoverStatus() {
        return {
            autoSwitch: this.autoSwitch,
            rules: Array.from(this.failoverRules.keys()),
            backupSystems: Array.from(this.backupSystems.keys()),
            healthCheckStatus: this.healthCheck.getStatus()
        };
    }
}

/**
 * System Recovery Manager
 */
class RecoveryManager {
    constructor(healthCheck, failoverManager) {
        this.healthCheck = healthCheck;
        this.failoverManager = failoverManager;
        this.recoveryProcedures = new Map();
        this.recoveryHistory = [];
        
        this.setupRecoveryListeners();
        globalTelemetry.log('info', 'RECOVERY', 'Recovery manager initialized');
    }
    
    setupRecoveryListeners() {
        this.failoverManager.on('failoverExecuted', (event) => {
            this.scheduleRecoveryCheck(event.systemName);
        });
        
        this.healthCheck.on('checkPassed', (event) => {
            this.handleSystemRecovery(event.name);
        });
    }
    
    addRecoveryProcedure(systemName, procedure) {
        this.recoveryProcedures.set(systemName, procedure);
        globalTelemetry.log('info', 'RECOVERY', `Added recovery procedure for ${systemName}`);
    }
    
    scheduleRecoveryCheck(systemName, delay = 300000) { // 5 minutes default
        setTimeout(async () => {
            await this.attemptRecovery(systemName);
        }, delay);
        
        globalTelemetry.log('info', 'RECOVERY', `Scheduled recovery check for ${systemName}`, { delay });
    }
    
    async attemptRecovery(systemName) {
        const procedure = this.recoveryProcedures.get(systemName);
        if (!procedure) {
            globalTelemetry.log('warn', 'RECOVERY', `No recovery procedure for ${systemName}`);
            return;
        }
        
        globalTelemetry.log('info', 'RECOVERY', `Attempting recovery for ${systemName}`);
        
        try {
            const result = await procedure.execute();
            
            this.recordRecovery(systemName, true, result);
            globalTelemetry.log('info', 'RECOVERY', `Recovery successful for ${systemName}`, { result });
            
        } catch (error) {
            this.recordRecovery(systemName, false, { error: error.message });
            globalTelemetry.log('error', 'RECOVERY', `Recovery failed for ${systemName}`, { error: error.message });
        }
    }
    
    handleSystemRecovery(systemName) {
        // Check if this system was previously failed over
        const recentFailovers = this.recoveryHistory.filter(
            r => r.systemName === systemName && 
                 r.type === 'failover' && 
                 Date.now() - new Date(r.timestamp).getTime() < 3600000 // 1 hour
        );
        
        if (recentFailovers.length > 0) {
            globalTelemetry.log('info', 'RECOVERY', `System recovered: ${systemName}`);
            this.recordRecovery(systemName, true, { type: 'automatic' });
        }
    }
    
    recordRecovery(systemName, success, data) {
        const record = {
            timestamp: new Date().toISOString(),
            systemName,
            success,
            data,
            type: 'recovery'
        };
        
        this.recoveryHistory.unshift(record);
        if (this.recoveryHistory.length > 500) {
            this.recoveryHistory.pop();
        }
    }
    
    getRecoveryHistory(systemName = null, limit = 50) {
        let history = this.recoveryHistory;
        
        if (systemName) {
            history = history.filter(r => r.systemName === systemName);
        }
        
        return history.slice(0, limit);
    }
}

module.exports = {
    HealthCheck,
    FailoverManager,
    RecoveryManager
};
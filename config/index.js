// === LP TURBO: ADVANCED CONFIGURATION MANAGEMENT ===
// Environment-specific configuration with validation and hot-reloading
// Purpose: Professional configuration management for different environments

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { EventEmitter } = require('events');

class ConfigManager extends EventEmitter {
    constructor() {
        super();
        this.configPath = path.join(__dirname, '..', '.env');
        this.configCache = new Map();
        this.watchers = new Map();
        this.validators = new Map();
        this.defaultConfigs = new Map();
        this.encryptedKeys = new Set(['PRIVATE_KEY']);
        
        this.setupDefaults();
        this.setupValidators();
        this.loadConfig();
        this.startWatching();
    }
    
    setupDefaults() {
        this.defaultConfigs.set('development', {
            BASE_RPC_URL: 'https://mainnet.base.org',
            CHAIN_ID: '8453',
            GAS_LIMIT: '500000',
            GAS_PRICE: 'auto',
            TIMEOUT: '300000',
            RETRY_ATTEMPTS: '3',
            MONITORING_INTERVAL: '60000',
            SECURITY_LEVEL: 'high',
            LOG_LEVEL: 'debug',
            ENABLE_TELEMETRY: 'true',
            ENABLE_MONITORING: 'true',
            ENABLE_SECURITY: 'true',
            MAX_SLIPPAGE: '0.5',
            MIN_LIQUIDITY: '0.1',
            AUTO_MODE: 'false'
        });
        
        this.defaultConfigs.set('production', {
            BASE_RPC_URL: 'https://mainnet.base.org',
            CHAIN_ID: '8453',
            GAS_LIMIT: '400000',
            GAS_PRICE: 'auto',
            TIMEOUT: '180000',
            RETRY_ATTEMPTS: '5',
            MONITORING_INTERVAL: '30000',
            SECURITY_LEVEL: 'maximum',
            LOG_LEVEL: 'info',
            ENABLE_TELEMETRY: 'true',
            ENABLE_MONITORING: 'true',
            ENABLE_SECURITY: 'true',
            MAX_SLIPPAGE: '0.3',
            MIN_LIQUIDITY: '0.5',
            AUTO_MODE: 'false'
        });
        
        this.defaultConfigs.set('testing', {
            BASE_RPC_URL: 'http://localhost:8545',
            CHAIN_ID: '31337',
            GAS_LIMIT: '1000000',
            GAS_PRICE: '1000000000',
            TIMEOUT: '60000',
            RETRY_ATTEMPTS: '1',
            MONITORING_INTERVAL: '10000',
            SECURITY_LEVEL: 'low',
            LOG_LEVEL: 'debug',
            ENABLE_TELEMETRY: 'false',
            ENABLE_MONITORING: 'false',
            ENABLE_SECURITY: 'false',
            MAX_SLIPPAGE: '5.0',
            MIN_LIQUIDITY: '0.01',
            AUTO_MODE: 'false'
        });
    }
    
    setupValidators() {
        // Network validators
        this.validators.set('BASE_RPC_URL', (value) => {
            if (!value.startsWith('http://') && !value.startsWith('https://')) {
                throw new Error('RPC URL must start with http:// or https://');
            }
            return value;
        });
        
        this.validators.set('CHAIN_ID', (value) => {
            const chainId = parseInt(value);
            if (isNaN(chainId) || chainId <= 0) {
                throw new Error('Chain ID must be a positive integer');
            }
            return chainId.toString();
        });
        
        // Wallet validators
        this.validators.set('PRIVATE_KEY', (value) => {
            if (!value || value === 'your_private_key_here') {
                throw new Error('Private key must be set');
            }
            const cleanKey = value.startsWith('0x') ? value.slice(2) : value;
            if (cleanKey.length !== 64 || !/^[0-9a-fA-F]+$/.test(cleanKey)) {
                throw new Error('Private key must be 64 hex characters');
            }
            return cleanKey;
        });
        
        this.validators.set('FUNDING_WALLET', (value) => {
            if (!value || value === '0x1234567890123456789012345678901234567890') {
                throw new Error('Funding wallet must be set');
            }
            if (!/^0x[0-9a-fA-F]{40}$/.test(value)) {
                throw new Error('Funding wallet must be a valid Ethereum address');
            }
            return value.toLowerCase();
        });
        
        // Gas validators
        this.validators.set('GAS_LIMIT', (value) => {
            if (value === 'auto') return value;
            const gasLimit = parseInt(value);
            if (isNaN(gasLimit) || gasLimit < 21000 || gasLimit > 10000000) {
                throw new Error('Gas limit must be between 21000 and 10000000');
            }
            return gasLimit.toString();
        });
        
        this.validators.set('MAX_SLIPPAGE', (value) => {
            const slippage = parseFloat(value);
            if (isNaN(slippage) || slippage < 0 || slippage > 50) {
                throw new Error('Max slippage must be between 0 and 50');
            }
            return slippage.toString();
        });
        
        // Boolean validators
        ['AUTO_MODE', 'ENABLE_TELEMETRY', 'ENABLE_MONITORING', 'ENABLE_SECURITY'].forEach(key => {
            this.validators.set(key, (value) => {
                if (!['true', 'false'].includes(value.toLowerCase())) {
                    throw new Error(`${key} must be 'true' or 'false'`);
                }
                return value.toLowerCase();
            });
        });
        
        // Enum validators
        this.validators.set('SECURITY_LEVEL', (value) => {
            const levels = ['low', 'medium', 'high', 'maximum'];
            if (!levels.includes(value.toLowerCase())) {
                throw new Error(`Security level must be one of: ${levels.join(', ')}`);
            }
            return value.toLowerCase();
        });
        
        this.validators.set('LOG_LEVEL', (value) => {
            const levels = ['error', 'warn', 'info', 'debug'];
            if (!levels.includes(value.toLowerCase())) {
                throw new Error(`Log level must be one of: ${levels.join(', ')}`);
            }
            return value.toLowerCase();
        });
    }
    
    loadConfig() {
        const config = new Map();
        
        // Load environment defaults
        const env = process.env.NODE_ENV || 'development';
        const defaults = this.defaultConfigs.get(env) || this.defaultConfigs.get('development');
        
        for (const [key, value] of Object.entries(defaults)) {
            config.set(key, value);
        }
        
        // Load from .env file
        if (fs.existsSync(this.configPath)) {
            const envContent = fs.readFileSync(this.configPath, 'utf8');
            const lines = envContent.split('\n');
            
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    const [key, ...valueParts] = trimmed.split('=');
                    if (key && valueParts.length > 0) {
                        const value = valueParts.join('=').trim();
                        config.set(key, value);
                    }
                }
            }
        }
        
        // Load from environment variables (highest priority)
        for (const [key] of config) {
            if (process.env[key]) {
                config.set(key, process.env[key]);
            }
        }
        
        // Validate all configurations
        const validatedConfig = new Map();
        for (const [key, value] of config) {
            try {
                if (this.validators.has(key)) {
                    validatedConfig.set(key, this.validators.get(key)(value));
                } else {
                    validatedConfig.set(key, value);
                }
            } catch (error) {
                console.warn(`Configuration validation failed for ${key}: ${error.message}`);
                validatedConfig.set(key, value); // Use unvalidated value with warning
            }
        }
        
        this.configCache = validatedConfig;
        this.emit('configLoaded', this.configCache);
    }
    
    get(key, defaultValue = null) {
        return this.configCache.get(key) || defaultValue;
    }
    
    set(key, value) {
        try {
            if (this.validators.has(key)) {
                value = this.validators.get(key)(value);
            }
            
            this.configCache.set(key, value);
            this.saveToFile();
            this.emit('configChanged', key, value);
            
            return true;
        } catch (error) {
            throw new Error(`Failed to set ${key}: ${error.message}`);
        }
    }
    
    getAll() {
        const config = {};
        for (const [key, value] of this.configCache) {
            // Mask sensitive values
            if (this.encryptedKeys.has(key)) {
                config[key] = value ? '*'.repeat(8) : 'not_set';
            } else {
                config[key] = value;
            }
        }
        return config;
    }
    
    getAllRaw() {
        const config = {};
        for (const [key, value] of this.configCache) {
            config[key] = value;
        }
        return config;
    }
    
    saveToFile() {
        const lines = [];
        lines.push('# LP TURBO CONFIGURATION');
        lines.push('# Generated automatically - do not edit manually');
        lines.push('');
        
        // Group configurations
        const groups = {
            'Wallet Configuration': ['PRIVATE_KEY', 'FUNDING_WALLET', 'CONTRACT_ADDRESS'],
            'Network Configuration': ['BASE_RPC_URL', 'CHAIN_ID'],
            'Gas Configuration': ['GAS_LIMIT', 'GAS_PRICE', 'MAX_SLIPPAGE'],
            'Operational Configuration': ['TIMEOUT', 'RETRY_ATTEMPTS', 'MIN_LIQUIDITY'],
            'System Configuration': ['MONITORING_INTERVAL', 'SECURITY_LEVEL', 'LOG_LEVEL'],
            'Feature Flags': ['ENABLE_TELEMETRY', 'ENABLE_MONITORING', 'ENABLE_SECURITY', 'AUTO_MODE']
        };
        
        for (const [groupName, keys] of Object.entries(groups)) {
            lines.push(`# ${groupName}`);
            for (const key of keys) {
                if (this.configCache.has(key)) {
                    lines.push(`${key}=${this.configCache.get(key)}`);
                }
            }
            lines.push('');
        }
        
        // Add any additional keys not in groups
        const groupedKeys = Object.values(groups).flat();
        for (const [key, value] of this.configCache) {
            if (!groupedKeys.includes(key)) {
                lines.push(`${key}=${value}`);
            }
        }
        
        fs.writeFileSync(this.configPath, lines.join('\n'));
    }
    
    startWatching() {
        if (fs.existsSync(this.configPath)) {
            const watcher = fs.watch(this.configPath, (eventType) => {
                if (eventType === 'change') {
                    this.loadConfig();
                    this.emit('configReloaded');
                }
            });
            
            this.watchers.set('configFile', watcher);
        }
    }
    
    stopWatching() {
        for (const [name, watcher] of this.watchers) {
            watcher.close();
        }
        this.watchers.clear();
    }
    
    validateConfiguration() {
        const errors = [];
        const warnings = [];
        
        // Check critical configurations
        const critical = ['PRIVATE_KEY', 'FUNDING_WALLET'];
        for (const key of critical) {
            if (!this.configCache.has(key) || !this.configCache.get(key)) {
                errors.push(`Missing critical configuration: ${key}`);
            }
        }
        
        // Check network configuration
        if (this.get('CHAIN_ID') === '31337' && this.get('BASE_RPC_URL').includes('localhost')) {
            warnings.push('Using local development network');
        }
        
        // Check security settings
        if (this.get('SECURITY_LEVEL') === 'low') {
            warnings.push('Security level is set to low');
        }
        
        if (this.get('ENABLE_SECURITY') === 'false') {
            warnings.push('Security features are disabled');
        }
        
        // Check gas settings
        const gasLimit = parseInt(this.get('GAS_LIMIT'));
        if (gasLimit > 5000000) {
            warnings.push('Gas limit is very high - potential for expensive transactions');
        }
        
        const slippage = parseFloat(this.get('MAX_SLIPPAGE'));
        if (slippage > 5) {
            warnings.push('Max slippage is high - potential for unfavorable trades');
        }
        
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
    
    exportConfig(format = 'json') {
        const config = this.getAllRaw();
        
        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(config, null, 2);
                
            case 'yaml':
                const lines = [];
                for (const [key, value] of Object.entries(config)) {
                    lines.push(`${key}: ${value}`);
                }
                return lines.join('\n');
                
            case 'env':
                const envLines = [];
                for (const [key, value] of Object.entries(config)) {
                    envLines.push(`${key}=${value}`);
                }
                return envLines.join('\n');
                
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }
    
    importConfig(configString, format = 'json') {
        let importedConfig;
        
        switch (format.toLowerCase()) {
            case 'json':
                importedConfig = JSON.parse(configString);
                break;
                
            case 'env':
                importedConfig = {};
                const lines = configString.split('\n');
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed && !trimmed.startsWith('#')) {
                        const [key, ...valueParts] = trimmed.split('=');
                        if (key && valueParts.length > 0) {
                            importedConfig[key] = valueParts.join('=');
                        }
                    }
                }
                break;
                
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
        
        // Validate and set imported config
        for (const [key, value] of Object.entries(importedConfig)) {
            try {
                this.set(key, value);
            } catch (error) {
                console.warn(`Failed to import ${key}: ${error.message}`);
            }
        }
    }
    
    createEnvironmentConfig(env) {
        const defaults = this.defaultConfigs.get(env);
        if (!defaults) {
            throw new Error(`Unknown environment: ${env}`);
        }
        
        const configLines = [];
        configLines.push(`# LP TURBO CONFIGURATION - ${env.toUpperCase()} ENVIRONMENT`);
        configLines.push('');
        
        for (const [key, value] of Object.entries(defaults)) {
            configLines.push(`${key}=${value}`);
        }
        
        const filename = `.env.${env}`;
        fs.writeFileSync(filename, configLines.join('\n'));
        
        return filename;
    }
    
    getConfigSummary() {
        return {
            environment: process.env.NODE_ENV || 'development',
            totalConfigs: this.configCache.size,
            criticalConfigsSet: ['PRIVATE_KEY', 'FUNDING_WALLET'].filter(key => 
                this.configCache.has(key) && this.configCache.get(key)
            ).length,
            securityLevel: this.get('SECURITY_LEVEL'),
            networkChain: this.get('CHAIN_ID'),
            autoMode: this.get('AUTO_MODE') === 'true',
            monitoringEnabled: this.get('ENABLE_MONITORING') === 'true',
            lastLoaded: new Date().toISOString()
        };
    }
}

// Network-specific configurations
class NetworkConfig {
    static getNetworkDefaults(network) {
        const configs = {
            ethereum: {
                CHAIN_ID: '1',
                BASE_RPC_URL: 'https://mainnet.infura.io/v3/YOUR_KEY',
                GAS_LIMIT: '300000',
                GAS_PRICE: 'auto',
                ROUTER_ADDRESS: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
            },
            base: {
                CHAIN_ID: '8453',
                BASE_RPC_URL: 'https://mainnet.base.org',
                GAS_LIMIT: '200000',
                GAS_PRICE: 'auto',
                ROUTER_ADDRESS: '0x327Df1E6de05895d2ab08513aaDD9313Fe505d86'
            },
            bsc: {
                CHAIN_ID: '56',
                BASE_RPC_URL: 'https://bsc-dataseed.binance.org',
                GAS_LIMIT: '250000',
                GAS_PRICE: '5000000000',
                ROUTER_ADDRESS: '0x10ED43C718714eb63d5aA57B78B54704E256024E'
            },
            polygon: {
                CHAIN_ID: '137',
                BASE_RPC_URL: 'https://polygon-rpc.com',
                GAS_LIMIT: '200000',
                GAS_PRICE: '30000000000',
                ROUTER_ADDRESS: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff'
            },
            arbitrum: {
                CHAIN_ID: '42161',
                BASE_RPC_URL: 'https://arb1.arbitrum.io/rpc',
                GAS_LIMIT: '1000000',
                GAS_PRICE: 'auto',
                ROUTER_ADDRESS: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
            }
        };
        
        return configs[network] || configs.base;
    }
}

// Initialize global config manager
const globalConfig = new ConfigManager();

module.exports = {
    ConfigManager,
    NetworkConfig,
    globalConfig
};
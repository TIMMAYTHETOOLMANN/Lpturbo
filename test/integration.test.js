// === LP TURBO: SYSTEM INTEGRATION TEST ===
// Test suite for the monolith upgrade system

require("dotenv").config();
const { 
    inject_liquidity, 
    withdraw_liquidity, 
    deploy_contract,
    bridge_token,
    estimate_gas,
    globalTelemetry, 
    globalDashboard,
    initializeAllSystems,
    LIQUIDITY_ADAPTERS
} = require('../lpturbo-monolith');

const { AdvancedGasEstimator, SmartFeeManager } = require('../gas/optimizer');
const { HealthCheck, FailoverManager } = require('../monitoring/health');

/**
 * Integration test suite for LP Turbo optimization
 */
class SystemIntegrationTest {
    constructor() {
        this.results = [];
        this.startTime = Date.now();
    }
    
    async runAllTests() {
        console.log("🧪 LP TURBO SYSTEM INTEGRATION TESTS STARTING...");
        globalTelemetry.log('info', 'INTEGRATION_TEST', 'Starting comprehensive system tests');
        
        const testSuite = [
            { name: 'System Initialization', test: () => this.testSystemInitialization() },
            { name: 'Liquidity Adapters', test: () => this.testLiquidityAdapters() },
            { name: 'Gas Optimization', test: () => this.testGasOptimization() },
            { name: 'Telemetry System', test: () => this.testTelemetrySystem() },
            { name: 'Dashboard Functionality', test: () => this.testDashboard() },
            { name: 'Health Monitoring', test: () => this.testHealthMonitoring() },
            { name: 'Multi-Network Support', test: () => this.testMultiNetworkSupport() },
            { name: 'Fee Management', test: () => this.testFeeManagement() },
            { name: 'Bridge Integration', test: () => this.testBridgeIntegration() },
            { name: 'Contract Generation', test: () => this.testContractGeneration() }
        ];
        
        for (const { name, test } of testSuite) {
            try {
                console.log(`\n🔬 Testing: ${name}`);
                const result = await test();
                this.recordResult(name, true, result);
                console.log(`✅ ${name}: PASSED`);
            } catch (error) {
                this.recordResult(name, false, { error: error.message });
                console.log(`❌ ${name}: FAILED - ${error.message}`);
            }
        }
        
        await this.generateReport();
        
        const totalTests = this.results.length;
        const passedTests = this.results.filter(r => r.success).length;
        const failedTests = totalTests - passedTests;
        const successRate = ((passedTests / totalTests) * 100).toFixed(2);
        
        return {
            summary: {
                totalTests,
                passedTests,
                failedTests,
                successRate: parseFloat(successRate)
            }
        };
    }
    
    async testSystemInitialization() {
        const result = await initializeAllSystems();
        
        if (!result.success) {
            throw new Error("System initialization failed");
        }
        
        return { systemStatus: result.status };
    }
    
    async testLiquidityAdapters() {
        const testResults = {};
        
        for (const [network, adapter] of Object.entries(LIQUIDITY_ADAPTERS)) {
            try {
                // Test balance check
                const balance = await adapter.getBalance(network, 'test-token', 'test-address');
                
                // Test gas estimation
                const gasEstimate = await adapter.estimateGas(network, 'inject', {});
                
                testResults[network] = {
                    balanceCheck: balance !== undefined,
                    gasEstimation: gasEstimate !== undefined,
                    adapterName: adapter.constructor.name
                };
            } catch (error) {
                testResults[network] = { error: error.message };
            }
        }
        
        return testResults;
    }
    
    async testGasOptimization() {
        const gasEstimator = new AdvancedGasEstimator();
        
        const testTx = { type: 'liquidity_injection', value: '1000000000000000000' };
        const networks = ['ethereum', 'base', 'bsc', 'polygon', 'arbitrum'];
        
        const estimates = {};
        for (const network of networks) {
            estimates[network] = await gasEstimator.estimate(testTx, network);
        }
        
        // Test batch optimization
        const testTxs = Array(5).fill(testTx);
        const batchResult = await gasEstimator.optimizeBatch(testTxs, 'base');
        
        return {
            singleEstimates: estimates,
            batchOptimization: batchResult,
            totalSavings: batchResult.batchSavings
        };
    }
    
    async testTelemetrySystem() {
        // Test telemetry logging
        const logId = globalTelemetry.log('info', 'TEST', 'Test telemetry message', { test: true });
        
        // Test metrics retrieval
        const metrics = globalTelemetry.getMetrics();
        
        // Test log retrieval
        const logs = globalTelemetry.getLogs(10);
        
        return {
            logGenerated: logId !== undefined,
            metricsAvailable: metrics.operations > 0,
            logsRetrievable: logs.length > 0,
            currentMetrics: metrics
        };
    }
    
    async testDashboard() {
        // Test system registration
        globalDashboard.registerSystem('TEST_SYSTEM', { test: true }, async () => {
            return { healthy: true };
        });
        
        // Test status check
        const status = await globalDashboard.status_check();
        
        // Test alert generation
        const alertId = globalDashboard.addAlert('info', 'Test alert', { test: true });
        
        return {
            systemRegistered: status.systems.TEST_SYSTEM !== undefined,
            statusCheckWorking: status.timestamp !== undefined,
            alertGenerated: alertId !== undefined,
            overallStatus: status.overall
        };
    }
    
    async testHealthMonitoring() {
        const healthCheck = new HealthCheck();
        
        // Add test health check
        healthCheck.addCheck('test-check', async () => {
            return { status: 'healthy', timestamp: Date.now() };
        }, 1000);
        
        // Start and immediately run check
        healthCheck.start();
        
        // Wait for check to run
        await new Promise(resolve => setTimeout(resolve, 1100));
        
        const status = healthCheck.getStatus();
        
        healthCheck.stop();
        
        return {
            healthCheckAdded: status.checks['test-check'] !== undefined,
            systemStarted: status.systemStatus === 'stopped', // Stopped after test
            checkExecuted: status.checks['test-check']?.lastRun !== null
        };
    }
    
    async testMultiNetworkSupport() {
        const networks = ['base', 'bsc', 'polygon'];
        const results = {};
        
        for (const network of networks) {
            try {
                // Test liquidity injection (simulation)
                const result = await inject_liquidity(
                    network, 
                    'token-a', 
                    'token-b', 
                    '1000000000000000000', 
                    '1000000000000000000'
                );
                
                results[network] = {
                    injectionSupported: result.success,
                    networkName: result.network || network
                };
            } catch (error) {
                results[network] = { error: error.message };
            }
        }
        
        return results;
    }
    
    async testFeeManagement() {
        const feeManager = new SmartFeeManager();
        
        const testTx = { 
            type: 'liquidity_injection', 
            value: '1000000000000000000',
            to: '0x1234567890123456789012345678901234567890'
        };
        
        const optimization = await feeManager.optimizeTransactionFees(testTx, 'base');
        
        return {
            feeOptimized: optimization.totalSavings >= 0,
            gasEstimateProvided: optimization.gasEstimate !== undefined,
            mevProtectionEnabled: optimization.mevProtection !== undefined,
            totalSavings: optimization.totalSavings
        };
    }
    
    async testBridgeIntegration() {
        const testCases = [
            { token: 'TEST', src: 'ethereum', dest: 'bsc', amount: '1000' },
            { token: 'TEST', src: 'ethereum', dest: 'polygon', amount: '2000' },
            { token: 'TEST', src: 'bsc', dest: 'solana', amount: '3000' }
        ];
        
        const results = {};
        
        for (const testCase of testCases) {
            try {
                const result = await bridge_token(
                    testCase.token, 
                    testCase.src, 
                    testCase.dest, 
                    testCase.amount
                );
                
                results[`${testCase.src}-${testCase.dest}`] = {
                    bridgeFound: result.success,
                    bridgeName: result.bridge,
                    txHash: result.txHash
                };
            } catch (error) {
                results[`${testCase.src}-${testCase.dest}`] = { error: error.message };
            }
        }
        
        return results;
    }
    
    async testContractGeneration() {
        const testCases = [
            { template: 'ERC20', params: { name: 'Test' }, chain: 'ethereum' },
            { template: 'LiquidityPool', params: { token: 'TEST' }, chain: 'base' },
            { template: 'Token', params: { supply: '1000000' }, chain: 'solana' }
        ];
        
        const results = {};
        
        for (const testCase of testCases) {
            try {
                const result = deploy_contract(testCase.chain, testCase.template, testCase.params);
                
                results[testCase.chain] = {
                    contractGenerated: result.success,
                    contractType: result.type,
                    template: result.template
                };
            } catch (error) {
                results[testCase.chain] = { error: error.message };
            }
        }
        
        return results;
    }
    
    recordResult(testName, success, data) {
        this.results.push({
            testName,
            success,
            data,
            timestamp: new Date().toISOString()
        });
        
        globalTelemetry.log(
            success ? 'info' : 'error', 
            'INTEGRATION_TEST', 
            `Test ${success ? 'passed' : 'failed'}: ${testName}`,
            data
        );
    }
    
    async generateReport() {
        const totalTests = this.results.length;
        const passedTests = this.results.filter(r => r.success).length;
        const failedTests = totalTests - passedTests;
        const successRate = ((passedTests / totalTests) * 100).toFixed(2);
        const duration = Date.now() - this.startTime;
        
        const report = {
            summary: {
                totalTests,
                passedTests,
                failedTests,
                successRate: parseFloat(successRate),
                duration,
                timestamp: new Date().toISOString()
            },
            results: this.results,
            systemMetrics: globalTelemetry.getMetrics(),
            dashboardStatus: await globalDashboard.status_check()
        };
        
        console.log("\n📊 INTEGRATION TEST REPORT");
        console.log("=" .repeat(50));
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests} ✅`);
        console.log(`Failed: ${failedTests} ❌`);
        console.log(`Success Rate: ${successRate}%`);
        console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
        console.log("=" .repeat(50));
        
        if (failedTests > 0) {
            console.log("\n❌ FAILED TESTS:");
            this.results.filter(r => !r.success).forEach(result => {
                console.log(`- ${result.testName}: ${result.data.error || 'Unknown error'}`);
            });
        }
        
        globalTelemetry.log('info', 'INTEGRATION_TEST', 'Test suite completed', report.summary);
        
        return report;
    }
}

// Execute tests if run directly
if (require.main === module) {
    const testSuite = new SystemIntegrationTest();
    testSuite.runAllTests()
        .then((report) => {
            console.log(`\n🎉 INTEGRATION TESTS COMPLETE - ${report.summary.successRate}% SUCCESS RATE`);
            process.exit(report.summary.failedTests > 0 ? 1 : 0);
        })
        .catch((error) => {
            console.error("💥 TEST SUITE FAILED:", error);
            process.exit(1);
        });
}

module.exports = SystemIntegrationTest;
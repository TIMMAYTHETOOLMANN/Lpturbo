/**
 * PERFORMANCE TESTER MODULE
 * Advanced performance testing and stress testing capabilities
 */

const { performance } = require('perf_hooks');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');

class PerformanceTester {
    constructor() {
        this.metrics = {
            memory: [],
            cpu: [],
            latency: [],
            throughput: [],
            errors: [],
            concurrency: []
        };
        this.baselineMetrics = null;
        this.stressTestResults = {};
    }

    async runPerformanceTests() {
        console.log("🏋️  Starting performance testing suite...");
        
        const results = {
            baseline: await this.measureBaseline(),
            stress: await this.runStressTests(),
            load: await this.runLoadTests(),
            memory: await this.testMemoryLeaks(),
            concurrency: await this.testConcurrency(),
            failover: await this.testFailover()
        };
        
        results.score = this.calculatePerformanceScore(results);
        results.recommendations = this.generateRecommendations(results);
        
        console.log(`📊 Performance testing complete. Score: ${results.score}/100`);
        
        return results;
    }

    async measureBaseline() {
        console.log("📏 Measuring baseline performance...");
        
        const baseline = {
            startupTime: 0,
            memoryUsage: 0,
            cpuUsage: 0,
            responseTime: 0,
            errorRate: 0
        };
        
        try {
            // Measure startup time
            const startTime = performance.now();
            await this.simulateSystemStartup();
            baseline.startupTime = performance.now() - startTime;
            
            // Measure memory usage
            const memUsage = process.memoryUsage();
            baseline.memoryUsage = memUsage.heapUsed;
            
            // Measure response time for basic operations
            const responseStart = performance.now();
            await this.simulateBasicOperations();
            baseline.responseTime = performance.now() - responseStart;
            
            this.baselineMetrics = baseline;
            
        } catch (error) {
            console.warn(`⚠️  Baseline measurement failed: ${error.message}`);
        }
        
        return baseline;
    }

    async runStressTests() {
        console.log("🔥 Running stress tests...");
        
        const stressResults = {
            maxConcurrentUsers: 0,
            memoryLeakDetected: false,
            crashPoints: [],
            degradationThreshold: 0,
            recoveryTime: 0
        };
        
        try {
            // Test increasing load until failure
            for (let concurrency = 10; concurrency <= 1000; concurrency += 10) {
                console.log(`   Testing ${concurrency} concurrent operations...`);
                
                const result = await this.testConcurrentLoad(concurrency);
                
                if (result.success) {
                    stressResults.maxConcurrentUsers = concurrency;
                } else {
                    stressResults.crashPoints.push({
                        concurrency,
                        error: result.error,
                        timestamp: new Date().toISOString()
                    });
                    break;
                }
                
                // Check for memory leaks
                if (this.detectMemoryLeak()) {
                    stressResults.memoryLeakDetected = true;
                    break;
                }
                
                // Small delay between tests
                await this.sleep(100);
            }
            
            // Test recovery
            if (stressResults.crashPoints.length > 0) {
                const recoveryStart = performance.now();
                await this.testSystemRecovery();
                stressResults.recoveryTime = performance.now() - recoveryStart;
            }
            
        } catch (error) {
            console.warn(`⚠️  Stress testing failed: ${error.message}`);
        }
        
        return stressResults;
    }

    async runLoadTests() {
        console.log("📈 Running load tests...");
        
        const loadResults = {
            sustainedThroughput: 0,
            peakThroughput: 0,
            averageLatency: 0,
            p95Latency: 0,
            p99Latency: 0,
            errorRate: 0
        };
        
        try {
            const testDuration = 30000; // 30 seconds
            const requestInterval = 100; // Request every 100ms
            const startTime = performance.now();
            const latencies = [];
            let successCount = 0;
            let errorCount = 0;
            
            while (performance.now() - startTime < testDuration) {
                const requestStart = performance.now();
                
                try {
                    await this.simulateRequest();
                    const latency = performance.now() - requestStart;
                    latencies.push(latency);
                    successCount++;
                } catch (error) {
                    errorCount++;
                }
                
                await this.sleep(requestInterval);
            }
            
            // Calculate metrics
            const totalRequests = successCount + errorCount;
            const testDurationSeconds = testDuration / 1000;
            
            loadResults.sustainedThroughput = successCount / testDurationSeconds;
            loadResults.errorRate = (errorCount / totalRequests) * 100;
            
            if (latencies.length > 0) {
                latencies.sort((a, b) => a - b);
                loadResults.averageLatency = latencies.reduce((a, b) => a + b) / latencies.length;
                loadResults.p95Latency = latencies[Math.floor(latencies.length * 0.95)];
                loadResults.p99Latency = latencies[Math.floor(latencies.length * 0.99)];
            }
            
        } catch (error) {
            console.warn(`⚠️  Load testing failed: ${error.message}`);
        }
        
        return loadResults;
    }

    async testMemoryLeaks() {
        console.log("🧠 Testing for memory leaks...");
        
        const memoryResults = {
            leakDetected: false,
            memoryGrowth: 0,
            gcEfficiency: 0,
            heapFragmentation: 0
        };
        
        try {
            const initialMemory = process.memoryUsage().heapUsed;
            const memorySnapshots = [];
            
            // Run operations that might cause memory leaks
            for (let i = 0; i < 100; i++) {
                await this.simulateMemoryIntensiveOperation();
                
                if (i % 10 === 0) {
                    // Force garbage collection if available
                    if (global.gc) {
                        global.gc();
                    }
                    
                    const currentMemory = process.memoryUsage();
                    memorySnapshots.push({
                        iteration: i,
                        heapUsed: currentMemory.heapUsed,
                        heapTotal: currentMemory.heapTotal,
                        external: currentMemory.external
                    });
                }
            }
            
            // Analyze memory growth
            if (memorySnapshots.length > 1) {
                const finalMemory = memorySnapshots[memorySnapshots.length - 1].heapUsed;
                memoryResults.memoryGrowth = finalMemory - initialMemory;
                memoryResults.leakDetected = memoryResults.memoryGrowth > initialMemory * 0.5; // 50% growth
            }
            
        } catch (error) {
            console.warn(`⚠️  Memory leak testing failed: ${error.message}`);
        }
        
        return memoryResults;
    }

    async testConcurrency() {
        console.log("🔄 Testing concurrency handling...");
        
        const concurrencyResults = {
            maxConcurrentOperations: 0,
            deadlockDetected: false,
            raceConditions: 0,
            dataConsistency: true,
            threadSafety: true
        };
        
        try {
            // Test concurrent database operations (simulated)
            const concurrentOperations = [];
            const sharedState = { counter: 0, items: [] };
            
            for (let i = 0; i < 50; i++) {
                concurrentOperations.push(this.simulateConcurrentOperation(sharedState, i));
            }
            
            const results = await Promise.allSettled(concurrentOperations);
            
            concurrencyResults.maxConcurrentOperations = results.filter(r => r.status === 'fulfilled').length;
            
            // Check for race conditions by verifying final state
            if (sharedState.counter !== 50 || sharedState.items.length !== 50) {
                concurrencyResults.raceConditions = Math.abs(50 - sharedState.counter);
                concurrencyResults.dataConsistency = false;
            }
            
        } catch (error) {
            console.warn(`⚠️  Concurrency testing failed: ${error.message}`);
        }
        
        return concurrencyResults;
    }

    async testFailover() {
        console.log("🔧 Testing failover scenarios...");
        
        const failoverResults = {
            serviceUnavailableRecovery: false,
            dataIntegrityMaintained: false,
            failoverTime: 0,
            automaticRecovery: false
        };
        
        try {
            // Simulate service failure
            console.log("   Simulating service failure...");
            const failureStart = performance.now();
            
            await this.simulateServiceFailure();
            
            // Test recovery
            const recoveryResult = await this.testServiceRecovery();
            
            failoverResults.failoverTime = performance.now() - failureStart;
            failoverResults.serviceUnavailableRecovery = recoveryResult.recovered;
            failoverResults.dataIntegrityMaintained = recoveryResult.dataIntact;
            failoverResults.automaticRecovery = recoveryResult.automatic;
            
        } catch (error) {
            console.warn(`⚠️  Failover testing failed: ${error.message}`);
        }
        
        return failoverResults;
    }

    async testConcurrentLoad(concurrency) {
        return new Promise((resolve) => {
            let completed = 0;
            let errors = 0;
            const startTime = performance.now();
            
            const workers = [];
            
            for (let i = 0; i < concurrency; i++) {
                try {
                    // Simulate concurrent operation without actual worker threads
                    // (simplified for this implementation)
                    this.simulateRequest().then(() => {
                        completed++;
                        if (completed + errors >= concurrency) {
                            resolve({
                                success: errors < concurrency * 0.1, // Less than 10% error rate
                                completed,
                                errors,
                                duration: performance.now() - startTime
                            });
                        }
                    }).catch(() => {
                        errors++;
                        if (completed + errors >= concurrency) {
                            resolve({
                                success: false,
                                completed,
                                errors,
                                duration: performance.now() - startTime,
                                error: 'Too many errors'
                            });
                        }
                    });
                } catch (error) {
                    errors++;
                }
            }
        });
    }

    detectMemoryLeak() {
        const currentMemory = process.memoryUsage().heapUsed;
        
        if (this.baselineMetrics) {
            // Simple heuristic: if memory usage is 3x baseline, consider it a leak
            return currentMemory > this.baselineMetrics.memoryUsage * 3;
        }
        
        return false;
    }

    calculatePerformanceScore(results) {
        let score = 100;
        
        // Deduct points for issues
        if (results.stress.memoryLeakDetected) score -= 20;
        if (results.stress.crashPoints.length > 0) score -= 15;
        if (results.load.errorRate > 5) score -= 10;
        if (results.memory.leakDetected) score -= 15;
        if (!results.concurrency.dataConsistency) score -= 20;
        if (!results.failover.serviceUnavailableRecovery) score -= 10;
        
        // Performance penalties
        if (results.load.averageLatency > 1000) score -= 10; // > 1 second
        if (results.stress.maxConcurrentUsers < 50) score -= 10;
        
        return Math.max(0, score);
    }

    generateRecommendations(results) {
        const recommendations = [];
        
        if (results.stress.memoryLeakDetected) {
            recommendations.push("Memory leak detected - review object lifecycle and garbage collection");
        }
        
        if (results.stress.maxConcurrentUsers < 100) {
            recommendations.push("Low concurrency limit - consider connection pooling and async processing");
        }
        
        if (results.load.errorRate > 5) {
            recommendations.push("High error rate under load - improve error handling and retry logic");
        }
        
        if (results.load.p95Latency > 2000) {
            recommendations.push("High latency detected - optimize database queries and caching");
        }
        
        if (!results.concurrency.dataConsistency) {
            recommendations.push("Race conditions detected - implement proper locking mechanisms");
        }
        
        if (!results.failover.serviceUnavailableRecovery) {
            recommendations.push("Poor failover recovery - implement circuit breakers and health checks");
        }
        
        return recommendations;
    }

    // Simulation methods (would be replaced with actual system calls in production)
    async simulateSystemStartup() {
        await this.sleep(Math.random() * 100);
    }

    async simulateBasicOperations() {
        await this.sleep(Math.random() * 50);
    }

    async simulateRequest() {
        // Simulate variable response time
        const responseTime = Math.random() * 100 + 10; // 10-110ms
        await this.sleep(responseTime);
        
        // Simulate occasional errors
        if (Math.random() < 0.02) { // 2% error rate
            throw new Error('Simulated request error');
        }
    }

    async simulateMemoryIntensiveOperation() {
        // Create some objects to test memory handling
        const largeArray = new Array(1000).fill(0).map(() => ({
            id: Math.random(),
            data: new Array(100).fill('test data'),
            timestamp: Date.now()
        }));
        
        // Simulate processing
        await this.sleep(10);
        
        // Objects should be garbage collected when function exits
        return largeArray.length;
    }

    async simulateConcurrentOperation(sharedState, id) {
        // Simulate race condition potential
        const currentCounter = sharedState.counter;
        await this.sleep(Math.random() * 10); // Random delay
        sharedState.counter = currentCounter + 1;
        sharedState.items.push(id);
    }

    async simulateServiceFailure() {
        console.log("   Service failure simulated");
        await this.sleep(1000);
    }

    async testServiceRecovery() {
        await this.sleep(500);
        return {
            recovered: true,
            dataIntact: true,
            automatic: true
        };
    }

    async testSystemRecovery() {
        await this.sleep(1000);
        return true;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getMetrics() {
        return this.metrics;
    }
}

// Execute if run directly
if (require.main === module) {
    const tester = new PerformanceTester();
    tester.runPerformanceTests()
        .then((results) => {
            console.log("\n🏋️  PERFORMANCE TESTING COMPLETE");
            console.log(`📊 Performance Score: ${results.score}/100`);
            console.log(`🔥 Max Concurrency: ${results.stress.maxConcurrentUsers}`);
            console.log(`📈 Throughput: ${results.load.sustainedThroughput} ops/sec`);
            console.log(`⏱️  Average Latency: ${results.load.averageLatency}ms`);
            
            if (results.recommendations.length > 0) {
                console.log("\n💡 RECOMMENDATIONS:");
                results.recommendations.forEach(rec => {
                    console.log(`- ${rec}`);
                });
            }
            
            process.exit(results.score < 70 ? 1 : 0);
        })
        .catch((error) => {
            console.error("💥 PERFORMANCE TESTING FAILED:", error);
            process.exit(1);
        });
}

module.exports = PerformanceTester;
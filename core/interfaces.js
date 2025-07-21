// === LP TURBO: CORE INTERFACES ===
// Foundational interfaces for the monolith upgrade system

/**
 * Interface for liquidity injection across multiple networks
 */
class ILiquidityInjector {
    async inject(network, tokenA, tokenB, amountA, amountB) {
        throw new Error("inject method must be implemented");
    }
    
    async withdraw(network, lpToken, amount) {
        throw new Error("withdraw method must be implemented");
    }
    
    async getBalance(network, token, address) {
        throw new Error("getBalance method must be implemented");
    }
    
    async estimateGas(network, operation, params) {
        throw new Error("estimateGas method must be implemented");
    }
}

/**
 * Interface for contract generation and deployment
 */
class IContractFactory {
    async generate(template, params, chain) {
        throw new Error("generate method must be implemented");
    }
    
    async deploy(contract, chain, params) {
        throw new Error("deploy method must be implemented");
    }
    
    async verify(contractAddress, chain) {
        throw new Error("verify method must be implemented");
    }
}

/**
 * Interface for monitoring and rebalancing
 */
class IMonitor {
    async checkHealth(network, contract) {
        throw new Error("checkHealth method must be implemented");
    }
    
    async setThreshold(network, threshold) {
        throw new Error("setThreshold method must be implemented");
    }
    
    async getMetrics(network) {
        throw new Error("getMetrics method must be implemented");
    }
}

/**
 * Interface for cross-chain bridging
 */
class IBridge {
    async supports(srcChain, destChain) {
        throw new Error("supports method must be implemented");
    }
    
    async transfer(token, srcChain, destChain, amount) {
        throw new Error("transfer method must be implemented");
    }
    
    async estimateFees(token, srcChain, destChain, amount) {
        throw new Error("estimateFees method must be implemented");
    }
}

/**
 * Interface for gas optimization
 */
class IGasEstimator {
    async estimate(tx, network) {
        throw new Error("estimate method must be implemented");
    }
    
    async optimize(tx, network) {
        throw new Error("optimize method must be implemented");
    }
    
    async getRecommendedGasPrice(network) {
        throw new Error("getRecommendedGasPrice method must be implemented");
    }
}

module.exports = {
    ILiquidityInjector,
    IContractFactory,
    IMonitor,
    IBridge,
    IGasEstimator
};
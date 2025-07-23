#!/usr/bin/env python3
"""
LP TURBO: MAIN PYTHON CONTROLLER
================================
Unified Python entry point for the LP Turbo system.
Provides high-level control over all liquidity injection operations.

Author: LP Turbo Enhanced System
Purpose: Unified control interface for multi-network DeFi operations
"""

import os
import sys
import json
import time
import asyncio
import subprocess
import argparse
from typing import Dict, List, Optional
from dataclasses import dataclass
from pathlib import Path

# Configuration
@dataclass
class LPTurboConfig:
    """Configuration for LP Turbo system"""
    private_key: Optional[str] = None
    funding_wallet: Optional[str] = None
    contract_address: Optional[str] = None
    base_rpc_url: str = "https://mainnet.base.org"
    chain_id: int = 8453
    auto_mode: bool = False
    networks: List[str] = None
    
    def __post_init__(self):
        if self.networks is None:
            self.networks = ["ethereum", "base", "bsc", "solana", "polygon", "arbitrum"]
    
    @classmethod
    def from_env(cls):
        """Load configuration from environment variables"""
        return cls(
            private_key=os.getenv("PRIVATE_KEY"),
            funding_wallet=os.getenv("FUNDING_WALLET"),
            contract_address=os.getenv("CONTRACT_ADDRESS"),
            base_rpc_url=os.getenv("BASE_RPC_URL", "https://mainnet.base.org"),
            chain_id=int(os.getenv("CHAIN_ID", "8453")),
            auto_mode=os.getenv("AUTO_MODE", "false").lower() == "true"
        )

class LPTurboController:
    """Main controller for LP Turbo operations"""
    
    def __init__(self, config: LPTurboConfig):
        self.config = config
        self.base_dir = Path(__file__).parent
        self.status = {"systems": {}, "health": "unknown"}
        
    def log(self, level: str, message: str, data: Dict = None):
        """Enhanced logging with structured output"""
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] [{level.upper()}] {message}"
        if data:
            log_entry += f" | {json.dumps(data)}"
        print(log_entry)
        
        # Also log to file for audit trail
        log_file = self.base_dir / "logs" / "lpturbo.log"
        log_file.parent.mkdir(exist_ok=True)
        with open(log_file, "a") as f:
            f.write(log_entry + "\n")
    
    def run_npm_command(self, command: str, timeout: int = 300) -> Dict:
        """Execute npm command with error handling and logging"""
        self.log("INFO", f"Executing npm command: {command}")
        
        try:
            result = subprocess.run(
                ["npm", "run", command],
                cwd=self.base_dir,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            if result.returncode == 0:
                self.log("SUCCESS", f"Command '{command}' completed successfully")
                return {
                    "success": True,
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "returncode": result.returncode
                }
            else:
                self.log("ERROR", f"Command '{command}' failed with code {result.returncode}", {
                    "stderr": result.stderr,
                    "stdout": result.stdout
                })
                return {
                    "success": False,
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "returncode": result.returncode
                }
                
        except subprocess.TimeoutExpired:
            self.log("ERROR", f"Command '{command}' timed out after {timeout} seconds")
            return {"success": False, "error": "timeout"}
        except Exception as e:
            self.log("ERROR", f"Failed to execute command '{command}'", {"error": str(e)})
            return {"success": False, "error": str(e)}
    
    def run_node_script(self, script_path: str, timeout: int = 300) -> Dict:
        """Execute Node.js script directly"""
        self.log("INFO", f"Executing Node.js script: {script_path}")
        
        try:
            result = subprocess.run(
                ["node", script_path],
                cwd=self.base_dir,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            return {
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "returncode": result.returncode
            }
            
        except Exception as e:
            self.log("ERROR", f"Failed to execute script '{script_path}'", {"error": str(e)})
            return {"success": False, "error": str(e)}
    
    def initialize_system(self) -> Dict:
        """Initialize the entire LP Turbo system"""
        self.log("INFO", "🚀 INITIALIZING LP TURBO SYSTEM", {
            "networks": self.config.networks,
            "auto_mode": self.config.auto_mode
        })
        
        # Run monolith initialization
        result = self.run_npm_command("monolith")
        if not result["success"]:
            self.log("ERROR", "Failed to initialize monolith system")
            return {"success": False, "stage": "monolith_init", "error": result}
        
        # Run integration tests to verify system
        result = self.run_npm_command("integration-test")
        if not result["success"]:
            self.log("ERROR", "Integration tests failed")
            return {"success": False, "stage": "integration_test", "error": result}
        
        self.log("SUCCESS", "✅ LP TURBO SYSTEM INITIALIZED SUCCESSFULLY")
        return {"success": True, "message": "System fully operational"}
    
    def deploy_contracts(self, network: str = "base") -> Dict:
        """Deploy smart contracts to specified network"""
        self.log("INFO", f"📄 DEPLOYING CONTRACTS TO {network.upper()}")
        
        if network == "base":
            result = self.run_npm_command("deploy")
        else:
            self.log("WARNING", f"Deployment to {network} not directly supported, using base deployment")
            result = self.run_npm_command("deploy")
        
        if result["success"]:
            self.log("SUCCESS", f"✅ CONTRACTS DEPLOYED TO {network.upper()}")
        
        return result
    
    def inject_liquidity(self, network: str = "base", amount: str = None) -> Dict:
        """Inject liquidity into specified network"""
        self.log("INFO", f"💰 INJECTING LIQUIDITY TO {network.upper()}", {
            "network": network,
            "amount": amount
        })
        
        result = self.run_npm_command("liquidity-assault")
        
        if result["success"]:
            self.log("SUCCESS", f"✅ LIQUIDITY INJECTED TO {network.upper()}")
        
        return result
    
    def auto_reclaim(self) -> Dict:
        """Execute automatic liquidity reclaim"""
        self.log("INFO", "🔄 EXECUTING AUTO RECLAIM")
        
        result = self.run_npm_command("auto-reclaim")
        
        if result["success"]:
            self.log("SUCCESS", "✅ AUTO RECLAIM COMPLETED")
        
        return result
    
    def health_check(self) -> Dict:
        """Comprehensive system health check"""
        self.log("INFO", "🔍 RUNNING SYSTEM HEALTH CHECK")
        
        health_status = {
            "timestamp": time.time(),
            "overall": "healthy",
            "systems": {},
            "errors": []
        }
        
        # Check monolith system
        result = self.run_npm_command("monolith")
        health_status["systems"]["monolith"] = {
            "status": "healthy" if result["success"] else "unhealthy",
            "last_check": time.time()
        }
        
        # Check integration tests
        result = self.run_npm_command("integration-test")
        health_status["systems"]["integration_tests"] = {
            "status": "healthy" if result["success"] else "unhealthy",
            "last_check": time.time()
        }
        
        # Determine overall health
        unhealthy_systems = [
            name for name, system in health_status["systems"].items()
            if system["status"] == "unhealthy"
        ]
        
        if unhealthy_systems:
            health_status["overall"] = "unhealthy"
            health_status["errors"] = unhealthy_systems
        
        self.log("INFO", f"🎯 HEALTH CHECK COMPLETE: {health_status['overall'].upper()}")
        self.status = health_status
        
        return health_status
    
    def optimize_system(self) -> Dict:
        """Run comprehensive system optimization"""
        self.log("INFO", "⚡ RUNNING SYSTEM OPTIMIZATION")
        
        result = self.run_npm_command("optimize")
        
        if result["success"]:
            self.log("SUCCESS", "✅ SYSTEM OPTIMIZATION COMPLETED")
        
        return result
    
    def emergency_stop(self) -> Dict:
        """Emergency stop all operations"""
        self.log("WARNING", "🛑 EMERGENCY STOP INITIATED")
        
        # Kill all node processes
        try:
            subprocess.run(["pkill", "-f", "node"], capture_output=True)
            self.log("SUCCESS", "✅ EMERGENCY STOP COMPLETED")
            return {"success": True, "message": "Emergency stop executed"}
        except Exception as e:
            self.log("ERROR", "Failed to execute emergency stop", {"error": str(e)})
            return {"success": False, "error": str(e)}
    
    def status_report(self) -> Dict:
        """Generate comprehensive status report"""
        self.log("INFO", "📊 GENERATING STATUS REPORT")
        
        # Get latest health check
        health = self.health_check()
        
        # Get system metrics
        metrics = {
            "uptime": time.time(),
            "networks_supported": len(self.config.networks),
            "auto_mode": self.config.auto_mode,
            "contract_address": self.config.contract_address or "not_set",
            "last_health_check": health["timestamp"]
        }
        
        report = {
            "timestamp": time.time(),
            "health": health,
            "metrics": metrics,
            "config": {
                "networks": self.config.networks,
                "auto_mode": self.config.auto_mode,
                "chain_id": self.config.chain_id
            }
        }
        
        self.log("SUCCESS", "✅ STATUS REPORT GENERATED")
        return report

def main():
    """Main entry point for LP Turbo system"""
    parser = argparse.ArgumentParser(description="LP Turbo: Sovereign Liquidity Flash Engine")
    parser.add_argument("command", choices=[
        "init", "deploy", "inject", "reclaim", "health", "optimize", 
        "status", "emergency-stop", "auto"
    ], help="Command to execute")
    parser.add_argument("--network", default="base", help="Target network")
    parser.add_argument("--amount", help="Amount for liquidity injection")
    parser.add_argument("--auto", action="store_true", help="Enable auto mode")
    parser.add_argument("--config", help="Path to config file")
    
    args = parser.parse_args()
    
    # Load configuration
    config = LPTurboConfig.from_env()
    if args.auto:
        config.auto_mode = True
    
    # Initialize controller
    controller = LPTurboController(config)
    
    controller.log("INFO", "🎯 LP TURBO MAIN CONTROLLER STARTED", {
        "command": args.command,
        "network": args.network,
        "auto_mode": config.auto_mode
    })
    
    try:
        # Execute command
        if args.command == "init":
            result = controller.initialize_system()
        elif args.command == "deploy":
            result = controller.deploy_contracts(args.network)
        elif args.command == "inject":
            result = controller.inject_liquidity(args.network, args.amount)
        elif args.command == "reclaim":
            result = controller.auto_reclaim()
        elif args.command == "health":
            result = controller.health_check()
        elif args.command == "optimize":
            result = controller.optimize_system()
        elif args.command == "status":
            result = controller.status_report()
        elif args.command == "emergency-stop":
            result = controller.emergency_stop()
        elif args.command == "auto":
            # Auto mode - run full cycle
            controller.log("INFO", "🔄 STARTING AUTO MODE")
            result = controller.initialize_system()
            if result["success"]:
                result = controller.deploy_contracts(args.network)
                if result["success"]:
                    result = controller.inject_liquidity(args.network, args.amount)
        else:
            result = {"success": False, "error": f"Unknown command: {args.command}"}
        
        # Output result
        if result["success"]:
            controller.log("SUCCESS", f"🎉 COMMAND '{args.command}' COMPLETED SUCCESSFULLY")
            print(json.dumps(result, indent=2))
            sys.exit(0)
        else:
            controller.log("ERROR", f"💥 COMMAND '{args.command}' FAILED")
            print(json.dumps(result, indent=2))
            sys.exit(1)
            
    except KeyboardInterrupt:
        controller.log("WARNING", "🛑 OPERATION INTERRUPTED BY USER")
        controller.emergency_stop()
        sys.exit(1)
    except Exception as e:
        controller.log("ERROR", f"💥 UNEXPECTED ERROR: {str(e)}")
        print(json.dumps({"success": False, "error": str(e)}, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()
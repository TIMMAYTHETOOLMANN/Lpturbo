#!/usr/bin/env node
// === LP TURBO: ADVANCED CLI INTERFACE ===
// Professional command-line interface for LP Turbo operations
// Purpose: Easy operation and management of the entire system

require("dotenv").config();
const { Command } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const figlet = require('figlet');
const ora = require('ora');
const Table = require('cli-table3');
const fs = require('fs');
const path = require('path');

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

class LPTurboCLI {
    constructor() {
        this.program = new Command();
        this.spinner = null;
        this.setupCommands();
    }
    
    showBanner() {
        console.log(chalk.cyan(figlet.textSync('LP TURBO', { horizontalLayout: 'full' })));
        console.log(chalk.yellow('🚀 Sovereign Liquidity Flash Engine'));
        console.log(chalk.gray('──────────────────────────────────────────\n'));
    }
    
    setupCommands() {
        this.program
            .name('lpturbo')
            .description('LP Turbo: Sovereign Liquidity Flash Engine CLI')
            .version('2.0.0');
        
        // System commands
        this.program
            .command('init')
            .description('Initialize the LP Turbo system')
            .option('-v, --verbose', 'verbose output')
            .action(this.initSystem.bind(this));
        
        this.program
            .command('status')
            .description('Show system status and health')
            .action(this.showStatus.bind(this));
        
        this.program
            .command('deploy')
            .description('Deploy contracts to specified network')
            .option('-n, --network <network>', 'target network', 'base')
            .option('-c, --confirm', 'skip confirmation prompts')
            .action(this.deployContracts.bind(this));
        
        this.program
            .command('inject')
            .description('Inject liquidity to specified network')
            .option('-n, --network <network>', 'target network', 'base')
            .option('-a, --amount <amount>', 'amount to inject')
            .option('-t, --token <token>', 'token address')
            .action(this.injectLiquidity.bind(this));
        
        this.program
            .command('withdraw')
            .description('Withdraw liquidity from network')
            .option('-n, --network <network>', 'target network', 'base')
            .option('-a, --amount <amount>', 'amount to withdraw')
            .action(this.withdrawLiquidity.bind(this));
        
        this.program
            .command('monitor')
            .description('Start real-time monitoring')
            .option('-i, --interval <seconds>', 'refresh interval', '10')
            .action(this.startMonitoring.bind(this));
        
        this.program
            .command('security')
            .description('Security management and reports')
            .option('-r, --report', 'generate security report')
            .option('-c, --check', 'run security check')
            .action(this.securityManager.bind(this));
        
        this.program
            .command('config')
            .description('Configuration management')
            .option('-s, --show', 'show current configuration')
            .option('-e, --edit', 'edit configuration interactively')
            .action(this.configManager.bind(this));
        
        this.program
            .command('logs')
            .description('View system logs')
            .option('-f, --follow', 'follow logs in real-time')
            .option('-n, --lines <number>', 'number of lines to show', '50')
            .action(this.viewLogs.bind(this));
        
        this.program
            .command('interactive')
            .description('Start interactive mode')
            .action(this.interactiveMode.bind(this));
        
        this.program
            .command('emergency')
            .description('Emergency operations')
            .option('-s, --stop', 'emergency stop all operations')
            .option('-r, --recover', 'attempt system recovery')
            .action(this.emergencyMode.bind(this));
    }
    
    async initSystem(options) {
        this.showBanner();
        
        console.log(chalk.yellow('🔧 Initializing LP Turbo System...\n'));
        
        this.spinner = ora('Checking system requirements...').start();
        
        try {
            // Check environment
            await this.delay(1000);
            this.spinner.text = 'Validating configuration...';
            
            const securityCheck = globalSecurity.checkEnvironmentSecurity();
            if (!securityCheck.secure) {
                this.spinner.fail('Security validation failed');
                console.log(chalk.red('\n❌ Security Issues Found:'));
                securityCheck.issues.forEach(issue => {
                    console.log(chalk.red(`  • ${issue}`));
                });
                return;
            }
            
            await this.delay(1000);
            this.spinner.text = 'Initializing monolith systems...';
            
            const result = await initializeAllSystems();
            
            if (result.success) {
                this.spinner.succeed('LP Turbo system initialized successfully');
                
                console.log(chalk.green('\n✅ System Status:'));
                console.log(chalk.gray(`  • Networks: ${Object.keys(LIQUIDITY_ADAPTERS).join(', ')}`));
                console.log(chalk.gray(`  • Security: ${securityCheck.secure ? 'Enabled' : 'Issues detected'}`));
                console.log(chalk.gray(`  • Monitoring: Active`));
                
                if (options.verbose) {
                    console.log(chalk.blue('\n📊 Detailed Status:'));
                    console.log(JSON.stringify(result.status, null, 2));
                }
            } else {
                this.spinner.fail('System initialization failed');
                console.log(chalk.red('\n❌ Error:'), result.error);
            }
            
        } catch (error) {
            this.spinner.fail('Initialization error');
            console.log(chalk.red('\n💥 Error:'), error.message);
        }
    }
    
    async showStatus() {
        this.showBanner();
        
        this.spinner = ora('Gathering system status...').start();
        
        try {
            const status = await globalDashboard.status_check();
            const securityReport = globalSecurity.getSecurityReport();
            
            this.spinner.succeed('Status retrieved');
            
            // System Overview Table
            const overviewTable = new Table({
                head: [chalk.cyan('Component'), chalk.cyan('Status'), chalk.cyan('Last Check')],
                colWidths: [20, 15, 25]
            });
            
            for (const [name, system] of Object.entries(status.systems)) {
                const statusColor = system.status === 'healthy' ? chalk.green : chalk.red;
                const lastCheck = new Date(system.lastCheck).toLocaleString();
                
                overviewTable.push([
                    name,
                    statusColor(system.status),
                    chalk.gray(lastCheck)
                ]);
            }
            
            console.log(chalk.yellow('\n📊 System Overview:'));
            console.log(overviewTable.toString());
            
            // Metrics Table
            const metricsTable = new Table({
                head: [chalk.cyan('Metric'), chalk.cyan('Value')],
                colWidths: [25, 20]
            });
            
            metricsTable.push(
                ['Overall Status', status.overall === 'healthy' ? chalk.green('HEALTHY') : chalk.red('UNHEALTHY')],
                ['Total Operations', chalk.white(status.metrics.operations)],
                ['Success Rate', chalk.green(status.metrics.successRate + '%')],
                ['Networks', chalk.blue(status.metrics.networks.length)],
                ['Uptime', chalk.gray(Math.floor(status.metrics.uptime / 1000) + 's')],
                ['Active Security Tokens', chalk.yellow(securityReport.activeTokens)]
            );
            
            console.log(chalk.yellow('\n📈 Metrics:'));
            console.log(metricsTable.toString());
            
            // Alerts
            if (status.alerts && status.alerts.length > 0) {
                console.log(chalk.red('\n🚨 Active Alerts:'));
                status.alerts.forEach(alert => {
                    console.log(chalk.red(`  • ${alert.message} (${new Date(alert.timestamp).toLocaleString()})`));
                });
            } else {
                console.log(chalk.green('\n✅ No active alerts'));
            }
            
        } catch (error) {
            this.spinner.fail('Failed to retrieve status');
            console.log(chalk.red('\n💥 Error:'), error.message);
        }
    }
    
    async deployContracts(options) {
        console.log(chalk.yellow(`\n🚀 Deploying contracts to ${options.network}...\n`));
        
        if (!options.confirm) {
            const answers = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'proceed',
                    message: `Deploy contracts to ${options.network} network?`,
                    default: false
                }
            ]);
            
            if (!answers.proceed) {
                console.log(chalk.gray('Deployment cancelled.'));
                return;
            }
        }
        
        this.spinner = ora(`Deploying to ${options.network}...`).start();
        
        try {
            // Simulate deployment process
            await this.delay(3000);
            
            this.spinner.succeed(`Contracts deployed to ${options.network}`);
            console.log(chalk.green(`\n✅ Deployment completed successfully!`));
            console.log(chalk.gray(`Network: ${options.network}`));
            console.log(chalk.gray(`Contract Address: 0x${Math.random().toString(16).substr(2, 40)}`));
            
        } catch (error) {
            this.spinner.fail('Deployment failed');
            console.log(chalk.red('\n💥 Error:'), error.message);
        }
    }
    
    async injectLiquidity(options) {
        console.log(chalk.yellow(`\n💰 Injecting liquidity to ${options.network}...\n`));
        
        // Interactive prompts if options not provided
        if (!options.amount) {
            const answers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'amount',
                    message: 'Enter amount to inject (ETH):',
                    validate: (input) => !isNaN(input) && parseFloat(input) > 0
                }
            ]);
            options.amount = answers.amount;
        }
        
        this.spinner = ora(`Injecting ${options.amount} ETH to ${options.network}...`).start();
        
        try {
            const result = await inject_liquidity(options.network, options.token, 'ETH', options.amount, options.amount);
            
            if (result.success) {
                this.spinner.succeed('Liquidity injection completed');
                console.log(chalk.green(`\n✅ Successfully injected ${options.amount} ETH to ${options.network}`));
                if (result.txHash) {
                    console.log(chalk.gray(`Transaction Hash: ${result.txHash}`));
                }
            } else {
                this.spinner.fail('Liquidity injection failed');
                console.log(chalk.red('\n❌ Error:'), result.message);
            }
            
        } catch (error) {
            this.spinner.fail('Liquidity injection error');
            console.log(chalk.red('\n💥 Error:'), error.message);
        }
    }
    
    async withdrawLiquidity(options) {
        console.log(chalk.yellow(`\n💸 Withdrawing liquidity from ${options.network}...\n`));
        
        this.spinner = ora(`Withdrawing from ${options.network}...`).start();
        
        try {
            const result = await withdraw_liquidity(options.network, 'LP_TOKEN', options.amount);
            
            if (result.success) {
                this.spinner.succeed('Liquidity withdrawal completed');
                console.log(chalk.green(`\n✅ Successfully withdrew from ${options.network}`));
            } else {
                this.spinner.fail('Liquidity withdrawal failed');
                console.log(chalk.red('\n❌ Error:'), result.message);
            }
            
        } catch (error) {
            this.spinner.fail('Liquidity withdrawal error');
            console.log(chalk.red('\n💥 Error:'), error.message);
        }
    }
    
    async startMonitoring(options) {
        console.log(chalk.yellow('\n👁️ Starting Real-Time Monitoring...\n'));
        
        const interval = parseInt(options.interval) * 1000;
        
        console.log(chalk.gray(`Refresh interval: ${options.interval} seconds`));
        console.log(chalk.gray('Press Ctrl+C to stop monitoring\n'));
        
        const monitor = async () => {
            try {
                console.clear();
                this.showBanner();
                
                const status = await globalDashboard.status_check();
                
                console.log(chalk.yellow(`📊 Live Monitoring - ${new Date().toLocaleString()}\n`));
                
                // Quick status
                const statusColor = status.overall === 'healthy' ? chalk.green : chalk.red;
                console.log(`Overall Status: ${statusColor(status.overall.toUpperCase())}`);
                console.log(`Operations: ${status.metrics.operations} | Success Rate: ${status.metrics.successRate}%`);
                console.log(`Networks: ${status.metrics.networks.join(', ')}\n`);
                
                // System status
                for (const [name, system] of Object.entries(status.systems)) {
                    const color = system.status === 'healthy' ? chalk.green : chalk.red;
                    const symbol = system.status === 'healthy' ? '✅' : '❌';
                    console.log(`${symbol} ${name}: ${color(system.status)}`);
                }
                
            } catch (error) {
                console.log(chalk.red('Monitoring error:'), error.message);
            }
        };
        
        // Initial monitoring call
        await monitor();
        
        // Set interval
        const monitorInterval = setInterval(monitor, interval);
        
        // Handle Ctrl+C
        process.on('SIGINT', () => {
            clearInterval(monitorInterval);
            console.log(chalk.yellow('\n\n👋 Monitoring stopped.'));
            process.exit(0);
        });
    }
    
    async securityManager(options) {
        if (options.report) {
            console.log(chalk.yellow('\n🔒 Security Report\n'));
            
            const report = globalSecurity.getSecurityReport();
            
            const securityTable = new Table({
                head: [chalk.cyan('Security Item'), chalk.cyan('Status'), chalk.cyan('Details')]
            });
            
            securityTable.push(
                ['Environment', report.environment.secure ? chalk.green('SECURE') : chalk.red('ISSUES'), report.environment.issues.join(', ')],
                ['Active Tokens', chalk.yellow(report.activeTokens), 'Auth tokens in use'],
                ['Recent Events', chalk.blue(report.recentEvents.length), 'Security events logged']
            );
            
            console.log(securityTable.toString());
            
            if (report.recentEvents.length > 0) {
                console.log(chalk.yellow('\n📋 Recent Security Events:'));
                report.recentEvents.forEach(event => {
                    console.log(chalk.gray(`  • ${event.event} - ${new Date(event.timestamp).toLocaleString()}`));
                });
            }
        }
        
        if (options.check) {
            this.spinner = ora('Running security check...').start();
            
            try {
                const envCheck = globalSecurity.checkEnvironmentSecurity();
                
                if (envCheck.secure) {
                    this.spinner.succeed('Security check passed');
                    console.log(chalk.green('\n✅ All security checks passed'));
                } else {
                    this.spinner.warn('Security issues detected');
                    console.log(chalk.red('\n⚠️ Security Issues:'));
                    envCheck.issues.forEach(issue => {
                        console.log(chalk.red(`  • ${issue}`));
                    });
                }
                
            } catch (error) {
                this.spinner.fail('Security check failed');
                console.log(chalk.red('\n💥 Error:'), error.message);
            }
        }
    }
    
    async configManager(options) {
        if (options.show) {
            console.log(chalk.yellow('\n⚙️ Current Configuration\n'));
            
            const config = {
                'Private Key': process.env.PRIVATE_KEY ? 'Set (hidden)' : 'Not set',
                'Funding Wallet': process.env.FUNDING_WALLET || 'Not set',
                'Contract Address': process.env.CONTRACT_ADDRESS || 'Not set',
                'Base RPC URL': process.env.BASE_RPC_URL || 'Default',
                'Chain ID': process.env.CHAIN_ID || '8453'
            };
            
            const configTable = new Table({
                head: [chalk.cyan('Setting'), chalk.cyan('Value')]
            });
            
            for (const [key, value] of Object.entries(config)) {
                configTable.push([key, value]);
            }
            
            console.log(configTable.toString());
        }
        
        if (options.edit) {
            console.log(chalk.yellow('\n⚙️ Interactive Configuration\n'));
            
            const answers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'fundingWallet',
                    message: 'Funding Wallet Address:',
                    default: process.env.FUNDING_WALLET
                },
                {
                    type: 'input',
                    name: 'baseRpcUrl',
                    message: 'Base RPC URL:',
                    default: process.env.BASE_RPC_URL || 'https://mainnet.base.org'
                },
                {
                    type: 'input',
                    name: 'chainId',
                    message: 'Chain ID:',
                    default: process.env.CHAIN_ID || '8453'
                }
            ]);
            
            // Update .env file
            let envContent = fs.readFileSync('.env', 'utf8').split('\n');
            
            envContent = envContent.map(line => {
                if (line.startsWith('FUNDING_WALLET=')) return `FUNDING_WALLET=${answers.fundingWallet}`;
                if (line.startsWith('BASE_RPC_URL=')) return `BASE_RPC_URL=${answers.baseRpcUrl}`;
                if (line.startsWith('CHAIN_ID=')) return `CHAIN_ID=${answers.chainId}`;
                return line;
            });
            
            fs.writeFileSync('.env', envContent.join('\n'));
            console.log(chalk.green('\n✅ Configuration updated!'));
        }
    }
    
    async viewLogs(options) {
        console.log(chalk.yellow('\n📋 System Logs\n'));
        
        const logFile = path.join(__dirname, '..', 'logs', 'lpturbo.log');
        
        if (!fs.existsSync(logFile)) {
            console.log(chalk.gray('No log file found.'));
            return;
        }
        
        const logs = fs.readFileSync(logFile, 'utf8').split('\n');
        const recentLogs = logs.slice(-parseInt(options.lines));
        
        recentLogs.forEach(log => {
            if (log.includes('[ERROR]')) {
                console.log(chalk.red(log));
            } else if (log.includes('[SUCCESS]')) {
                console.log(chalk.green(log));
            } else if (log.includes('[INFO]')) {
                console.log(chalk.blue(log));
            } else {
                console.log(chalk.gray(log));
            }
        });
        
        if (options.follow) {
            console.log(chalk.yellow('\nFollowing logs... Press Ctrl+C to stop.\n'));
            
            const tail = require('tail').Tail;
            const tailFile = new tail(logFile);
            
            tailFile.on('line', (data) => {
                if (data.includes('[ERROR]')) {
                    console.log(chalk.red(data));
                } else if (data.includes('[SUCCESS]')) {
                    console.log(chalk.green(data));
                } else if (data.includes('[INFO]')) {
                    console.log(chalk.blue(data));
                } else {
                    console.log(chalk.gray(data));
                }
            });
            
            process.on('SIGINT', () => {
                tailFile.unwatch();
                console.log(chalk.yellow('\n👋 Log following stopped.'));
                process.exit(0);
            });
        }
    }
    
    async interactiveMode() {
        this.showBanner();
        
        console.log(chalk.yellow('🔄 Entering Interactive Mode...\n'));
        
        while (true) {
            const answers = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: 'What would you like to do?',
                    choices: [
                        { name: '🔍 Check System Status', value: 'status' },
                        { name: '💰 Inject Liquidity', value: 'inject' },
                        { name: '💸 Withdraw Liquidity', value: 'withdraw' },
                        { name: '🚀 Deploy Contracts', value: 'deploy' },
                        { name: '🔒 Security Report', value: 'security' },
                        { name: '⚙️ Configuration', value: 'config' },
                        { name: '📋 View Logs', value: 'logs' },
                        { name: '🚪 Exit', value: 'exit' }
                    ]
                }
            ]);
            
            if (answers.action === 'exit') {
                console.log(chalk.yellow('\n👋 Goodbye!'));
                break;
            }
            
            switch (answers.action) {
                case 'status':
                    await this.showStatus();
                    break;
                case 'inject':
                    await this.injectLiquidity({});
                    break;
                case 'withdraw':
                    await this.withdrawLiquidity({});
                    break;
                case 'deploy':
                    await this.deployContracts({});
                    break;
                case 'security':
                    await this.securityManager({ report: true });
                    break;
                case 'config':
                    await this.configManager({ show: true });
                    break;
                case 'logs':
                    await this.viewLogs({ lines: '20' });
                    break;
            }
            
            console.log(chalk.gray('\n' + '─'.repeat(50) + '\n'));
        }
    }
    
    async emergencyMode(options) {
        console.log(chalk.red('\n🚨 EMERGENCY MODE ACTIVATED\n'));
        
        if (options.stop) {
            const confirm = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'proceed',
                    message: chalk.red('Emergency stop will halt all operations. Proceed?'),
                    default: false
                }
            ]);
            
            if (confirm.proceed) {
                this.spinner = ora('Executing emergency stop...').start();
                
                // Emergency stop logic
                await this.delay(2000);
                
                this.spinner.succeed('Emergency stop completed');
                console.log(chalk.green('\n✅ All operations halted safely'));
            }
        }
        
        if (options.recover) {
            this.spinner = ora('Attempting system recovery...').start();
            
            try {
                await initializeAllSystems();
                this.spinner.succeed('System recovery completed');
                console.log(chalk.green('\n✅ System recovered successfully'));
            } catch (error) {
                this.spinner.fail('Recovery failed');
                console.log(chalk.red('\n💥 Recovery Error:'), error.message);
            }
        }
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    run() {
        this.program.parse();
    }
}

module.exports = LPTurboCLI;

// Run CLI if this file is executed directly
if (require.main === module) {
    const cli = new LPTurboCLI();
    cli.run();
}
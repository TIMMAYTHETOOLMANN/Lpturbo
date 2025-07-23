/**
 * SECURITY ANALYZER MODULE
 * Advanced security scanning and vulnerability detection
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SecurityAnalyzer {
    constructor() {
        this.vulnerabilities = [];
        this.securityFindings = [];
        this.patterns = {
            // Common security anti-patterns
            hardcodedSecrets: [
                /(?:password|pwd)['\"`\s]*[:=]['\"`\s]*[^'\"`\s]{8,}/gi,
                /(?:api[_-]?key|apikey)['\"`\s]*[:=]['\"`\s]*[^'\"`\s]{8,}/gi,
                /(?:secret|private[_-]?key)['\"`\s]*[:=]['\"`\s]*[^'\"`\s]{8,}/gi,
                /(?:token|auth[_-]?token)['\"`\s]*[:=]['\"`\s]*[^'\"`\s]{8,}/gi,
                /0x[a-fA-F0-9]{64}/g, // Private keys
                /['"](sk_|pk_|sec_)[a-zA-Z0-9]{20,}['"]/g // API keys
            ],
            sqlInjection: [
                /['"`]\s*\+\s*\w+\s*\+\s*['"`]/g,
                /query\s*\(\s*['"`][^'"`]*['"`]\s*\+/gi,
                /execute\s*\(\s*['"`][^'"`]*['"`]\s*\+/gi
            ],
            xssVulnerabilities: [
                /innerHTML\s*=\s*[^;]+(?:req\.|params\.|query\.)/gi,
                /document\.write\s*\([^)]*(?:req\.|params\.|query\.)/gi,
                /eval\s*\([^)]*(?:req\.|params\.|query\.)/gi
            ],
            weakCrypto: [
                /md5\s*\(/gi,
                /sha1\s*\(/gi,
                /Math\.random\s*\(\)/gi,
                /crypto\.pseudoRandomBytes/gi
            ],
            unsafeDeserialization: [
                /JSON\.parse\s*\([^)]*(?:req\.|params\.|query\.)/gi,
                /eval\s*\([^)]*(?:req\.|params\.|query\.)/gi,
                /Function\s*\([^)]*(?:req\.|params\.|query\.)/gi
            ],
            pathTraversal: [
                /readFileSync\s*\([^)]*(?:req\.|params\.|query\.)/gi,
                /createReadStream\s*\([^)]*(?:req\.|params\.|query\.)/gi,
                /\.\.\/\.\.\//g
            ],
            commandInjection: [
                /exec\s*\([^)]*(?:req\.|params\.|query\.)/gi,
                /spawn\s*\([^)]*(?:req\.|params\.|query\.)/gi,
                /child_process\.\w+\s*\([^)]*(?:req\.|params\.|query\.)/gi
            ]
        };
    }

    async analyzeProject(projectPath = process.cwd()) {
        console.log("🔒 Starting comprehensive security analysis...");
        
        const results = {
            filesScanned: 0,
            vulnerabilitiesFound: 0,
            securityScore: 0,
            criticalIssues: [],
            recommendations: []
        };

        // Scan all code files
        await this.scanDirectory(projectPath, results);
        
        // Analyze dependencies
        await this.analyzeDependencies(projectPath, results);
        
        // Check configuration files
        await this.analyzeConfigurations(projectPath, results);
        
        // Smart contract specific checks
        await this.analyzeSmartContracts(projectPath, results);
        
        // Calculate security score
        results.securityScore = this.calculateSecurityScore(results);
        
        console.log(`🔍 Security scan complete: ${results.filesScanned} files, ${results.vulnerabilitiesFound} issues found`);
        
        return results;
    }

    async scanDirectory(dirPath, results) {
        if (!fs.existsSync(dirPath)) return;

        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                // Skip node_modules and .git
                if (!['node_modules', '.git', 'dist', 'build'].includes(item)) {
                    await this.scanDirectory(fullPath, results);
                }
            } else if (stat.isFile()) {
                const ext = path.extname(item);
                if (['.js', '.ts', '.sol', '.py', '.json', '.env'].includes(ext)) {
                    await this.scanFile(fullPath, results);
                    results.filesScanned++;
                }
            }
        }
    }

    async scanFile(filePath, results) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const ext = path.extname(filePath);
            
            // Check for hardcoded secrets
            this.checkHardcodedSecrets(filePath, content, results);
            
            // Language-specific checks
            if (['.js', '.ts'].includes(ext)) {
                this.checkJavaScriptVulnerabilities(filePath, content, results);
            } else if (ext === '.sol') {
                this.checkSolidityVulnerabilities(filePath, content, results);
            } else if (ext === '.py') {
                this.checkPythonVulnerabilities(filePath, content, results);
            } else if (ext === '.env') {
                this.checkEnvironmentFile(filePath, content, results);
            }
            
        } catch (error) {
            console.warn(`⚠️  Failed to scan ${filePath}: ${error.message}`);
        }
    }

    checkHardcodedSecrets(filePath, content, results) {
        for (const pattern of this.patterns.hardcodedSecrets) {
            const matches = content.match(pattern);
            if (matches) {
                for (const match of matches) {
                    this.addVulnerability(filePath, 'HIGH', 'Hardcoded Secret', {
                        description: `Potential hardcoded secret found: ${match.substring(0, 20)}...`,
                        line: this.getLineNumber(content, match),
                        recommendation: 'Move secrets to environment variables'
                    }, results);
                }
            }
        }
    }

    checkJavaScriptVulnerabilities(filePath, content, results) {
        // SQL Injection
        for (const pattern of this.patterns.sqlInjection) {
            const matches = content.match(pattern);
            if (matches) {
                this.addVulnerability(filePath, 'HIGH', 'SQL Injection', {
                    description: 'Potential SQL injection vulnerability',
                    recommendation: 'Use parameterized queries'
                }, results);
            }
        }

        // XSS
        for (const pattern of this.patterns.xssVulnerabilities) {
            const matches = content.match(pattern);
            if (matches) {
                this.addVulnerability(filePath, 'MEDIUM', 'XSS Vulnerability', {
                    description: 'Potential XSS vulnerability',
                    recommendation: 'Sanitize user input before rendering'
                }, results);
            }
        }

        // Command Injection
        for (const pattern of this.patterns.commandInjection) {
            const matches = content.match(pattern);
            if (matches) {
                this.addVulnerability(filePath, 'CRITICAL', 'Command Injection', {
                    description: 'Potential command injection vulnerability',
                    recommendation: 'Validate and sanitize all external input'
                }, results);
            }
        }

        // Weak Crypto
        for (const pattern of this.patterns.weakCrypto) {
            const matches = content.match(pattern);
            if (matches) {
                this.addVulnerability(filePath, 'MEDIUM', 'Weak Cryptography', {
                    description: 'Use of weak cryptographic functions',
                    recommendation: 'Use cryptographically secure alternatives'
                }, results);
            }
        }
    }

    checkSolidityVulnerabilities(filePath, content, results) {
        // Reentrancy patterns
        if (content.includes('.call(') && !content.includes('ReentrancyGuard')) {
            this.addVulnerability(filePath, 'HIGH', 'Reentrancy Risk', {
                description: 'External call without reentrancy protection',
                recommendation: 'Use ReentrancyGuard or checks-effects-interactions pattern'
            }, results);
        }

        // Integer overflow (pre-0.8.0)
        if (content.match(/pragma solidity \^?0\.[0-7]\./)) {
            if (!content.includes('SafeMath')) {
                this.addVulnerability(filePath, 'HIGH', 'Integer Overflow', {
                    description: 'Solidity version without built-in overflow protection',
                    recommendation: 'Use SafeMath library or upgrade to Solidity 0.8+'
                }, results);
            }
        }

        // Unchecked external calls
        const callMatches = content.match(/\.call\s*\(/g);
        if (callMatches) {
            const requireMatches = content.match(/require\s*\(/g);
            if (!requireMatches || callMatches.length > requireMatches.length) {
                this.addVulnerability(filePath, 'MEDIUM', 'Unchecked Call', {
                    description: 'External call without proper error handling',
                    recommendation: 'Check return values of external calls'
                }, results);
            }
        }

        // tx.origin usage
        if (content.includes('tx.origin')) {
            this.addVulnerability(filePath, 'MEDIUM', 'tx.origin Usage', {
                description: 'Use of tx.origin can lead to phishing attacks',
                recommendation: 'Use msg.sender instead of tx.origin'
            }, results);
        }
    }

    checkPythonVulnerabilities(filePath, content, results) {
        // Eval usage
        if (content.includes('eval(')) {
            this.addVulnerability(filePath, 'CRITICAL', 'Code Injection', {
                description: 'Use of eval() function',
                recommendation: 'Avoid eval() or use ast.literal_eval() for safe evaluation'
            }, results);
        }

        // SQL injection patterns
        if (content.match(/execute\s*\(\s*f?['"][^'"]*%[^'"]*['"]/)) {
            this.addVulnerability(filePath, 'HIGH', 'SQL Injection', {
                description: 'String formatting in SQL queries',
                recommendation: 'Use parameterized queries'
            }, results);
        }

        // Pickle usage
        if (content.includes('pickle.load')) {
            this.addVulnerability(filePath, 'HIGH', 'Unsafe Deserialization', {
                description: 'Unsafe pickle deserialization',
                recommendation: 'Use safer serialization formats like JSON'
            }, results);
        }
    }

    checkEnvironmentFile(filePath, content, results) {
        // Check for secrets in .env files
        if (filePath.includes('.env') && !filePath.includes('.example')) {
            this.addVulnerability(filePath, 'MEDIUM', 'Environment File', {
                description: 'Environment file contains potential secrets',
                recommendation: 'Ensure .env files are not committed to version control'
            }, results);
        }
    }

    async analyzeDependencies(projectPath, results) {
        const packageJsonPath = path.join(projectPath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                
                // Check for known vulnerable packages (simplified check)
                const vulnerablePackages = [
                    'request', 'lodash@4.17.15', 'minimist@1.2.0', 'serialize-javascript@3.1.0'
                ];
                
                const allDeps = {
                    ...packageJson.dependencies,
                    ...packageJson.devDependencies
                };
                
                for (const [pkg, version] of Object.entries(allDeps)) {
                    if (vulnerablePackages.some(vuln => vuln.startsWith(pkg))) {
                        this.addVulnerability(packageJsonPath, 'MEDIUM', 'Vulnerable Dependency', {
                            description: `Potentially vulnerable package: ${pkg}@${version}`,
                            recommendation: 'Update to latest secure version'
                        }, results);
                    }
                }
                
            } catch (error) {
                console.warn(`⚠️  Failed to analyze dependencies: ${error.message}`);
            }
        }
    }

    async analyzeConfigurations(projectPath, results) {
        const configFiles = [
            'hardhat.config.js',
            '.eslintrc.js',
            'webpack.config.js',
            'docker-compose.yml'
        ];
        
        for (const configFile of configFiles) {
            const configPath = path.join(projectPath, configFile);
            if (fs.existsSync(configPath)) {
                const content = fs.readFileSync(configPath, 'utf8');
                
                // Check for development configurations in production
                if (content.includes('development') || content.includes('debug: true')) {
                    this.addVulnerability(configPath, 'LOW', 'Development Configuration', {
                        description: 'Development configuration detected',
                        recommendation: 'Ensure production configurations are used in production'
                    }, results);
                }
                
                // Check for exposed ports
                if (content.match(/port\s*:\s*\d+/) && !content.includes('localhost')) {
                    this.addVulnerability(configPath, 'LOW', 'Port Exposure', {
                        description: 'Port configuration may expose services',
                        recommendation: 'Bind to localhost or use proper firewall rules'
                    }, results);
                }
            }
        }
    }

    async analyzeSmartContracts(projectPath, results) {
        const contractsPath = path.join(projectPath, 'contracts');
        if (!fs.existsSync(contractsPath)) return;

        // Additional Solidity security checks
        const files = fs.readdirSync(contractsPath);
        for (const file of files) {
            if (file.endsWith('.sol')) {
                const contractPath = path.join(contractsPath, file);
                const content = fs.readFileSync(contractPath, 'utf8');
                
                // Check for access control
                if (!content.includes('onlyOwner') && !content.includes('AccessControl')) {
                    this.addVulnerability(contractPath, 'MEDIUM', 'Missing Access Control', {
                        description: 'Contract may lack proper access control',
                        recommendation: 'Implement proper access control mechanisms'
                    }, results);
                }
                
                // Check for events
                const functionMatches = content.match(/function\s+\w+/g);
                const eventMatches = content.match(/event\s+\w+/g);
                if (functionMatches && (!eventMatches || eventMatches.length < functionMatches.length / 2)) {
                    this.addVulnerability(contractPath, 'LOW', 'Missing Events', {
                        description: 'Functions may lack event emissions',
                        recommendation: 'Emit events for important state changes'
                    }, results);
                }
            }
        }
    }

    addVulnerability(filePath, severity, type, details, results) {
        const vulnerability = {
            file: path.relative(process.cwd(), filePath),
            severity,
            type,
            ...details,
            timestamp: new Date().toISOString()
        };
        
        this.vulnerabilities.push(vulnerability);
        results.vulnerabilitiesFound++;
        
        if (severity === 'CRITICAL' || severity === 'HIGH') {
            results.criticalIssues.push(vulnerability);
        }
        
        console.log(`🚨 ${severity}: ${type} in ${vulnerability.file}`);
    }

    calculateSecurityScore(results) {
        const maxScore = 100;
        const criticalPenalty = 20;
        const highPenalty = 10;
        const mediumPenalty = 5;
        const lowPenalty = 1;
        
        let totalPenalty = 0;
        
        for (const vuln of this.vulnerabilities) {
            switch (vuln.severity) {
                case 'CRITICAL': totalPenalty += criticalPenalty; break;
                case 'HIGH': totalPenalty += highPenalty; break;
                case 'MEDIUM': totalPenalty += mediumPenalty; break;
                case 'LOW': totalPenalty += lowPenalty; break;
            }
        }
        
        return Math.max(0, maxScore - totalPenalty);
    }

    getLineNumber(content, searchString) {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(searchString)) {
                return i + 1;
            }
        }
        return 1;
    }

    getVulnerabilities() {
        return this.vulnerabilities;
    }

    getSecurityFindings() {
        return this.securityFindings;
    }
}

// Execute if run directly
if (require.main === module) {
    const analyzer = new SecurityAnalyzer();
    analyzer.analyzeProject()
        .then((results) => {
            console.log("\n🔒 SECURITY ANALYSIS COMPLETE");
            console.log(`📊 Files Scanned: ${results.filesScanned}`);
            console.log(`🚨 Vulnerabilities: ${results.vulnerabilitiesFound}`);
            console.log(`🛡️  Security Score: ${results.securityScore}/100`);
            
            if (results.criticalIssues.length > 0) {
                console.log("\n🚨 CRITICAL ISSUES:");
                results.criticalIssues.forEach(issue => {
                    console.log(`- ${issue.severity}: ${issue.type} in ${issue.file}`);
                });
            }
            
            process.exit(results.criticalIssues.length > 0 ? 1 : 0);
        })
        .catch((error) => {
            console.error("💥 SECURITY ANALYSIS FAILED:", error);
            process.exit(1);
        });
}

module.exports = SecurityAnalyzer;
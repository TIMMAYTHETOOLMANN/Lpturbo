#!/bin/bash

# Test script for the deployment agent
# This script validates all major features of the deployment agent

echo "🧪 Testing COPILOT COATING AGENT Deployment Script"
echo "================================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
test_feature() {
    local test_name="$1"
    local test_command="$2"
    
    echo -n "Testing $test_name... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}PASS${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}FAIL${NC}"
        ((TESTS_FAILED++))
    fi
}

# Test 1: Script is executable
test_feature "Script executable" "[ -x ./deploy-agent.sh ]"

# Test 2: Project type detection
test_feature "Project type detection" "[ -f package.json ]"

# Test 3: Environment schema exists
test_feature "Environment schema" "[ -f .env.schema ]"

# Test 4: Docker support files
test_feature "Docker support" "[ -f Dockerfile ] && [ -f docker-compose.yml ]"

# Test 5: GitLab CI support
test_feature "GitLab CI support" "[ -f gitlab-ci.yml ]"

# Test 6: Contract files in proper structure
test_feature "Contract structure" "[ -f contracts/SovereignFlashLock.sol ]"

# Test 7: Scripts in proper structure
test_feature "Scripts structure" "[ -f scripts/deploy.js ] && [ -f scripts/autoReclaim.js ]"

# Test 8: Gitignore includes important exclusions
test_feature "Gitignore configuration" "grep -q 'node_modules' .gitignore && grep -q '.env' .gitignore"

# Test 9: Documentation exists
test_feature "Documentation" "[ -f DEPLOYMENT.md ] && [ -f README.md ]"

# Test 10: Package.json has required scripts
test_feature "Package.json scripts" "grep -q '\"build\"' package.json && grep -q '\"start\"' package.json"

echo ""
echo "Test Results:"
echo "============="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! The deployment agent is ready for use.${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Please check the configuration.${NC}"
    exit 1
fi
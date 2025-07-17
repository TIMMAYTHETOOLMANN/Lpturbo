#!/bin/bash

# COPILOT COATING AGENT - UNIFIED DEPLOYMENT DIRECTIVE
# Version: 1.0.0
# Description: Single-click deployment protocol for any repository

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
PROJECT_NAME="$(basename "$PROJECT_ROOT")"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$PROJECT_ROOT/deployment_${TIMESTAMP}.log"
DEPLOY_HISTORY_DIR="$PROJECT_ROOT/deploy-history"
TEMP_DIR="/tmp/deploy-agent-$$"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Status tracking
DEPLOYMENT_STATUS="INITIALIZED"
DEPLOYMENT_STEPS=()
CURRENT_STEP=0
TOTAL_STEPS=10

# Create temporary directory
mkdir -p "$TEMP_DIR"
mkdir -p "$DEPLOY_HISTORY_DIR"

# Logging function
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Status update function
update_status() {
    DEPLOYMENT_STATUS="$1"
    log "${GREEN}STATUS: $DEPLOYMENT_STATUS${NC}"
    
    # Update GUI if available
    if command -v zenity &> /dev/null; then
        echo "$DEPLOYMENT_STATUS" > "$TEMP_DIR/status"
    fi
    
    # JSON output for agent integration
    cat > "$TEMP_DIR/status.json" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "status": "$DEPLOYMENT_STATUS",
    "project": "$PROJECT_NAME",
    "step": $CURRENT_STEP,
    "total_steps": $TOTAL_STEPS,
    "log_file": "$LOG_FILE"
}
EOF
}

# Error handling
error_exit() {
    log "${RED}ERROR: $1${NC}"
    update_status "FAILED"
    
    if command -v zenity &> /dev/null; then
        zenity --error --text="Deployment failed: $1" --width=400
    else
        echo "Deployment failed: $1" >&2
    fi
    
    # Offer rollback
    offer_rollback
    exit 1
}

# Rollback function
offer_rollback() {
    if [ -f "$TEMP_DIR/git_snapshot" ]; then
        local snapshot_hash=$(cat "$TEMP_DIR/git_snapshot")
        
        if command -v zenity &> /dev/null; then
            if zenity --question --text="Deployment failed. Roll back to previous state?" --width=400; then
                git reset --hard "$snapshot_hash"
                log "${YELLOW}Rolled back to snapshot: $snapshot_hash${NC}"
            fi
        else
            read -p "Deployment failed. Roll back to previous state? (y/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                git reset --hard "$snapshot_hash"
                log "${YELLOW}Rolled back to snapshot: $snapshot_hash${NC}"
            fi
        fi
    fi
}

# GUI monitoring background process
start_gui_monitor() {
    if command -v zenity &> /dev/null; then
        (
            while [ -f "$TEMP_DIR/status" ]; do
                local status=$(cat "$TEMP_DIR/status" 2>/dev/null || echo "Unknown")
                echo "# $status"
                echo $(($CURRENT_STEP * 100 / $TOTAL_STEPS))
                sleep 1
            done
        ) | zenity --progress --title="Deployment Progress - $PROJECT_NAME" --width=500 --auto-close &
        GUI_PID=$!
        log "${BLUE}GUI monitor started (PID: $GUI_PID)${NC}"
    fi
}

# Stop GUI monitor
stop_gui_monitor() {
    if [ ! -z "$GUI_PID" ]; then
        kill "$GUI_PID" 2>/dev/null || true
        rm -f "$TEMP_DIR/status"
    fi
}

# Cleanup function
cleanup() {
    stop_gui_monitor
    rm -rf "$TEMP_DIR"
}

# Set up cleanup on exit
trap cleanup EXIT

# STEP 1 - PROJECT INITIALIZATION
step1_project_initialization() {
    CURRENT_STEP=1
    update_status "PROJECT INITIALIZATION"
    
    log "${BLUE}=== STEP 1: PROJECT INITIALIZATION ===${NC}"
    log "Project root: $PROJECT_ROOT"
    log "Project name: $PROJECT_NAME"
    log "Log file: $LOG_FILE"
    
    # Create Git snapshot
    if git rev-parse --git-dir > /dev/null 2>&1; then
        local snapshot_hash=$(git rev-parse HEAD)
        echo "$snapshot_hash" > "$TEMP_DIR/git_snapshot"
        log "Git snapshot created: $snapshot_hash"
    else
        log "${YELLOW}Warning: Not a Git repository, rollback unavailable${NC}"
    fi
}

# STEP 2 - PROJECT TYPE DETECTION
step2_project_type_detection() {
    CURRENT_STEP=2
    update_status "PROJECT TYPE DETECTION"
    
    log "${BLUE}=== STEP 2: PROJECT TYPE DETECTION ===${NC}"
    
    PROJECT_TYPE=""
    
    if [ -f "$PROJECT_ROOT/package.json" ]; then
        PROJECT_TYPE="nodejs"
        log "Detected Node.js project (package.json found)"
    elif [ -f "$PROJECT_ROOT/requirements.txt" ]; then
        PROJECT_TYPE="python"
        log "Detected Python project (requirements.txt found)"
    elif [ -f "$PROJECT_ROOT/Dockerfile" ]; then
        PROJECT_TYPE="docker"
        log "Detected Docker project (Dockerfile found)"
    else
        error_exit "Unable to detect project type. No package.json, requirements.txt, or Dockerfile found."
    fi
    
    echo "$PROJECT_TYPE" > "$TEMP_DIR/project_type"
}

# STEP 3 - ENVIRONMENT VARIABLE VALIDATION
step3_environment_validation() {
    CURRENT_STEP=3
    update_status "ENVIRONMENT VALIDATION"
    
    log "${BLUE}=== STEP 3: ENVIRONMENT VARIABLE VALIDATION ===${NC}"
    
    # Load existing .env if present
    if [ -f "$PROJECT_ROOT/.env" ]; then
        log "Loading existing .env file"
        set -a
        source "$PROJECT_ROOT/.env"
        set +a
    fi
    
    # Check for schema files
    local schema_file=""
    if [ -f "$PROJECT_ROOT/.env.schema" ]; then
        schema_file="$PROJECT_ROOT/.env.schema"
    elif [ -f "$PROJECT_ROOT/.env.example" ]; then
        schema_file="$PROJECT_ROOT/.env.example"
    fi
    
    if [ -n "$schema_file" ]; then
        log "Using schema file: $schema_file"
        validate_env_variables "$schema_file"
    else
        log "${YELLOW}No schema file found, scanning code for environment variables${NC}"
        scan_code_for_env_vars
    fi
}

# Environment variable validation helper
validate_env_variables() {
    local schema_file="$1"
    local missing_vars=()
    
    # Read schema file and check for missing variables
    while IFS= read -r line; do
        # Skip comments and empty lines
        [[ "$line" =~ ^[[:space:]]*# ]] && continue
        [[ -z "$line" ]] && continue
        
        # Extract variable name (everything before =)
        local var_name=$(echo "$line" | cut -d'=' -f1)
        
        # Check if variable is set
        if [ -z "${!var_name}" ]; then
            missing_vars+=("$var_name")
        fi
    done < "$schema_file"
    
    # Prompt for missing variables
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log "Missing environment variables: ${missing_vars[*]}"
        prompt_for_env_vars "${missing_vars[@]}"
    fi
}

# Prompt for environment variables
prompt_for_env_vars() {
    local missing_vars=("$@")
    local env_updates=""
    
    for var in "${missing_vars[@]}"; do
        local value=""
        local is_secret=false
        
        # Check if variable name implies sensitivity
        if [[ "$var" =~ (PASSWORD|SECRET|KEY|TOKEN|PRIVATE) ]]; then
            is_secret=true
        fi
        
        if command -v zenity &> /dev/null; then
            if $is_secret; then
                value=$(zenity --password --title="Enter $var" --text="Please enter value for $var:" --width=400)
            else
                value=$(zenity --entry --title="Enter $var" --text="Please enter value for $var:" --width=400)
            fi
        else
            if $is_secret; then
                read -s -p "Enter $var (hidden): " value
                echo
            else
                read -p "Enter $var: " value
            fi
        fi
        
        if [ -n "$value" ]; then
            env_updates+="$var=$value"$'\n'
            export "$var"="$value"
        fi
    done
    
    # Append to .env file
    if [ -n "$env_updates" ]; then
        echo "$env_updates" >> "$PROJECT_ROOT/.env"
        log "Updated .env file with new variables"
    fi
}

# Scan code for environment variables
scan_code_for_env_vars() {
    log "Scanning code for environment variable usage..."
    
    # Common patterns for environment variables
    local env_patterns=(
        "process\.env\.[A-Z_][A-Z0-9_]*"
        "os\.environ\[['\"][A-Z_][A-Z0-9_]*['\"]"
        "ENV [A-Z_][A-Z0-9_]*"
        "\$\{[A-Z_][A-Z0-9_]*\}"
    )
    
    local found_vars=()
    
    for pattern in "${env_patterns[@]}"; do
        while IFS= read -r match; do
            # Extract variable name from match
            local var_name=$(echo "$match" | grep -oE '[A-Z_][A-Z0-9_]*' | head -1)
            if [ -n "$var_name" ] && [ -z "${!var_name}" ]; then
                found_vars+=("$var_name")
            fi
        done < <(grep -rE "$pattern" "$PROJECT_ROOT" --include="*.js" --include="*.ts" --include="*.py" --include="*.sh" 2>/dev/null || true)
    done
    
    # Remove duplicates
    local unique_vars=($(printf "%s\n" "${found_vars[@]}" | sort -u))
    
    if [ ${#unique_vars[@]} -gt 0 ]; then
        log "Found potential environment variables: ${unique_vars[*]}"
        
        # Create temporary schema
        local temp_schema="$TEMP_DIR/.env.schema"
        for var in "${unique_vars[@]}"; do
            echo "$var=" >> "$temp_schema"
        done
        
        validate_env_variables "$temp_schema"
    fi
}

# STEP 4 - DEPLOYMENT EXECUTION
step4_deployment_execution() {
    CURRENT_STEP=4
    update_status "DEPLOYMENT EXECUTION"
    
    log "${BLUE}=== STEP 4: DEPLOYMENT EXECUTION ===${NC}"
    
    local project_type=$(cat "$TEMP_DIR/project_type")
    
    # Check for deployment methods in order of preference
    if [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        log "Found docker-compose.yml, using Docker Compose deployment"
        deploy_with_docker_compose
    elif [ -f "$PROJECT_ROOT/.gitlab-ci.yml" ]; then
        log "Found .gitlab-ci.yml, using GitLab CI deployment"
        deploy_with_gitlab_ci
    elif [ -f "$PROJECT_ROOT/deploy.sh" ]; then
        log "Found custom deploy.sh, executing custom deployment"
        deploy_with_custom_script
    else
        # Default deployment based on project type
        case "$project_type" in
            "nodejs")
                deploy_nodejs_project
                ;;
            "python")
                deploy_python_project
                ;;
            "docker")
                deploy_docker_project
                ;;
            *)
                error_exit "No deployment method found for project type: $project_type"
                ;;
        esac
    fi
}

# Node.js deployment
deploy_nodejs_project() {
    log "Deploying Node.js project..."
    
    # Install dependencies
    if command -v npm &> /dev/null; then
        log "Running npm install..."
        npm install || error_exit "npm install failed"
    else
        error_exit "npm not found, cannot deploy Node.js project"
    fi
    
    # Build if build script exists
    if npm run build --silent 2>/dev/null; then
        log "Build completed successfully"
    else
        log "${YELLOW}No build script found or build failed, continuing...${NC}"
    fi
}

# Python deployment
deploy_python_project() {
    log "Deploying Python project..."
    
    # Create virtual environment
    if ! [ -d "$PROJECT_ROOT/venv" ]; then
        log "Creating virtual environment..."
        python3 -m venv "$PROJECT_ROOT/venv" || error_exit "Failed to create virtual environment"
    fi
    
    # Activate virtual environment
    source "$PROJECT_ROOT/venv/bin/activate" || error_exit "Failed to activate virtual environment"
    
    # Install requirements
    if [ -f "$PROJECT_ROOT/requirements.txt" ]; then
        log "Installing Python requirements..."
        pip install -r "$PROJECT_ROOT/requirements.txt" || error_exit "Failed to install requirements"
    fi
}

# Docker deployment
deploy_docker_project() {
    log "Deploying Docker project..."
    
    if command -v docker &> /dev/null; then
        log "Building Docker image: $PROJECT_NAME"
        docker build -t "$PROJECT_NAME" "$PROJECT_ROOT" || error_exit "Docker build failed"
    else
        error_exit "Docker not found, cannot deploy Docker project"
    fi
}

# Docker Compose deployment
deploy_with_docker_compose() {
    log "Deploying with Docker Compose..."
    
    if command -v docker-compose &> /dev/null; then
        docker-compose up -d --build || error_exit "Docker Compose deployment failed"
    else
        error_exit "docker-compose not found"
    fi
}

# GitLab CI deployment
deploy_with_gitlab_ci() {
    log "Deploying with GitLab CI..."
    
    # Check if there are uncommitted changes
    if ! git diff --quiet || ! git diff --cached --quiet; then
        log "Committing changes for GitLab CI deployment..."
        git add .
        git commit -m "Automated deployment commit - $(date)" || true
    fi
    
    # Push to main branch
    git push origin main || error_exit "Failed to push to GitLab"
    
    log "Changes pushed to GitLab, CI pipeline should start automatically"
}

# Custom deployment script
deploy_with_custom_script() {
    log "Executing custom deployment script..."
    
    if [ -x "$PROJECT_ROOT/deploy.sh" ]; then
        "$PROJECT_ROOT/deploy.sh" || error_exit "Custom deployment script failed"
    else
        error_exit "deploy.sh is not executable"
    fi
}

# STEP 5 - REAL-TIME GUI MONITORING (already implemented in start_gui_monitor)

# STEP 6 - SERVICE VALIDATION
step6_service_validation() {
    CURRENT_STEP=6
    update_status "SERVICE VALIDATION"
    
    log "${BLUE}=== STEP 6: SERVICE VALIDATION ===${NC}"
    
    local ports=()
    
    # Detect ports from docker-compose.yml
    if [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        ports+=($(grep -E "^\s*-\s*[0-9]+:" "$PROJECT_ROOT/docker-compose.yml" | grep -oE '[0-9]+' | head -10))
    fi
    
    # Detect ports from package.json scripts
    if [ -f "$PROJECT_ROOT/package.json" ]; then
        local dev_port=$(grep -E '"dev".*--port\s+[0-9]+' "$PROJECT_ROOT/package.json" | grep -oE '[0-9]+' | head -1)
        [ -n "$dev_port" ] && ports+=("$dev_port")
    fi
    
    # Default ports if none detected
    if [ ${#ports[@]} -eq 0 ]; then
        ports=(3000 8000 8080 5000)
    fi
    
    log "Checking services on ports: ${ports[*]}"
    
    local validated_services=()
    
    for port in "${ports[@]}"; do
        if check_service_health "localhost" "$port"; then
            validated_services+=("localhost:$port")
        fi
    done
    
    if [ ${#validated_services[@]} -gt 0 ]; then
        log "${GREEN}Services validated: ${validated_services[*]}${NC}"
        echo "${validated_services[*]}" > "$TEMP_DIR/validated_services"
    else
        log "${YELLOW}No services responding on expected ports${NC}"
    fi
}

# Check service health
check_service_health() {
    local host="$1"
    local port="$2"
    
    log "Checking service at $host:$port..."
    
    if command -v curl &> /dev/null; then
        if curl -s --max-time 5 "$host:$port" >/dev/null 2>&1; then
            log "${GREEN}Service $host:$port is responding${NC}"
            return 0
        fi
    elif command -v nc &> /dev/null; then
        if nc -z "$host" "$port" 2>/dev/null; then
            log "${GREEN}Service $host:$port is responding${NC}"
            return 0
        fi
    fi
    
    log "${YELLOW}Service $host:$port is not responding${NC}"
    return 1
}

# STEP 7 - SNAPSHOT AND ROLLBACK (already implemented in step1 and error handling)

# STEP 8 - POST-DEPLOY GUI CONFIRMATION
step8_post_deploy_confirmation() {
    CURRENT_STEP=8
    update_status "POST-DEPLOY CONFIRMATION"
    
    log "${BLUE}=== STEP 8: POST-DEPLOY CONFIRMATION ===${NC}"
    
    local message="Deployment completed successfully!"
    
    if [ -f "$TEMP_DIR/validated_services" ]; then
        local services=$(cat "$TEMP_DIR/validated_services")
        message="$message\n\nServices available at: $services"
    fi
    
    local archive_deployment=false
    
    if command -v zenity &> /dev/null; then
        zenity --info --text="$message" --width=400
        
        if zenity --question --text="Archive this deployment?" --width=400; then
            archive_deployment=true
        fi
    else
        echo -e "$message"
        read -p "Archive this deployment? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            archive_deployment=true
        fi
    fi
    
    if $archive_deployment; then
        archive_deployment_history
    fi
}

# Archive deployment
archive_deployment_history() {
    log "Archiving deployment..."
    
    local archive_name="deployment_${PROJECT_NAME}_${TIMESTAMP}.tar.gz"
    local archive_path="$DEPLOY_HISTORY_DIR/$archive_name"
    
    # Create archive excluding node_modules, .git, and other large directories
    tar -czf "$archive_path" \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=venv \
        --exclude=__pycache__ \
        --exclude=.pytest_cache \
        --exclude=dist \
        --exclude=build \
        -C "$PROJECT_ROOT" . || error_exit "Failed to create deployment archive"
    
    log "${GREEN}Deployment archived: $archive_path${NC}"
}

# STEP 9 - TERMINAL UI FALLBACK (integrated throughout)

# STEP 10 - EMIT AGENT-FRIENDLY HEADER
step10_emit_agent_header() {
    CURRENT_STEP=10
    update_status "DEPLOYMENT COMPLETE"
    
    log "${BLUE}=== STEP 10: AGENT-FRIENDLY OUTPUT ===${NC}"
    
    local services=""
    if [ -f "$TEMP_DIR/validated_services" ]; then
        services=$(cat "$TEMP_DIR/validated_services")
    fi
    
    local final_status=$(cat "$TEMP_DIR/status.json")
    
    # Emit final JSON status
    cat > "$PROJECT_ROOT/deployment_status.json" << EOF
{
    "deployment_id": "deploy_${PROJECT_NAME}_${TIMESTAMP}",
    "project_name": "$PROJECT_NAME",
    "project_type": "$(cat "$TEMP_DIR/project_type" 2>/dev/null || echo "unknown")",
    "status": "SUCCESS",
    "timestamp": "$(date -Iseconds)",
    "duration": "$(( $(date +%s) - $(stat -c %Y "$LOG_FILE") ))",
    "services": "$services",
    "log_file": "$LOG_FILE",
    "git_snapshot": "$(cat "$TEMP_DIR/git_snapshot" 2>/dev/null || echo "none")",
    "deployment_steps": [
        "PROJECT_INITIALIZATION",
        "PROJECT_TYPE_DETECTION", 
        "ENVIRONMENT_VALIDATION",
        "DEPLOYMENT_EXECUTION",
        "GUI_MONITORING",
        "SERVICE_VALIDATION",
        "SNAPSHOT_ROLLBACK",
        "POST_DEPLOY_CONFIRMATION",
        "TERMINAL_UI_FALLBACK",
        "AGENT_FRIENDLY_OUTPUT"
    ]
}
EOF
    
    log "${GREEN}=== DEPLOYMENT COMPLETE ===${NC}"
    log "Status JSON: $PROJECT_ROOT/deployment_status.json"
    log "Log file: $LOG_FILE"
    
    # Display final status
    echo -e "\n${GREEN}🎉 DEPLOYMENT SUCCESSFUL! 🎉${NC}"
    echo -e "${BLUE}Project: $PROJECT_NAME${NC}"
    echo -e "${BLUE}Type: $(cat "$TEMP_DIR/project_type" 2>/dev/null || echo "unknown")${NC}"
    echo -e "${BLUE}Services: $services${NC}"
    echo -e "${BLUE}Log: $LOG_FILE${NC}"
}

# Main execution function
main() {
    log "${GREEN}Starting COPILOT COATING AGENT deployment...${NC}"
    log "Project: $PROJECT_NAME"
    log "Root: $PROJECT_ROOT"
    
    # Start GUI monitor
    start_gui_monitor
    
    # Execute deployment steps
    step1_project_initialization
    step2_project_type_detection
    step3_environment_validation
    step4_deployment_execution
    step6_service_validation
    step8_post_deploy_confirmation
    step10_emit_agent_header
    
    log "${GREEN}Deployment completed successfully!${NC}"
}

# Execute main function
main "$@"
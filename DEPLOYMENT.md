# Deployment Agent - Streamlined Configuration

## Overview

The COPILOT COATING AGENT provides a unified, single-click deployment protocol for the Lpturbo repository. This system implements all 10 steps of the deployment directive with intelligent project detection, environment validation, and comprehensive monitoring.

## Features

### 🚀 **Automated Deployment Protocol**
- **Project Detection**: Automatically identifies Node.js, Python, or Docker projects
- **Environment Validation**: Validates and prompts for missing environment variables
- **Multiple Deployment Methods**: Supports docker-compose, GitLab CI, and custom scripts
- **Service Validation**: Automatically detects and validates running services
- **Rollback Support**: Git snapshot-based rollback capability

### 🖥️ **User Interface**
- **GUI Mode**: Uses `zenity` for graphical prompts and monitoring
- **Terminal Fallback**: Uses `dialog`/`whiptail` when GUI unavailable
- **Real-time Status**: Background monitoring with progress indicators
- **Agent Integration**: JSON output for automated agent consumption

### 📊 **Monitoring & Logging**
- **Timestamped Logs**: Comprehensive deployment logging
- **Status Tracking**: Real-time status updates throughout deployment
- **Service Health**: Automatic port detection and health checking
- **Deployment History**: Optional archival of successful deployments

## Usage

### Quick Start

```bash
# Make the script executable
chmod +x deploy-agent.sh

# Run the deployment
./deploy-agent.sh
```

### Environment Setup

1. **Create `.env.schema`** (optional but recommended):
   ```env
   PRIVATE_KEY=your_private_key_here
   FUNDING_WALLET=0x1234567890123456789012345678901234567890
   CONTRACT_ADDRESS=
   RPC_URL=https://mainnet.base.org
   CHAIN_ID=8453
   ```

2. **The script will prompt for missing variables** using GUI or terminal input

### Deployment Methods

The agent automatically detects and uses the most appropriate deployment method:

1. **Docker Compose** (if `docker-compose.yml` exists)
2. **GitLab CI** (if `.gitlab-ci.yml` exists)
3. **Custom Script** (if `deploy.sh` exists)
4. **Default by Project Type**:
   - Node.js: `npm install && npm run build`
   - Python: Virtual environment + `pip install -r requirements.txt`
   - Docker: `docker build -t <project-name> .`

## Deployment Steps

The agent implements these 10 steps:

1. **PROJECT INITIALIZATION** - Extract project info and create Git snapshot
2. **PROJECT TYPE DETECTION** - Identify Node.js, Python, or Docker project
3. **ENVIRONMENT VALIDATION** - Validate and prompt for missing env variables
4. **DEPLOYMENT EXECUTION** - Execute deployment based on project type
5. **GUI MONITORING** - Real-time status updates (background process)
6. **SERVICE VALIDATION** - Detect and validate running services
7. **SNAPSHOT/ROLLBACK** - Git-based rollback on failure
8. **POST-DEPLOY CONFIRMATION** - Success notification and archival option
9. **TERMINAL FALLBACK** - Use CLI prompts when GUI unavailable
10. **AGENT-FRIENDLY OUTPUT** - JSON status for automation

## Output Files

- **`deployment_status.json`** - Final deployment status for agent integration
- **`deployment_YYYYMMDD_HHMMSS.log`** - Detailed deployment log
- **`deploy-history/`** - Archived successful deployments (optional)
- **`.env`** - Updated with any new environment variables

## Example Output

```json
{
  "deployment_id": "deploy_Lpturbo_20250717_004622",
  "project_name": "Lpturbo",
  "project_type": "nodejs",
  "status": "SUCCESS",
  "timestamp": "2025-07-17T00:49:20+00:00",
  "duration": "298",
  "services": "localhost:3000 localhost:8000",
  "log_file": "/path/to/deployment_log.log",
  "git_snapshot": "ad18416551a4c4af8d8f787976ca4deb38603c4b"
}
```

## Error Handling

- **Automatic Rollback**: On failure, offers to roll back to pre-deployment Git snapshot
- **Comprehensive Logging**: All operations logged with timestamps
- **Status Tracking**: Real-time status updates for monitoring
- **Graceful Degradation**: Falls back to terminal UI when GUI unavailable

## Dependencies

### Required
- `bash` (4.0+)
- `git`
- `curl` or `nc` (for service validation)

### Optional (for enhanced experience)
- `zenity` (for GUI prompts and monitoring)
- `dialog` or `whiptail` (for terminal UI fallback)
- `docker` and `docker-compose` (for Docker deployments)

### Project-Specific
- **Node.js**: `npm`
- **Python**: `python3`, `pip`
- **Docker**: `docker`

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**: The script will prompt for any missing variables defined in `.env.schema`
2. **Service Validation Failures**: Normal if services aren't running; doesn't affect deployment success
3. **GUI Not Available**: Script automatically falls back to terminal prompts
4. **Deployment Failures**: Offers automatic rollback to pre-deployment state

### Manual Rollback

If automatic rollback fails:
```bash
# Check the deployment log for the Git snapshot hash
cat deployment_YYYYMMDD_HHMMSS.log | grep "Git snapshot"

# Manually reset to snapshot
git reset --hard <snapshot-hash>
```

## Integration with Existing Workflows

The deployment agent is designed to work alongside existing deployment workflows:

- **GitLab CI**: Automatically triggers GitLab CI pipeline if `.gitlab-ci.yml` exists
- **Docker**: Builds and optionally runs Docker containers
- **Custom Scripts**: Executes existing `deploy.sh` scripts

## Security Considerations

- Environment variables with sensitive names (PASSWORD, SECRET, KEY, TOKEN, PRIVATE) use password prompts
- Generated `.env` files should be added to `.gitignore`
- Git snapshots allow safe experimentation with rollback capability
- Deployment archives exclude sensitive directories (`node_modules`, `.git`, etc.)

## Contributing

The deployment agent is designed to be extensible. To add support for new project types or deployment methods, modify the appropriate functions in `deploy-agent.sh`.

## License

Same as the main project (MIT License).
#!/usr/bin/env bash

# Bash wrapper for Ansible deploy
# Uses inventory and host from inventory file to decide if SSH key works

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

INVENTORY="${SCRIPT_DIR}/inventory/production.yml"
PLAYBOOK="${SCRIPT_DIR}/site.yml"
CONFIG="${SCRIPT_DIR}/inventory/production.cfg"

# Check if config file exists
if [ ! -f "$CONFIG" ]; then
    echo "Configuration file not found"
    echo "Starting production server setup..."
    "${SCRIPT_DIR}/setup-production.sh"
    if [ $? -ne 0 ]; then
        echo "Error during production server setup"
        exit 1
    fi
fi

# Load configuration using Python YAML parser
read_config() {
    python3 -c "
import yaml
with open('$CONFIG', 'r') as f:
    config = yaml.safe_load(f)
print(config.get('$1', ''))"
}

PRODUCTION_SERVER_IP=$(read_config "production_server_ip")
CONNECTION_PORT=$(read_config "connection_port")
SSH_PORT=$(read_config "ssh_port")
SSH_KEY_NAME=$(read_config "ssh_key_name")

# Validate configuration
if [ -z "$PRODUCTION_SERVER_IP" ] || [ -z "$CONNECTION_PORT" ] || [ -z "$SSH_PORT" ] || [ -z "$SSH_KEY_NAME" ]; then
    echo "Error: Invalid configuration. Please run setup-production.sh again"
    exit 1
fi

# Remove old host key if exists
echo "Removing old host key from known_hosts..."
ssh-keygen -R "${PRODUCTION_SERVER_IP}" 2>/dev/null

# Make sure ssh-agent is running
eval "$(ssh-agent -s)" > /dev/null

# Try to add the key if it's not already added
if ! ssh-add -l | grep -q "${SSH_KEY_NAME}"; then
    echo "Adding SSH key to agent..."
    ssh-add ~/.ssh/${SSH_KEY_NAME}
fi

# Common SSH options
SSH_OPTS="-o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no -i ~/.ssh/${SSH_KEY_NAME}"

# Try to connect using the key
if ssh -p "${CONNECTION_PORT}" ${SSH_OPTS} "root@${PRODUCTION_SERVER_IP}" exit 0 &>/dev/null; then
    echo "Connecting with SSH key..."
    ansible-playbook "$PLAYBOOK" -i "$INVENTORY" --ssh-extra-args="${SSH_OPTS}"
else
    echo "SSH key failed, falling back to password prompt..."
    ansible-playbook "$PLAYBOOK" -i "$INVENTORY" -k -K --ssh-extra-args="${SSH_OPTS}"
fi

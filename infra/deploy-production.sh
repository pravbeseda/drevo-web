#!/usr/bin/env bash

# Bash wrapper for Ansible deploy
# Uses inventory and host from inventory file to decide if SSH key works

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

INVENTORY="${SCRIPT_DIR}/inventory/production.yml"
PLAYBOOK="${SCRIPT_DIR}/site.yml"
CONFIG="${SCRIPT_DIR}/inventory/production.cfg"

# Add cleanup function and trap
cleanup() {
    # Kill ssh-agent if we started it
    if [ -n "$SSH_AGENT_PID" ]; then
        ssh-agent -k > /dev/null 2>&1
    fi

    # Remove temporary password file if it exists
    if [ -f "$PASSWORD_FILE" ]; then
        rm -f "$PASSWORD_FILE"
    fi

    echo -e "\nCleanup completed. Exiting."
    exit
}

# Trap for clean exit
trap cleanup INT TERM EXIT

# Check if required Python packages are installed
check_and_install_dependencies() {
    echo "Checking required dependencies..."
    if ! python3 -c "import yaml" 2>/dev/null; then
        echo "Installing PyYAML package..."
        pip install PyYAML || {
            echo "Failed to install PyYAML using pip. Trying with pip3..."
            pip3 install PyYAML || {
                echo "Failed to install PyYAML. Please install it manually: pip install PyYAML"
                exit 1
            }
        }
        echo "PyYAML installed successfully."
    else
        echo "PyYAML already installed."
    fi
}

# Run dependency check
check_and_install_dependencies

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

# Common SSH options for both direct SSH and Ansible
SSH_OPTS="-o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no -o BatchMode=yes"

# Try to connect using the key
echo "Testing SSH connection..."
TEST_RESULT=0
ANSIBLE_HOST_KEY_CHECKING=False ssh ${SSH_OPTS} -i ~/.ssh/${SSH_KEY_NAME} -p "${CONNECTION_PORT}" "root@${PRODUCTION_SERVER_IP}" exit 0 || TEST_RESULT=$?

echo "SSH test result: $TEST_RESULT"

# Prompt for root password change
echo -n "Enter new root password or just press Enter to leave current one: "
read -s ROOT_PASSWORD
echo ""

# Create a temporary password file if needed
PASSWORD_FILE=""
EXTRA_VARS=""

if [ ! -z "$ROOT_PASSWORD" ]; then
    # Create a temporary file with restrictive permissions
    PASSWORD_FILE=$(mktemp)
    chmod 600 "$PASSWORD_FILE"
    echo "new_root_password: '$ROOT_PASSWORD'" > "$PASSWORD_FILE"

    EXTRA_VARS="-e @$PASSWORD_FILE"
    echo "Root password will be updated"
else
    echo "Root password will not be changed"
fi

if [ $TEST_RESULT -eq 0 ]; then
    echo "Connecting with SSH key..."
    ANSIBLE_HOST_KEY_CHECKING=False ansible-playbook "$PLAYBOOK" -i "$INVENTORY" -e "@$CONFIG" --ssh-extra-args="${SSH_OPTS} -i ~/.ssh/${SSH_KEY_NAME}" $EXTRA_VARS
else
    echo "SSH key authentication failed (exit code: $TEST_RESULT), using password..."
    # Remove key from agent to force password authentication
    ssh-add -d ~/.ssh/${SSH_KEY_NAME} 2>/dev/null
    # Remove BatchMode for password authentication
    SSH_OPTS="-o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no"
    ANSIBLE_HOST_KEY_CHECKING=False ansible-playbook "$PLAYBOOK" -i "$INVENTORY" -e "@$CONFIG" -k --ssh-extra-args="${SSH_OPTS}" $EXTRA_VARS
fi


#!/usr/bin/env bash

# Bash wrapper for Ansible deploy
# Uses inventory and host from inventory file to decide if SSH key works

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

INVENTORY="${SCRIPT_DIR}/inventory/production.yml"
HOST="production-server"
PLAYBOOK="${SCRIPT_DIR}/site.yml"

# Check if ssh-agent is running and has any keys
if ! ssh-add -l &>/dev/null; then
  echo "No SSH keys found in ssh-agent. Please add your key with: ssh-add ~/.ssh/id_drevo"
  exit 1
fi

# Try to ping host via SSH key silently
if ansible "$HOST" -i "$INVENTORY" -m ping --ssh-extra-args='-o BatchMode=yes' &>/dev/null; then
  echo "Connecting with SSH key..."
  ansible-playbook "$PLAYBOOK" -i "$INVENTORY"
else
  echo "SSH key failed, falling back to password prompt..."
  ansible-playbook "$PLAYBOOK" -i "$INVENTORY" -k -K
fi

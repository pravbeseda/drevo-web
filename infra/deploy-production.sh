#!/usr/bin/env bash

# Bash wrapper for Ansible deploy
# Uses inventory and host from inventory file to decide if SSH key works

INVENTORY="inventory/production.yml"
HOST="production-server"
PLAYBOOK="site.yml"

# Try to ping host via SSH key silently
if ansible "$HOST" -i "$INVENTORY" -m ping --ssh-extra-args='-o BatchMode=yes' &>/dev/null; then
  echo "Connecting with SSH key..."
  ansible-playbook "$PLAYBOOK" -i "$INVENTORY"
else
  echo "SSH key failed, falling back to password prompt..."
  ansible-playbook "$PLAYBOOK" -i "$INVENTORY" -k -K
fi 
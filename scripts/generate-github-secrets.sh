#!/bin/bash

# Interactive script to generate all GitHub secrets values
# Usage: ./generate-github-secrets.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  GitHub Secrets Generator for Drevo Deployment${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Function to read input with default value
read_with_default() {
    local prompt="$1"
    local default="$2"
    local result

    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " result
        echo "${result:-$default}"
    else
        read -p "$prompt: " result
        echo "$result"
    fi
}

# Select environment
echo -e "${GREEN}Select environment:${NC}"
echo "  1) Production"
echo "  2) Staging"
echo ""
read -p "Enter choice (1 or 2): " env_choice

if [ "$env_choice" = "1" ]; then
    ENV_NAME="production"
    DEFAULT_USER="github-deploy"
elif [ "$env_choice" = "2" ]; then
    ENV_NAME="staging"
    DEFAULT_USER="github-deploy"
else
    echo -e "${RED}Invalid choice${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}━━━ Configuring ${ENV_NAME} environment ━━━${NC}"
echo ""

# Get server details
SSH_HOST=$(read_with_default "Server IP or domain" "")
SSH_PORT=$(read_with_default "SSH port" "22")
SSH_USER=$(read_with_default "SSH user" "$DEFAULT_USER")

if [ -z "$SSH_HOST" ]; then
    echo -e "${RED}Error: Server host is required${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}━━━ Generating secrets values ━━━${NC}"
echo ""

# 1. SSH_USER
echo -e "${GREEN}1️⃣  SSH_USER${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$SSH_USER"
echo ""

# 2. SSH_HOST
echo -e "${GREEN}2️⃣  SSH_HOST${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$SSH_HOST"
echo ""

# 3. SSH_PORT
echo -e "${GREEN}3️⃣  SSH_PORT${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$SSH_PORT"
echo ""

# 4. SSH_KNOWN_HOSTS
echo -e "${GREEN}4️⃣  SSH_KNOWN_HOSTS${NC}"
echo -e "${YELLOW}Scanning server ${SSH_HOST}:${SSH_PORT}...${NC}"
echo ""

if command -v ssh-keyscan &> /dev/null; then
    KNOWN_HOSTS=$(ssh-keyscan -p "$SSH_PORT" -H "$SSH_HOST" 2>/dev/null)

    if [ -n "$KNOWN_HOSTS" ]; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "$KNOWN_HOSTS"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
    else
        echo -e "${RED}❌ Could not connect to server${NC}"
        echo ""
        echo "Run manually:"
        echo "  ssh-keyscan -p $SSH_PORT -H $SSH_HOST"
        echo ""
    fi
else
    echo -e "${RED}❌ ssh-keyscan not found${NC}"
    echo ""
    echo "Install OpenSSH client or run manually:"
    echo "  ssh-keyscan -p $SSH_PORT -H $SSH_HOST"
    echo ""
fi

# 5. SSH_PRIVATE_KEY
echo -e "${GREEN}5️⃣  SSH_PRIVATE_KEY${NC}"
echo ""

# Check for existing keys
KEY_PATH="$HOME/.ssh/github-deploy-${ENV_NAME}"

if [ -f "$KEY_PATH" ]; then
    echo -e "${YELLOW}Found existing key: $KEY_PATH${NC}"
    read -p "Use this key? (y/n): " use_existing

    if [ "$use_existing" = "y" ] || [ "$use_existing" = "Y" ]; then
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        cat "$KEY_PATH"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo -e "${YELLOW}⚠️  Don't forget to copy the public key to the server:${NC}"
        echo "  ssh-copy-id -i $KEY_PATH.pub $SSH_USER@$SSH_HOST"
        echo ""
    else
        echo -e "${YELLOW}Skipping...${NC}"
        echo ""
    fi
else
    echo -e "${YELLOW}No existing key found at: $KEY_PATH${NC}"
    echo ""
    read -p "Generate new SSH key pair? (y/n): " generate_key

    if [ "$generate_key" = "y" ] || [ "$generate_key" = "Y" ]; then
        echo ""
        echo -e "${GREEN}Generating new SSH key...${NC}"
        ssh-keygen -t ed25519 -C "github-actions-${ENV_NAME}" -f "$KEY_PATH" -N ""
        echo ""
        echo -e "${GREEN}✅ Key generated!${NC}"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        cat "$KEY_PATH"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo -e "${YELLOW}⚠️  Now copy the public key to the server:${NC}"
        echo "  ssh-copy-id -i $KEY_PATH.pub $SSH_USER@$SSH_HOST"
        echo ""
        echo "Or manually:"
        echo "  cat $KEY_PATH.pub | ssh $SSH_USER@$SSH_HOST 'mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys'"
        echo ""
    else
        echo ""
        echo "To generate manually:"
        echo "  ssh-keygen -t ed25519 -C \"github-actions-${ENV_NAME}\" -f ~/.ssh/github-deploy-${ENV_NAME}"
        echo "  cat ~/.ssh/github-deploy-${ENV_NAME}"
        echo ""
    fi
fi

# Summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Summary for ${ENV_NAME} environment${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Go to GitHub:"
echo "  Settings → Environments → ${ENV_NAME} → Add secret"
echo ""
echo "Add these secrets:"
echo "  ✓ SSH_USER = $SSH_USER"
echo "  ✓ SSH_HOST = $SSH_HOST"
echo "  ✓ SSH_PORT = $SSH_PORT"
echo "  ✓ SSH_KNOWN_HOSTS = (output from step 4)"
echo "  ✓ SSH_PRIVATE_KEY = (output from step 5)"
echo ""
echo -e "${YELLOW}💡 Tip: Copy each value one by one from the outputs above${NC}"
echo ""


#!/bin/bash

# Script to get SSH_KNOWN_HOSTS value for GitHub secrets
# Usage: ./get-ssh-known-hosts.sh <server-ip-or-domain> [port]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [ $# -eq 0 ]; then
    echo -e "${RED}Usage: $0 <server-ip-or-domain> [port]${NC}"
    echo ""
    echo "Examples:"
    echo "  $0 123.45.67.89"
    echo "  $0 drevo-info.ru"
    echo "  $0 staging.drevo-info.ru 2222"
    echo ""
    exit 1
fi

SERVER="$1"
PORT="${2:-22}"

echo -e "${GREEN}Getting SSH known hosts for: ${SERVER}:${PORT}${NC}"
echo ""

# Check if ssh-keyscan is available
if ! command -v ssh-keyscan &> /dev/null; then
    echo -e "${RED}Error: ssh-keyscan is not installed${NC}"
    exit 1
fi

echo -e "${YELLOW}Scanning server...${NC}"
echo ""

# Get known hosts with hashed hostname
KNOWN_HOSTS=$(ssh-keyscan -p "$PORT" -H "$SERVER" 2>/dev/null)

if [ -z "$KNOWN_HOSTS" ]; then
    echo -e "${RED}Error: Could not connect to server ${SERVER}:${PORT}${NC}"
    echo ""
    echo "Possible reasons:"
    echo "  - Server is not reachable"
    echo "  - Wrong port number"
    echo "  - Firewall blocking connection"
    echo "  - SSH service not running"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Success! Copy the text below and paste it into SSH_KNOWN_HOSTS secret:${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$KNOWN_HOSTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}📋 Key types found:${NC}"
echo "$KNOWN_HOSTS" | awk '{print "  - " $2}'
echo ""
echo -e "${GREEN}💡 Next steps:${NC}"
echo "  1. Copy the entire output above (including all lines)"
echo "  2. Go to GitHub: Settings → Environments → [environment] → Add secret"
echo "  3. Name: SSH_KNOWN_HOSTS"
echo "  4. Paste the copied text"
echo ""


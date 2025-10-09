#!/usr/bin/env bash

# Setup script to configure git hooks for security scanning
# Run this script once after cloning the repository

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Setting up git hooks for drevo-web...${NC}\n"

# Configure git to use custom hooks directory
echo -e "${YELLOW}📁 Configuring git hooks directory...${NC}"
git config core.hooksPath .githooks

echo -e "${GREEN}✅ Git hooks directory configured!${NC}\n"

# Check if gitleaks is installed
if command -v gitleaks &> /dev/null; then
    echo -e "${GREEN}✅ Gitleaks is already installed ($(gitleaks version))${NC}"
else
    echo -e "${YELLOW}⚠️  Gitleaks is not installed${NC}"
    echo -e "${BLUE}📦 Installing gitleaks...${NC}\n"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install gitleaks
            echo -e "${GREEN}✅ Gitleaks installed successfully!${NC}"
        else
            echo -e "${YELLOW}⚠️  Homebrew not found. Please install gitleaks manually:${NC}"
            echo "   brew install gitleaks"
            echo "   OR"
            echo "   Visit: https://github.com/gitleaks/gitleaks#installing"
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo -e "${YELLOW}Please install gitleaks manually:${NC}"
        echo "  wget https://github.com/gitleaks/gitleaks/releases/download/v8.18.0/gitleaks_8.18.0_linux_x64.tar.gz"
        echo "  tar -xzf gitleaks_8.18.0_linux_x64.tar.gz"
        echo "  sudo mv gitleaks /usr/local/bin/"
        echo "  OR visit: https://github.com/gitleaks/gitleaks#installing"
    fi
fi

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Setup complete!${NC}\n"
echo -e "${BLUE}📝 What happens now:${NC}"
echo -e "   • Pre-commit hook will scan for secrets before each commit"
echo -e "   • GitHub Actions will scan on push/PR"
echo -e "   • Configuration is in .gitleaks.toml\n"
echo -e "${BLUE}🧪 Test the hook:${NC}"
echo -e "   git commit --allow-empty -m 'test commit'\n"

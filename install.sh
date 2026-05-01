#!/bin/bash

# Foundation Server Installation Script for Ubuntu 22.04
# This script installs Node.js, Redis, and all required system dependencies.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Foundation Server installation on Ubuntu 22.04...${NC}"

# Update system packages
echo -e "${YELLOW}Updating system packages...${NC}"
sudo apt-get update

# Install build dependencies
echo -e "${YELLOW}Installing build dependencies...${NC}"
sudo apt-get install -y build-essential libsodium-dev libboost-system-dev curl git

# Install Redis
echo -e "${YELLOW}Installing Redis server...${NC}"
sudo apt-get install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Install Node.js 20 LTS
echo -e "${YELLOW}Installing Node.js 20 LTS...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
echo -e "${YELLOW}Installing PM2 globally...${NC}"
sudo npm install pm2 -g

# Install project dependencies
echo -e "${YELLOW}Installing project dependencies...${NC}"
npm install

echo -e "${GREEN}Installation complete!${NC}"
echo -e "${YELLOW}Please configure your server in the 'configs' directory before starting.${NC}"
echo -e "You can start the server in production mode using: ${GREEN}npm run prod:start${NC}"

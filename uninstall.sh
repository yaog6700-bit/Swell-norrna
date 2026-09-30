#!/bin/bash
set -e

SERVICE_NAME="swell-norrna"
INSTALL_DIR="/opt/swell-norrna"
DATA_DIR="/var/lib/swell-norrna"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[ok]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[x]${NC} $1"; exit 1; }

[ "$EUID" -ne 0 ] && error "Please run as root: sudo bash uninstall.sh"

echo ""
echo "=================================================="
echo "   Swell-Norrna Uninstall"
echo "=================================================="
echo ""
warn "This will remove all Norrna files and services."
read -r -p "Continue? [y/N] " confirm
[[ "$confirm" =~ ^[Yy]$ ]] || { echo "Cancelled."; exit 0; }

# Stop and disable service
if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
  systemctl stop "$SERVICE_NAME"
  info "Service stopped"
fi
if systemctl is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
  systemctl disable "$SERVICE_NAME"
  info "Service disabled"
fi

# Remove systemd unit
if [ -f "/etc/systemd/system/${SERVICE_NAME}.service" ]; then
  rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
  systemctl daemon-reload
  info "Systemd unit removed"
fi

# Remove install directory
if [ -d "$INSTALL_DIR" ]; then
  rm -rf "$INSTALL_DIR"
  info "Removed $INSTALL_DIR"
fi

# Ask about data
echo ""
read -r -p "Also delete data directory ($DATA_DIR)? [y/N] " del_data
if [[ "$del_data" =~ ^[Yy]$ ]]; then
  rm -rf "$DATA_DIR"
  info "Removed $DATA_DIR"
else
  warn "Data kept at $DATA_DIR"
fi

echo ""
echo "=================================================="
echo -e "${GREEN}[ok] Norrna uninstalled.${NC}"
echo "=================================================="
echo ""
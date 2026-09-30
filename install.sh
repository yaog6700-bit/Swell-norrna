#!/bin/bash
set -e

REPO="yaog6700-bit/Swell-norrna"
INSTALL_DIR="/opt/swell-norrna"
DATA_DIR="/var/lib/swell-norrna"
WEBPORT="${WEBPORT:-9000}"
AGENTPORT="${AGENTPORT:-9001}"
SERVICE_NAME="swell-norrna"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${GREEN}[ok]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[x]${NC} $1"; exit 1; }
step()  { echo -e "\n${CYAN}>> $1${NC}"; }

echo ""
echo "=================================================="
echo "   Swell-Norrna Install"
echo "=================================================="

[ "$EUID" -ne 0 ] && error "Please run as root: sudo bash install.sh"

ARCH=$(uname -m)
case "$ARCH" in
  x86_64)  SUFFIX="linux-amd64" ;;
  aarch64) SUFFIX="linux-arm64" ;;
  *) error "Unsupported arch: $ARCH" ;;
esac
info "Arch: $ARCH ($SUFFIX)"

step "Installing dependencies"
apt-get update -qq
apt-get install -y -qq curl wget tar

# Stop service before updating binaries (avoids "Text file busy" error)
if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
  warn "Stopping existing service..."
  systemctl stop "$SERVICE_NAME"
fi

step "Getting latest version"
LATEST=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
  | grep '"tag_name"' | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')
[ -z "$LATEST" ] && error "Cannot get latest version, check your network"
info "Latest: $LATEST"

BASE_URL="https://github.com/${REPO}/releases/download/${LATEST}"

step "Downloading binaries"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

curl -fL --retry 5 --progress-bar \
  -o norrna-manager "${BASE_URL}/norrna-manager-${SUFFIX}"
chmod +x norrna-manager

curl -fL --retry 5 --progress-bar \
  -o realm "${BASE_URL}/realm-${SUFFIX}"
chmod +x realm

curl -fL --retry 5 --progress-bar \
  -o dist.tar.gz "${BASE_URL}/dist.tar.gz"
rm -rf dist
mkdir -p dist
tar -xzf dist.tar.gz --strip-components=1 -C dist
rm dist.tar.gz
info "Download complete"

mkdir -p "$DATA_DIR"

step "Creating systemd service"
cat > /etc/systemd/system/${SERVICE_NAME}.service <<EOF
[Unit]
Description=Swell-Norrna Manager
After=network.target

[Service]
Type=simple
ExecStart=${INSTALL_DIR}/norrna-manager --webport ${WEBPORT} --agentport ${AGENTPORT} --data-dir ${DATA_DIR}
WorkingDirectory=${INSTALL_DIR}
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl start "$SERVICE_NAME"
info "Service started"

if command -v ufw &>/dev/null; then
  ufw allow "$WEBPORT"/tcp 2>/dev/null || true
  ufw allow "$AGENTPORT"/tcp 2>/dev/null || true
  info "Firewall: opened ports $WEBPORT and $AGENTPORT"
fi

IP=$(curl -s4 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
echo ""
echo "=================================================="
echo -e "${GREEN}[ok] Install complete!${NC}"
echo ""
echo -e "  Panel:      ${CYAN}http://${IP}:${WEBPORT}${NC}"
echo "  Agent port: ${AGENTPORT}"
echo "  Data dir:   ${DATA_DIR}"
echo ""
echo "  Logs:    journalctl -u $SERVICE_NAME -f"
echo "  Restart: systemctl restart $SERVICE_NAME"
echo "  Update:  bash <(curl -fsSL https://raw.githubusercontent.com/${REPO}/main/install.sh)"
echo "=================================================="
echo ""
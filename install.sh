#!/bin/bash
# ============================================================
# Swell-Norrna 一键安装脚本 (从 GitHub Releases 下载预编译二进制)
# 用法: bash <(curl -fsSL https://raw.githubusercontent.com/yaog6700-bit/Swell-norrna/main/install.sh)
# ============================================================
set -e

REPO="yaog6700-bit/Swell-norrna"
INSTALL_DIR="/opt/swell-norrna"
DATA_DIR="/var/lib/swell-norrna"
WEBPORT="${WEBPORT:-9000}"
AGENTPORT="${AGENTPORT:-9001}"
SERVICE_NAME="swell-norrna"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }
step()  { echo -e "\n${CYAN}▶ $1${NC}"; }

echo ""
echo "=================================================="
echo "      Swell-Norrna 一键安装"
echo "=================================================="

# ── root 检查 ──────────────────────────────────────────────
[ "$EUID" -ne 0 ] && error "请用 root 权限运行: sudo bash install.sh"

# ── 检测架构 ───────────────────────────────────────────────
ARCH=$(uname -m)
case "$ARCH" in
  x86_64)  SUFFIX="linux-amd64" ;;
  aarch64) SUFFIX="linux-arm64" ;;
  *) error "不支持的架构: $ARCH" ;;
esac
info "架构: $ARCH ($SUFFIX)"

# ── 安装基础依赖 ───────────────────────────────────────────
step "检查依赖"
apt-get update -qq
apt-get install -y -qq curl wget tar

# ── 获取最新 Release 版本号 ────────────────────────────────
step "获取最新版本"
LATEST=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
  | grep '"tag_name"' | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')
[ -z "$LATEST" ] && error "无法获取最新版本，请检查网络或稍后重试"
info "最新版本: $LATEST"

BASE_URL="https://github.com/${REPO}/releases/download/${LATEST}"

# ── 下载文件 ───────────────────────────────────────────────
step "下载二进制文件"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# 下载 manager 二进制
curl -fL --retry 5 --progress-bar \
  -o norrna-manager "${BASE_URL}/norrna-manager-${SUFFIX}"
chmod +x norrna-manager

# 下载 realm agent 二进制
curl -fL --retry 5 --progress-bar \
  -o realm "${BASE_URL}/realm-${SUFFIX}"
chmod +x realm

# 下载前端 dist
curl -fL --retry 5 --progress-bar \
  -o dist.tar.gz "${BASE_URL}/dist.tar.gz"
tar -xzf dist.tar.gz
rm dist.tar.gz
info "下载完成"

# ── 创建数据目录 ───────────────────────────────────────────
mkdir -p "$DATA_DIR"

# ── 创建 systemd 服务 ─────────────────────────────────────
step "配置系统服务"
cat > /etc/systemd/system/${SERVICE_NAME}.service <<EOF
[Unit]
Description=Swell-Norrna Manager
After=network.target

[Service]
Type=simple
ExecStart=${INSTALL_DIR}/norrna-manager --webport ${WEBPORT} --agentport ${AGENTPORT} --data ${DATA_DIR}
WorkingDirectory=${INSTALL_DIR}
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"
info "服务已启动"

# ── 防火墙 ─────────────────────────────────────────────────
if command -v ufw &>/dev/null; then
  ufw allow "$WEBPORT"/tcp 2>/dev/null || true
  ufw allow "$AGENTPORT"/tcp 2>/dev/null || true
  info "防火墙已放行端口 $WEBPORT 和 $AGENTPORT"
fi

# ── 完成 ───────────────────────────────────────────────────
IP=$(curl -s4 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
echo ""
echo "=================================================="
echo -e "${GREEN}✅ 安装完成！${NC}"
echo ""
echo -e "  面板地址:  ${CYAN}http://${IP}:${WEBPORT}${NC}"
echo "  Agent 端口: $AGENTPORT"
echo "  数据目录:   $DATA_DIR"
echo ""
echo "  查看日志:  journalctl -u $SERVICE_NAME -f"
echo "  重启服务:  systemctl restart $SERVICE_NAME"
echo "  更新:      bash <(curl -fsSL https://raw.githubusercontent.com/${REPO}/main/install.sh)"
echo "=================================================="
echo ""
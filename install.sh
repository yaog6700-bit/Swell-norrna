#!/bin/bash
# ============================================================
# Swell-Norrna 一键安装脚本
# 用法: bash <(curl -fsSL https://raw.githubusercontent.com/yaog6700-bit/Swell-norrna/main/install.sh)
# ============================================================
set -e

REPO="https://github.com/yaog6700-bit/Swell-norrna.git"
INSTALL_DIR="/opt/swell-norrna"
WEBPORT="${WEBPORT:-9000}"
AGENTPORT="${AGENTPORT:-9001}"

# ── 颜色输出 ──────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

echo ""
echo "=================================================="
echo "   Swell-Norrna 面板安装脚本"
echo "=================================================="
echo ""

# ── 检查 root ─────────────────────────────────────────────
[ "$EUID" -ne 0 ] && error "请使用 root 权限运行: sudo bash install.sh"

# ── 检查 Docker ───────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  warn "未检测到 Docker，正在安装..."
  curl -fsSL https://get.docker.com | bash
  systemctl enable docker
  systemctl start docker
  info "Docker 安装完成"
else
  info "Docker 已安装: $(docker --version)"
fi

if ! command -v docker &>/dev/null || ! docker compose version &>/dev/null 2>&1; then
  warn "正在安装 Docker Compose 插件..."
  apt-get update -qq && apt-get install -y -qq docker-compose-plugin
fi

# ── 检查 git ──────────────────────────────────────────────
if ! command -v git &>/dev/null; then
  warn "安装 git..."
  apt-get update -qq && apt-get install -y -qq git
fi

# ── 克隆或更新代码 ────────────────────────────────────────
if [ -d "$INSTALL_DIR/.git" ]; then
  info "检测到已有安装，正在更新..."
  git -C "$INSTALL_DIR" pull --rebase
else
  info "正在下载代码..."
  git clone "$REPO" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# ── 写入环境变量 ──────────────────────────────────────────
cat > .env <<EOF
WEBPORT=${WEBPORT}
AGENTPORT=${AGENTPORT}
TZ=Asia/Shanghai
EOF

# ── 开放防火墙 ────────────────────────────────────────────
if command -v ufw &>/dev/null; then
  ufw allow "$WEBPORT"/tcp 2>/dev/null || true
  ufw allow "$AGENTPORT"/tcp 2>/dev/null || true
  info "防火墙已放行端口 $WEBPORT 和 $AGENTPORT"
fi

# ── 构建并启动 ────────────────────────────────────────────
info "正在构建镜像（首次需要 5~10 分钟，请耐心等待）..."
docker compose up -d --build

# ── 完成提示 ──────────────────────────────────────────────
IP=$(curl -s4 ifconfig.me 2>/dev/null || echo "你的VPS-IP")
echo ""
echo "=================================================="
echo -e "${GREEN}✅ 安装完成！${NC}"
echo ""
echo "  面板地址: http://${IP}:${WEBPORT}"
echo "  Agent 端口: ${AGENTPORT}"
echo ""
echo "  查看日志: docker compose -f $INSTALL_DIR/docker-compose.yml logs -f"
echo "  停止服务: docker compose -f $INSTALL_DIR/docker-compose.yml down"
echo "  更新:     cd $INSTALL_DIR && git pull && docker compose up -d --build"
echo "=================================================="
echo ""
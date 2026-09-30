# Norrna

> 轻量级端口转发管理面板，基于 [Realm](https://github.com/zhboner/realm) 内核，支持多节点管理。

![Version](https://img.shields.io/github/v/release/yaog6700-bit/Swell-norrna)

---

## 功能

- 多节点 Agent 管理
- 端口转发规则配置
- 多用户 / 权限管理
- 访问密钥管理
- 流量统计
- 中英文界面

---

## 一键安装（推荐）

> 需要 Debian / Ubuntu，root 权限运行。

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/yaog6700-bit/Swell-norrna/main/install.sh)
```

安装完成后访问 `http://你的IP:9000`

**自定义端口：**
```bash
WEBPORT=8080 AGENTPORT=8081 bash <(curl -fsSL https://raw.githubusercontent.com/yaog6700-bit/Swell-norrna/main/install.sh)
```

**更新：**
```bash
bash <(curl -fsSL https://raw.githubusercontent.com/yaog6700-bit/Swell-norrna/main/install.sh)
```

---

## Docker 部署

```bash
mkdir -p /opt/swell-norrna && cd /opt/swell-norrna

cat > docker-compose.yml << 'EOF'
services:
  norrna:
    image: ghcr.io/yaog6700-bit/swell-norrna:latest
    container_name: swell-norrna
    restart: unless-stopped
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - ./data:/data
    environment:
      - TZ=Asia/Shanghai
EOF

docker compose up -d
```

---

## Agent 安装

在需要转发的远程节点运行：

```bash
curl -fL -o norrna https://github.com/yaog6700-bit/Swell-norrna/releases/latest/download/norrna-linux-amd64
chmod +x norrna
./norrna --manager 你的面板IP:9001 --token 你的TOKEN
```

---

## 常用命令

```bash
journalctl -u swell-norrna -f      # 查看日志
systemctl restart swell-norrna     # 重启
systemctl stop swell-norrna        # 停止
```

---

## 从源码构建

**环境：** Rust 1.82+、Node.js 22+、pnpm 9+

```bash
git clone https://github.com/yaog6700-bit/Swell-norrna.git
cd Swell-norrna

# 构建前端
cd web && pnpm install && pnpm build && cd ..

# 构建后端
cargo build --release -p norrna-manager

# 运行
./target/release/norrna-manager --webport 9000 --agentport 9001 --data-dir ./data
```

---

## 发布新版本

```bash
git tag v1.1.0
git push origin v1.1.0
```

GitHub Actions 自动编译并发布二进制 + Docker 镜像。

版本号规则：
- `v1.0.x` — Bug 修复
- `v1.x.0` — 新功能
- `vx.0.0` — 重大变更

---

## 默认端口

| 端口 | 用途 |
|------|------|
| 9000 | Web 管理面板 |
| 9001 | Agent 连接 |
---

## 卸载

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/yaog6700-bit/Swell-norrna/main/uninstall.sh)
```

会询问是否同时删除数据目录（转发规则、账号等），按需选择。

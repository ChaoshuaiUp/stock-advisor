#!/bin/bash
# ============================================================
# 股票决策助手 · 一键启动脚本
# ============================================================
#
# 使用方式：
#   chmod +x start.sh
#   ./start.sh
#
# 启动后：
#   - 代理服务: http://localhost:3001  (行情数据)
#   - 前端页面: http://localhost:3000  (主应用)
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     📈 股票决策助手 · 启动中...          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── 杀掉旧进程 ─────────────────────────────────────────────
echo -e "${YELLOW}▶ 清理旧进程...${NC}"
pkill -f "node.*proxy-server/index.js" 2>/dev/null || true
pkill -f "vite.*3000" 2>/dev/null || true
sleep 1

# ── 启动代理服务 ───────────────────────────────────────────
echo -e "${YELLOW}▶ 启动行情代理服务 (端口 3001)...${NC}"
cd "$SCRIPT_DIR/proxy-server"

# 检查依赖
if [ ! -d "node_modules" ]; then
  echo "  安装代理服务依赖..."
  npm install
fi

node index.js &
PROXY_PID=$!

# 等待代理就绪
echo -n "  等待代理服务就绪..."
for i in {1..10}; do
  sleep 1
  if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo -e " ${GREEN}✅ 已就绪${NC}"
    break
  fi
  echo -n "."
  if [ $i -eq 10 ]; then
    echo -e " ${RED}⚠️  超时，将以演示数据模式运行${NC}"
  fi
done

# ── 启动前端 ──────────────────────────────────────────────
echo -e "${YELLOW}▶ 启动前端开发服务器 (端口 3000)...${NC}"
cd "$SCRIPT_DIR"

# 检查依赖
if [ ! -d "node_modules" ]; then
  echo "  安装前端依赖..."
  npm install
fi

# 验证代理是否真的通了
echo ""
HEALTH=$(curl -s http://localhost:3001/api/health 2>/dev/null)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  echo -e "${GREEN}✅ 代理服务正常 → 实时行情已接入${NC}"
  
  # 测试行情接口
  QUOTE_TEST=$(curl -s "http://localhost:3001/api/quote/600519" 2>/dev/null)
  if echo "$QUOTE_TEST" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ 行情数据测试通过${NC}"
    # 提取茅台价格显示
    PRICE=$(echo "$QUOTE_TEST" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data'].get('600519',{}).get('price','N/A'))" 2>/dev/null || echo "N/A")
    echo -e "   贵州茅台(600519) 当前价: ${BLUE}¥${PRICE}${NC}"
  else
    echo -e "${YELLOW}⚠️  行情接口无响应，将使用演示数据${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  代理服务未响应，将以演示数据模式运行${NC}"
fi

echo ""
echo -e "${BLUE}══════════════════════════════════════════${NC}"
echo -e "${GREEN}  🚀 启动前端...按 Ctrl+C 停止所有服务${NC}"
echo -e "${BLUE}══════════════════════════════════════════${NC}"
echo ""
echo -e "  前端地址: ${BLUE}http://localhost:3000${NC}"
echo -e "  代理地址: ${BLUE}http://localhost:3001${NC}"
echo ""

# 前台运行 Vite（按 Ctrl+C 时会同时清理）
trap "echo ''; echo '停止所有服务...'; kill $PROXY_PID 2>/dev/null; exit 0" INT TERM

npx vite --port 3000 --host

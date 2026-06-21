#!/usr/bin/env bash
set -euo pipefail

# 观澜 (Guanlan) 一键部署脚本
# =========================================================
# 用法:
#   ./deploy.sh                         生产模式：构建前端 + 启动后端
#   ./deploy.sh --dev                   开发模式：前后端热重载
#   ./deploy.sh --port 8080             指定端口（仅生产模式）
#
# 在 Ubuntu 上首次运行前:
#   sudo apt install -y python3 python3-venv python3-pip nodejs npm build-essential
# =========================================================

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
DIST="$FRONTEND/dist"
LOG_DIR="$ROOT/logs"

# ── 颜色 ───────────────────────────────────────────────
CYAN='\e[36m'; GREEN='\e[32m'; YELLOW='\e[33m'; RED='\e[31m'; RESET='\e[0m'

log_step()  { echo -e "\n${CYAN}>> $*${RESET}"; }
log_ok()    { echo -e "  ${GREEN}*${RESET} $*"; }
log_warn()  { echo -e "  ${YELLOW}!${RESET} $*"; }
log_error() { echo -e "  ${RED}X${RESET} $*"; }

# ── 参数解析 ───────────────────────────────────────────
DEV_MODE=false; PORT=8000
while [[ $# -gt 0 ]]; do
    case "$1" in
        --dev|-d)      DEV_MODE=true; shift ;;
        --port|-p)     PORT="$2";       shift 2 ;;
        --help|-h)     echo "Usage: $0 [--dev] [--port PORT]"; exit 0 ;;
        *)             echo "Unknown: $1"; exit 1 ;;
    esac
done

# ── 检测系统 Python ────────────────────────────────────
detect_python() {
    if command -v python3 &>/dev/null; then
        PYTHON=python3
    elif command -v python &>/dev/null; then
        PYTHON=python
    else
        log_error "未找到 python / python3，请先安装 Python 3.12+"
        echo "  Ubuntu: sudo apt install -y python3 python3-venv python3-pip"
        exit 1
    fi

    # 验证版本 >= 3.12
    local ver
    ver=$("$PYTHON" --version 2>&1 | grep -oP '\d+\.\d+')
    local major="${ver%.*}"
    local minor="${ver#*.}"
    if [ "$major" -lt 3 ] || { [ "$major" -eq 3 ] && [ "$minor" -lt 12 ]; }; then
        log_error "需要 Python >= 3.12，当前版本: $("$PYTHON" --version 2>&1)"
        exit 1
    fi

    # 检查 venv 模块
    if ! "$PYTHON" -c "import venv" 2>/dev/null; then
        log_error "Python venv 模块不可用，请安装 python3-venv"
        echo "  Ubuntu: sudo apt install -y python3-venv"
        exit 1
    fi
}

check_cmd() {
    if ! command -v "$1" &>/dev/null; then
        log_error "未找到 $1，请先安装"
        case "$1" in
            node|npm)  echo "  Ubuntu: sudo apt install -y nodejs npm" ;;
        esac
        exit 1
    fi
}

cleanup() {
    echo ""
    log_step "停止服务..."
    local p
    for p in "${BACKEND_PID:-}" "${FRONTEND_PID:-}"; do
        [ -n "$p" ] && kill "$p" 2>/dev/null || true
    done
    wait 2>/dev/null || true
    log_ok "已停止"
}

# ── 环境检查 ────────────────────────────────────────────
log_step "环境检查"
detect_python
check_cmd node
check_cmd npm

log_ok "$("$PYTHON" --version 2>&1)"
log_ok "Node: $(node --version)"
log_ok "npm:  $(npm --version)"
log_ok "Root: $ROOT"

mkdir -p "$LOG_DIR"

# ── 后端初始化 ──────────────────────────────────────────
log_step "安装后端依赖"
pushd "$BACKEND" >/dev/null

if [ ! -d ".venv" ]; then
    "$PYTHON" -m venv .venv
    log_ok "虚拟环境已创建"
fi

# 确定 venv 中的 Python 路径
# 只检测 python 可执行文件，pip/uvicorn 用 python -m 调用即可
VENV_PY=""
for candidate in ".venv/bin/python3" ".venv/bin/python" ".venv/Scripts/python"; do
    if [ -f "$candidate" ]; then
        VENV_PY="$BACKEND/$candidate"
        break
    fi
done

if [ -z "$VENV_PY" ]; then
    log_error "无法找到虚拟环境中的 Python"
    exit 1
fi

# 用 python -m pip 安装，不依赖 pip/pip3 二进制名
"$VENV_PY" -m pip install -q -r requirements.txt || log_warn "pip 安装可能有警告"

if [ ! -f ".env" ]; then
    cp ".env.example" ".env"
    log_ok ".env 文件已创建（使用 SQLite 默认配置）"
fi
popd >/dev/null

# ── 前端初始化 ──────────────────────────────────────────
log_step "安装前端依赖"
pushd "$FRONTEND" >/dev/null
npm install --silent
popd >/dev/null

# ── 模式分支 ────────────────────────────────────────────
if [ "$DEV_MODE" = false ]; then
    # ── Production Mode ────────────────────────────────
    log_step "构建前端"
    pushd "$FRONTEND" >/dev/null
    npm run build
    popd >/dev/null

    log_step "初始化数据库（种子数据）"
    pushd "$BACKEND" >/dev/null
    "$VENV_PY" seed.py
    log_ok "数据库初始化完成"
    popd >/dev/null

    log_step "启动服务 → http://localhost:$PORT"
    echo "  API:   http://localhost:$PORT/api/v1/health"
    echo "  UI:    http://localhost:$PORT"
    echo "  Logs:  $LOG_DIR/uvicorn.log"

    export FRONTEND_DIST="$DIST"
    pushd "$BACKEND" >/dev/null
    exec "$VENV_PY" -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --log-level info
    popd >/dev/null

else
    # ── Dev Mode ───────────────────────────────────────
    log_step "启动开发服务器"
    trap cleanup EXIT INT TERM

    pushd "$BACKEND" >/dev/null
    "$VENV_PY" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload >> "$LOG_DIR/uvicorn.log" 2>&1 &
    BACKEND_PID=$!
    popd >/dev/null

    pushd "$FRONTEND" >/dev/null
    npm run dev >> "$LOG_DIR/vite.log" 2>&1 &
    FRONTEND_PID=$!
    popd >/dev/null

    echo "  Backend: http://localhost:8000/api/v1/health"
    echo "  Frontend: http://localhost:5173"
    echo "  Logs:  $LOG_DIR/*.log"
    echo "按 Ctrl+C 停止所有服务..."

    while true; do
        sleep 3
        if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
            log_error "后端进程已退出"
            tail -5 "$LOG_DIR/uvicorn.log" 2>/dev/null || true
            exit 1
        fi
        if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
            log_error "前端进程已退出"
            tail -5 "$LOG_DIR/vite.log" 2>/dev/null || true
            exit 1
        fi
    done
fi

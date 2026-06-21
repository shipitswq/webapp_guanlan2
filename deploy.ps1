<#
.SYNOPSIS
  观澜 (Guanlan) 前后端一键部署脚本
.DESCRIPTION
  支持两种模式:
    .\deploy.ps1          → 生产模式：构建前端 + 启动后端（提供 API + 前端静态文件）
    .\deploy.ps1 -Dev     → 开发模式：同时启动前端 Vite 开发服务器 + 后端 Uvicorn
.PARAMETER Dev
  以开发模式启动（前后端热重载）
.PARAMETER Port
  生产模式下后端监听端口（默认 8000）
#>

param(
  [switch]$Dev,
  [int]$Port = 8000
)

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$Dist = Join-Path $Frontend "dist"
$LogDir = Join-Path $Root "logs"
$VenvPy = Join-Path $Backend ".venv\Scripts\python"
$VenvPip = Join-Path $Backend ".venv\Scripts\pip"
$VenvUvi = Join-Path $Backend ".venv\Scripts\uvicorn"

function Write-Step($msg) { Write-Host "`n>> $msg" -ForegroundColor Cyan }

function Test-Command($cmd) {
  try { Get-Command $cmd -ErrorAction Stop | Out-Null; return $true }
  catch { return $false }
}

# ── Pre-check ───────────────────────────────────────────────────────
Write-Step "环境检查"
if (-not (Test-Command "node")) { Write-Host "[ERROR] 未找到 node，请先安装 Node.js" -ForegroundColor Red; exit 1 }
if (-not (Test-Command "python")) {
  if (Test-Command "python3") { Set-Alias python python3 }
  else { Write-Host "[ERROR] 未找到 python，请先安装 Python 3.12+" -ForegroundColor Red; exit 1 }
}
Write-Host "  Node: $(node --version)"
Write-Host "  Python: $(python --version 2>&1)"
Write-Host "  Root: $Root"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

# ── Backend ─────────────────────────────────────────────────────────
Write-Step "安装后端依赖"
Push-Location $Backend
if (-not (Test-Path ".venv")) { python -m venv .venv; Write-Host " 虚拟环境已创建" }
& $VenvPip install -q -r requirements.txt
if ($LASTEXITCODE -ne 0) { Write-Host "[WARN] pip 安装可能有警告" -ForegroundColor Yellow }

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host " .env 文件已创建"
}
Pop-Location

# ── Frontend ────────────────────────────────────────────────────────
Write-Step "安装前端依赖"
Push-Location $Frontend
npm install --silent 2>$null
Pop-Location

if (-not $Dev) {
  # ── Production Mode ──────────────────────────────────────────────
  Write-Step "构建前端"
  Push-Location $Frontend
  npm run build
  if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] 构建失败" -ForegroundColor Red; exit 1 }
  Pop-Location

  Write-Step "初始化数据库（种子数据）"
  Push-Location $Backend
  & $VenvPy seed.py
  Pop-Location

  Write-Step "启动服务 → http://localhost:$Port"
  Write-Host "  API:   http://localhost:$Port/api/v1/health"
  Write-Host "  前端:  http://localhost:$Port"
  Write-Host "  日志:  $LogDir\uvicorn.log`n"

  $env:FRONTEND_DIST = $Dist
  Push-Location $Backend
  & $VenvUvi app.main:app --host 0.0.0.0 --port $Port --log-level info
  Pop-Location

} else {
  # ── Dev Mode ─────────────────────────────────────────────────────
  Write-Step "启动开发服务器"

  $BackendJob = Start-Job -Name "guanlan-backend" -ScriptBlock {
    param($b, $l)
    Set-Location $b
    $u = Join-Path $b ".venv\Scripts\uvicorn"
    & $u app.main:app --host 0.0.0.0 --port 8000 --reload *>> (Join-Path $l "uvicorn.log")
  } -ArgumentList $Backend, $LogDir

  $FrontendJob = Start-Job -Name "guanlan-frontend" -ScriptBlock {
    param($f, $l)
    Set-Location $f
    npm run dev *>> (Join-Path $l "vite.log")
  } -ArgumentList $Frontend, $LogDir

  Write-Host "  后端: http://localhost:8000/api/v1/health"
  Write-Host "  前端: http://localhost:5173"
  Write-Host "  日志: $LogDir\*.log`n"
  Write-Host "按 Ctrl+C 停止所有服务..."

  try {
    while ($true) {
      Start-Sleep -Seconds 3
      if ($BackendJob.State -eq "Failed") { Write-Host "[ERROR] 后端启动失败" -ForegroundColor Red; Receive-Job $BackendJob; break }
      if ($FrontendJob.State -eq "Failed") { Write-Host "[ERROR] 前端启动失败" -ForegroundColor Red; Receive-Job $FrontendJob; break }
    }
  }
  finally {
    Write-Step "停止服务..."
    $BackendJob | Stop-Job -PassThru | Remove-Job
    $FrontendJob | Stop-Job -PassThru | Remove-Job
  }
}

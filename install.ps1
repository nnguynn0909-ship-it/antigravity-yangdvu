<#
.SYNOPSIS
    Script cài đặt tự động Antigravity Cockpit (Bản quyền YangDvu) cho Antigravity IDE & VS Code.
.DESCRIPTION
    Tự động tìm kiếm bản phát hành mới nhất từ GitHub, tải về file .vsix và cài đặt trực tiếp.
#>

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   🚀 CAI DAT ANTIGRAVITY COCKPIT (YANGDVU) TU DONG 🚀   " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$repo = "nnguynn0909-ship-it/antigravity-yangdvu"
$apiUrl = "https://api.github.com/repos/$repo/releases/latest"

try {
    Write-Host "[1/3] Dang kiem tra ban phat hanh moi nhat tren GitHub..." -ForegroundColor Cyan
    $headers = @{ "User-Agent" = "Antigravity-YangDvu-Installer" }
    $release = Invoke-RestMethod -Uri $apiUrl -Headers $headers -Method Get
    $tag = $release.tag_name

    $asset = $release.assets | Where-Object { $_.name -like "*.vsix" } | Select-Object -First 1
    if (-not $asset) {
        throw "Khong tim thay goi cai dat .vsix trong ban phat hanh $tag!"
    }

    Write-Host "      -> Tim thay phien ban: $tag ($($asset.name))" -ForegroundColor Green

    $destPath = Join-Path $env:TEMP $asset.name
    Write-Host "[2/3] Dang tai goi cai dat ve thu muc tam..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $destPath -UseBasicParsing
    Write-Host "      -> Tai hoan tat: $destPath" -ForegroundColor Green

    Write-Host "[3/3] Dang xac dinh trinh bien tap (IDE) de cai dat..." -ForegroundColor Cyan
    $cli = $null

    # 1. Kiem tra Antigravity IDE trong PATH
    if (Get-Command 'antigravity-ide' -ErrorAction SilentlyContinue) {
        $cli = 'antigravity-ide'
    }
    # 2. Kiem tra Antigravity IDE trong thu muc mac dinh
    elseif (Test-Path "$env:LOCALAPPDATA\Programs\Antigravity IDE\bin\antigravity-ide.cmd") {
        $cli = "$env:LOCALAPPDATA\Programs\Antigravity IDE\bin\antigravity-ide.cmd"
    }
    # 3. Kiem tra VS Code trong PATH
    elseif (Get-Command 'code' -ErrorAction SilentlyContinue) {
        $cli = 'code'
    }
    # 4. Kiem tra VS Code trong thu muc mac dinh
    elseif (Test-Path "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin\code.cmd") {
        $cli = "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin\code.cmd"
    }

    if ($cli) {
        Write-Host "      -> Phat hien IDE: $cli" -ForegroundColor DarkCyan
        Write-Host "      -> Dang cai dat tien ich..." -ForegroundColor Cyan
        & $cli --install-extension $destPath --force
        Write-Host ""
        Write-Host "==========================================================" -ForegroundColor Green
        Write-Host "   🎉 CHUC MUNG! CAI DAT THANH CONG TIEN ICH YANGDVU!    " -ForegroundColor Green
        Write-Host "   Vui long mo hoac khoi dong lai Antigravity/VS Code!   " -ForegroundColor Yellow
        Write-Host "==========================================================" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "      [!] Khong tim thay lenh CLI cua Antigravity IDE hoac VS Code." -ForegroundColor Yellow
        Write-Host "      -> Da tai file .vsix ve thu muc tam. Dang mo thu muc chua file..." -ForegroundColor Cyan
        explorer.exe /select,$destPath
        Write-Host "      -> Ban chi can keo file vua hien thi tha truc tiep vao cua so IDE de cai!" -ForegroundColor Yellow
    }

} catch {
    Write-Host ""
    Write-Host "[!] CO LOI XAY RA: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

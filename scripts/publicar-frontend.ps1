#requires -Version 5.1
<#
  Publica o frontend Next.js no Azure App Service (educapilot-web).

  IMPORTANTE -- por que a variavel e definida aqui e nao so no .env.production:
  no Next.js, a ordem de precedencia e process.env > .env.production.local >
  .env.local > .env.production > .env. Como o .env.local (usado no dia a dia para
  desenvolvimento) aponta para https://localhost:7141, ele VENCE o .env.production
  num build feito na maquina do desenvolvedor. O resultado e um site publicado que
  tenta falar com o localhost de quem abriu a pagina -- e falha com "failed to
  fetch", sem nenhum erro no build. Definir aqui (process.env) e o unico jeito de
  garantir que ganha.
#>

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$apiUrl   = "https://educapilot-api.azurewebsites.net"
$zipPath  = "$env:TEMP\educapilot-frontend-deploy.zip"

Push-Location $repoRoot
try {
    Write-Host "==> Build (API = $apiUrl)..." -ForegroundColor Cyan
    $env:NEXT_PUBLIC_API_BASE_URL = $apiUrl
    $env:NODE_ENV = "production"

    if (Test-Path ".next") { Remove-Item ".next" -Recurse -Force }

    npx next build
    if ($LASTEXITCODE -ne 0) { throw "next build falhou." }

    Write-Host "==> Conferindo se a URL correta entrou no bundle..." -ForegroundColor Cyan
    $temLocalhost = Select-String -Path ".next\standalone\.next\server\**\*.js" -Pattern "localhost:7141" -SimpleMatch -Quiet -ErrorAction SilentlyContinue
    if ($temLocalhost) {
        throw "O bundle ainda contem localhost:7141. Abortando para nao publicar um site quebrado."
    }

    Write-Host "==> Montando o pacote standalone..." -ForegroundColor Cyan
    # O Next nao copia public/ nem .next/static para o standalone -- sem isso, o site
    # sobe sem CSS, sem imagens e sem os chunks do cliente.
    Copy-Item "public" ".next\standalone\" -Recurse -Force -ErrorAction SilentlyContinue
    New-Item -ItemType Directory -Force ".next\standalone\.next" | Out-Null
    Copy-Item ".next\static" ".next\standalone\.next\" -Recurse -Force

    Write-Host "==> Empacotando..." -ForegroundColor Cyan
    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

    $source = (Resolve-Path ".next\standalone").Path
    $zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
    foreach ($file in Get-ChildItem -Path $source -Recurse -File -Force) {
        # Barras normais: o Kudu roda em Linux e nao reconstroi subpastas a partir de "\".
        $entry = $file.FullName.Substring($source.Length + 1).Replace('\', '/')
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $entry, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
    $zip.Dispose()

    Write-Host "==> Publicando no Azure..." -ForegroundColor Cyan
    az webapp deployment source config-zip `
        --resource-group rg-educapilot-prod `
        --name educapilot-web `
        --src $zipPath | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Deploy falhou." }

    Write-Host ""
    Write-Host "Publicado: https://educapilot-web.azurewebsites.net" -ForegroundColor Green
}
finally {
    Pop-Location
    Remove-Item Env:\NEXT_PUBLIC_API_BASE_URL -ErrorAction SilentlyContinue
    Remove-Item Env:\NODE_ENV -ErrorAction SilentlyContinue
}

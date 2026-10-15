# Gera o pacote do Google Play (.aab) assinado com a chave de upload.
# Uso (PowerShell, dentro de educapilot-web/mobile):  .\gerar-aab.ps1
# A senha é pedida aqui, fica só nesta janela e some quando ela fecha. Nada é gravado em arquivo.

$ErrorActionPreference = "Stop"

$chave = Join-Path $env:USERPROFILE ".educapilot-segredos\educapilot-upload.jks"
if (-not (Test-Path $chave)) { throw "Chave de upload não encontrada em $chave" }

$sdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
$jbr = "C:\Program Files\Android\Android Studio\jbr"
if (-not (Test-Path $jbr)) { throw "Android Studio não encontrado em $jbr" }

$segura = Read-Host "Senha da chave de upload" -AsSecureString
$ponteiro = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($segura)
try {
  $env:EDUCAPILOT_KEYSTORE_SENHA = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ponteiro)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ponteiro)
}
$env:EDUCAPILOT_KEYSTORE = $chave
$env:EDUCAPILOT_KEY_ALIAS = "educapilot"
$env:JAVA_HOME = $jbr
$env:ANDROID_HOME = $sdk
$env:Path = "$jbr\bin;$env:Path"

Push-Location (Join-Path $PSScriptRoot "android")
try {
  .\gradlew.bat bundleRelease --no-daemon
  if ($LASTEXITCODE -ne 0) { throw "O build falhou (código $LASTEXITCODE)." }
} finally {
  Pop-Location
  Remove-Item Env:\EDUCAPILOT_KEYSTORE_SENHA -ErrorAction SilentlyContinue
}

$aab = Join-Path $PSScriptRoot "android\app\build\outputs\bundle\release\app-release.aab"
Write-Host ""
Write-Host "Pronto: $aab" -ForegroundColor Green
Write-Host "Envie este arquivo no Play Console (Teste fechado > Criar versão)."

param(
    [string]$KeystorePath = "$PSScriptRoot\..\keystore\followeight-upload.jks",
    [string]$PropertiesPath = "$PSScriptRoot\..\android\keystore.properties",
    [string]$Alias = "followeight-upload"
)

$ErrorActionPreference = "Stop"
$Keytool = "C:\Program Files\Amazon Corretto\jdk21.0.2_13\bin\keytool.exe"
if (-not (Test-Path $Keytool)) {
    $Keytool = "keytool"
}

$ksDir = Split-Path -Parent $KeystorePath
if (-not (Test-Path $ksDir)) {
    New-Item -ItemType Directory -Path $ksDir -Force | Out-Null
}

if (-not (Test-Path $KeystorePath)) {
    $bytes = New-Object byte[] 24
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $pw = [Convert]::ToBase64String($bytes) -replace '[+/=]', 'x'
    & $Keytool -genkeypair -v `
        -keystore $KeystorePath `
        -storetype JKS `
        -alias $Alias `
        -keyalg RSA `
        -keysize 2048 `
        -validity 10000 `
        -storepass $pw `
        -keypass $pw `
        -dname "CN=FolloWeight, OU=Mobile, O=Maison Mercier, L=Brussels, C=BE"

    $props = @"
storeFile=../keystore/followeight-upload.jks
storePassword=$pw
keyAlias=$Alias
keyPassword=$pw
"@
    Set-Content -Path $PropertiesPath -Value $props -Encoding Ascii
    Write-Output "Keystore et keystore.properties créés (non versionnés dans Git)."
} else {
    Write-Output "Keystore déjà présent : $KeystorePath"
}

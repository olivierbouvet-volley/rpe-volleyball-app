# Script de deploiement complet
# Lance le build React + deploiement Firebase en une seule commande

Write-Host "Deploiement complet de l'application RPE Volleyball" -ForegroundColor Cyan
Write-Host ""

# Etape 1: Build de l'application React
Write-Host "Build de l'application React (Planning Avance)..." -ForegroundColor Yellow
Set-Location "projet Manus"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors du build React" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Write-Host "Build React termine" -ForegroundColor Green
Write-Host ""

# Etape 2: Copie des fichiers buildes
Write-Host "Copie des fichiers dans public/manus/..." -ForegroundColor Yellow
Copy-Item -Path "dist\*" -Destination "..\public\manus\" -Recurse -Force
Write-Host "Fichiers copies" -ForegroundColor Green
Write-Host ""

# Retour au dossier racine
Set-Location ..

# Etape 3: Deploiement Firebase
Write-Host "Deploiement sur Firebase Hosting..." -ForegroundColor Yellow
firebase deploy --only hosting
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors du deploiement Firebase" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Deploiement complet reussi!" -ForegroundColor Green
Write-Host "Application disponible sur: https://rpe-volleyball-sable.web.app" -ForegroundColor Cyan

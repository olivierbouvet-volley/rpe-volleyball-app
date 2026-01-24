#!/usr/bin/env pwsh
# Script pour mettre à jour Manus dans Firebase
# Usage: .\update-manus.ps1

Write-Host "`n🎬 Mise à jour de Manus..." -ForegroundColor Cyan

# 1. Builder l'application React
Write-Host "`n1️⃣ Build de l'application React..." -ForegroundColor Yellow
Set-Location "projet Manus"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors du build" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..

# 2. Supprimer l'ancien dossier
Write-Host "`n2️⃣ Nettoyage de l'ancien build..." -ForegroundColor Yellow
if (Test-Path "public\manus") {
    Remove-Item -Recurse -Force "public\manus"
}

# 3. Copier le nouveau build
Write-Host "`n3️⃣ Copie des fichiers..." -ForegroundColor Yellow
Copy-Item -Recurse "projet Manus\dist" "public\manus"

Write-Host "`n✅ Manus mis à jour avec succès !" -ForegroundColor Green
Write-Host "`nPour déployer en production :" -ForegroundColor Cyan
Write-Host "  firebase deploy --only hosting" -ForegroundColor White
Write-Host ""

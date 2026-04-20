#!/usr/bin/env bash
set -euo pipefail

# Vérifie que tous les fichiers d'instructions d'agents déclarent la règle stricte
# recherchée : 'Commence toujours tes réponses par "Réponse en français"'

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FAIL=0

echo "Vérification des fichiers d'instructions d'agents..."

FILES=(
  "$ROOT_DIR/.github/copilot-instructions.md"
  "$ROOT_DIR/.github/copilot-instructions/*.md"
)

for pattern in "${FILES[@]}"; do
  for file in $pattern; do
    [ -e "$file" ] || continue
    if ! grep -Fq 'Commence toujours tes réponses par "Réponse en français"' "$file"; then
      echo "ERREUR: la règle de langue stricte est absente dans : $file"
      FAIL=1
    fi
  done
done

if [ "$FAIL" -ne 0 ]; then
  echo "Une ou plusieurs fichiers d'instructions d'agents ne respectent pas la règle de préfixe de langue."
  echo "Ajoute la ligne : Commence toujours tes réponses par \"Réponse en français\""
  exit 2
fi

echo "OK — tous les fichiers d'instruction d'agents déclarent la règle de langue stricte."
exit 0

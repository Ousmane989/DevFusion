#!/usr/bin/env bash
# Marsa — sauvegarde automatique sur GitHub après chaque modification.
# Déclenché par le hook "Stop" de Claude Code : commit + push si (et seulement
# si) l'arbre de travail contient des changements. No-op sinon.
set -uo pipefail

root="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
cd "$root" || exit 0

# Rien à sauvegarder ? on sort silencieusement.
if [ -z "$(git status --porcelain)" ]; then
  exit 0
fi

branch="$(git rev-parse --abbrev-ref HEAD)"

git add -A
git commit -q -m "chore: sauvegarde automatique ($(date '+%Y-%m-%d %H:%M'))" || exit 0

# Push avec quelques tentatives (backoff simple) en cas d'aléa réseau.
delay=2
for _ in 1 2 3 4; do
  if git push -q origin "$branch" 2>/dev/null; then
    printf '{"systemMessage": "Sauvegardé sur GitHub (%s)"}\n' "$branch"
    exit 0
  fi
  sleep "$delay"
  delay=$((delay * 2))
done

printf '{"systemMessage": "Commit local effectué — push GitHub à relancer (réseau)."}\n'
exit 0

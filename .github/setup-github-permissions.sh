#!/bin/bash

# Script para configurar permisos de GitHub Actions
# Uso: ./setup-github-permissions.sh

set -e

REPO="jpalenz77/gamehub_micro"

echo "🔧 Configurando permisos de GitHub Actions para $REPO"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI no está instalado"
    echo "📥 Instálalo desde: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "🔐 Necesitas autenticarte con GitHub"
    gh auth login
fi

echo "✅ GitHub CLI autenticado"
echo ""

# Set workflow permissions
echo "📝 Configurando permisos de workflow..."
gh api -X PATCH "/repos/$REPO" \
  -f default_workflow_permissions='write' \
  -F allow_actions_create_pull_requests=true

if [ $? -eq 0 ]; then
    echo "✅ Permisos de workflow configurados:"
    echo "   - Read and write permissions: ✅"
    echo "   - Allow Actions to create PRs: ✅"
else
    echo "❌ Error al configurar permisos"
    echo "⚠️  Configúralos manualmente:"
    echo "   1. Ve a: https://github.com/$REPO/settings/actions"
    echo "   2. Scroll hasta 'Workflow permissions'"
    echo "   3. Selecciona 'Read and write permissions'"
    echo "   4. Marca 'Allow GitHub Actions to create and approve pull requests'"
    exit 1
fi

echo ""
echo "🎉 Configuración completada!"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Los workflows ahora pueden hacer push a GHCR"
echo "   2. Verifica en: https://github.com/$REPO/settings/actions"
echo "   3. Ejecuta un workflow para probar: git push origin kubernetes-with-hpa"
echo ""
echo "📦 Las imágenes se publicarán en:"
echo "   https://github.com/$REPO/pkgs/container/gamehub-frontend-production"
echo "   https://github.com/$REPO/pkgs/container/gamehub-cdn"
echo "   https://github.com/$REPO/pkgs/container/gamehub-auth-service"
echo "   https://github.com/$REPO/pkgs/container/gamehub-score-service"
echo "   https://github.com/$REPO/pkgs/container/gamehub-ranking-service"

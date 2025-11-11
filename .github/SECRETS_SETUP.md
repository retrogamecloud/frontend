# GitHub Secrets Configuration Guide

Esta guía explica cómo configurar los secrets necesarios para que los workflows de CI/CD funcionen correctamente.

## 📋 Secrets Requeridos

### Para CI/CD Básico (GitHub Container Registry)

#### `GITHUB_TOKEN` (Automático)
- **Descripción**: Token automático provisto por GitHub Actions
- **Uso**: Autenticación con GitHub Container Registry (ghcr.io)
- **Configuración**: No requiere configuración manual, se genera automáticamente
- **Permisos necesarios**: 
  - Ve a: Settings > Actions > General > Workflow permissions
  - Selecciona: "Read and write permissions"
  - Marca: "Allow GitHub Actions to create and approve pull requests"

### Para Deployment a AWS EKS (Opcional)

#### `AWS_ACCESS_KEY_ID`
- **Descripción**: AWS Access Key ID para acceso programático
- **Cómo obtenerlo**:
  ```bash
  # Crear usuario IAM con permisos de EKS
  aws iam create-user --user-name github-actions-gamehub
  
  # Crear access key
  aws iam create-access-key --user-name github-actions-gamehub
  ```
- **Permisos necesarios**:
  - `eks:DescribeCluster`
  - `eks:ListClusters`
  - `ecr:GetAuthorizationToken`
  - `ecr:BatchCheckLayerAvailability`
  - `ecr:PutImage`

#### `AWS_SECRET_ACCESS_KEY`
- **Descripción**: AWS Secret Access Key correspondiente
- **Obtención**: Se genera junto con el Access Key ID

#### `AWS_REGION`
- **Descripción**: Región de AWS donde está el cluster EKS
- **Ejemplo**: `us-east-1`, `eu-west-1`
- **Default**: `us-east-1`

#### `EKS_CLUSTER_NAME`
- **Descripción**: Nombre del cluster EKS
- **Ejemplo**: `gamehub-production`

### Para Docker Hub (Alternativa a GHCR)

#### `DOCKERHUB_USERNAME`
- **Descripción**: Usuario de Docker Hub
- **Uso**: Push de imágenes a Docker Hub en lugar de GHCR

#### `DOCKERHUB_TOKEN`
- **Descripción**: Token de acceso de Docker Hub
- **Cómo crearlo**:
  1. Login en Docker Hub
  2. Account Settings > Security > New Access Token
  3. Nombre: "github-actions-gamehub"
  4. Permisos: Read, Write, Delete

## 🔧 Cómo Añadir Secrets

### Via GitHub Web UI

1. Ve a tu repositorio en GitHub
2. Click en **Settings** (arriba derecha)
3. En el menú izquierdo: **Secrets and variables** > **Actions**
4. Click **New repository secret**
5. Añade:
   - **Name**: Nombre del secret (ej: `AWS_ACCESS_KEY_ID`)
   - **Value**: El valor del secret
6. Click **Add secret**

### Via GitHub CLI

```bash
# Instalar GitHub CLI si no lo tienes
# https://cli.github.com/

# Login
gh auth login

# Añadir secrets
gh secret set AWS_ACCESS_KEY_ID -b"AKIA..." -R jpalenz77/gamehub_micro
gh secret set AWS_SECRET_ACCESS_KEY -b"wJalr..." -R jpalenz77/gamehub_micro
gh secret set AWS_REGION -b"us-east-1" -R jpalenz77/gamehub_micro
gh secret set EKS_CLUSTER_NAME -b"gamehub-prod" -R jpalenz77/gamehub_micro
```

### Verificar Secrets

```bash
# Listar secrets (no muestra valores)
gh secret list -R jpalenz77/gamehub_micro
```

## 🎯 Configuración por Environment

Para producción segura, usa **Environments**:

1. Settings > Environments > **New environment**
2. Nombre: `production`
3. Configura:
   - **Required reviewers**: Personas que deben aprobar
   - **Wait timer**: Espera antes de deploy
   - **Deployment branches**: Solo `main`
4. Añade secrets específicos del environment

### Environment Secrets vs Repository Secrets

```yaml
# En el workflow
jobs:
  deploy:
    environment: production  # Usa secrets del environment 'production'
    steps:
      - name: Deploy
        env:
          API_KEY: ${{ secrets.PROD_API_KEY }}  # Secret del environment
```

## 📊 Status Check - Permisos de GITHUB_TOKEN

### Verificar permisos actuales:

1. Settings > Actions > General
2. Scroll hasta "Workflow permissions"
3. Debe estar en: **Read and write permissions**

### Si los workflows fallan con "denied: permission denied":

```yaml
# Añadir al workflow
permissions:
  contents: read
  packages: write
  pull-requests: write
```

## 🔒 Mejores Prácticas de Seguridad

### 1. Rotación de Secrets
```bash
# Rotar cada 90 días
aws iam create-access-key --user-name github-actions-gamehub
# Actualizar en GitHub
# Eliminar el antiguo
aws iam delete-access-key --access-key-id AKIA... --user-name github-actions-gamehub
```

### 2. Principio de Mínimo Privilegio
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "eks:DescribeCluster",
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    }
  ]
}
```

### 3. Audit Logs
```bash
# Ver uso de secrets
gh api /repos/jpalenz77/gamehub_micro/actions/runs | jq '.workflow_runs[] | {id, name, status, conclusion}'
```

### 4. Secrets en Local (Para Testing)
```bash
# NUNCA commits secrets
# Usa .env y añádelo a .gitignore
cat >> .env << EOF
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalr...
EOF

# Añadir a .gitignore
echo ".env" >> .gitignore
```

## 🚀 Testing de Secrets

### Script de Verificación

```bash
#!/bin/bash
# test-secrets.sh

echo "🔍 Verificando configuración de secrets..."

# Check GitHub token permissions
echo "1. GITHUB_TOKEN permissions:"
gh api /repos/jpalenz77/gamehub_micro -q '.permissions'

# Check secrets existence (no muestra valores)
echo ""
echo "2. Secrets configurados:"
gh secret list -R jpalenz77/gamehub_micro

# Check AWS credentials (si están configurados)
if gh secret list -R jpalenz77/gamehub_micro | grep -q "AWS_ACCESS_KEY_ID"; then
    echo ""
    echo "3. AWS secrets detectados ✅"
    echo "   Verifica manualmente que funcionan con:"
    echo "   aws sts get-caller-identity"
fi

echo ""
echo "✅ Verificación completada"
```

## 📚 Recursos

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [GHCR Authentication](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

## ❓ Troubleshooting

### Error: "denied: installation not allowed to Create organization package"

**Solución**:
1. Settings > Actions > General > Workflow permissions
2. Cambiar a "Read and write permissions"
3. Re-ejecutar el workflow

### Error: "bad credentials"

**Solución**:
1. Verificar que el secret existe: `gh secret list`
2. Verificar el nombre exacto (case-sensitive)
3. Re-crear el secret:
   ```bash
   gh secret delete NOMBRE_SECRET
   gh secret set NOMBRE_SECRET -b"valor"
   ```

### Error: "The requested URL returned error: 403"

**Solución**:
1. Verificar permisos del token
2. Para GHCR: Settings > Packages > Package settings > Manage Actions access
3. Añadir el repositorio con "Write" access

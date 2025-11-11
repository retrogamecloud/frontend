# 🚀 GameHub v2.1 - Guía Completa de Despliegue

## 📋 Tabla de Contenidos
- [Requisitos Previos](#requisitos-previos)
- [Paso 1: Instalación de Minikube](#paso-1-instalación-de-minikube)
- [Paso 2: Configuración de Minikube](#paso-2-configuración-de-minikube)
- [Paso 3: Configuración de Secrets](#paso-3-configuración-de-secrets)
- [Paso 4: Instalación del Stack de Monitorización](#paso-4-instalación-del-stack-de-monitorización)
- [Paso 5: Despliegue de Servicios GameHub](#paso-5-despliegue-de-servicios-gamehub)
- [Paso 6: Configuración de Dashboards y Alertas](#paso-6-configuración-de-dashboards-y-alertas)
- [Paso 7: Port-Forwards para Acceso Local](#paso-7-port-forwards-para-acceso-local)
- [Verificación y Troubleshooting](#verificación-y-troubleshooting)
- [Mantenimiento](#mantenimiento)

---

## Requisitos Previos

### Software Necesario
- **Docker Desktop** o **Docker Engine** instalado y funcionando
- **kubectl** instalado y configurado
- **Minikube** v1.30 o superior
- **Helm** v3.x instalado
- **Git** para clonar el repositorio
- Al menos **8GB de RAM** disponibles para Minikube
- Al menos **4 CPU cores** disponibles

### Verificar Instalaciones
```bash
docker --version
kubectl version --client
minikube version
helm version
```

### Requisitos de Red
- Puerto 3000 (Grafana)
- Puerto 8080 (CDN)
- Puerto 8081 (Frontend)
- Puerto 8083 (CDN para juegos)
- Puerto 8000-8001 (Kong)
- Puerto 9090 (Prometheus)
- Puerto 9093 (AlertManager)

### Credenciales Requeridas
- **GitHub Personal Access Token** con permisos `read:packages` para GHCR
- **Slack Webhook URL** (opcional, para notificaciones)

---

## Paso 1: Instalación de Minikube

### En Linux/WSL2
```bash
# Descargar Minikube
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64

# Instalar
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# Verificar instalación
minikube version
```

### En macOS
```bash
# Con Homebrew
brew install minikube

# Verificar instalación
minikube version
```

### En Windows
```powershell
# Con Chocolatey
choco install minikube

# O descargar el instalador desde:
# https://minikube.sigs.k8s.io/docs/start/
```

---

## Paso 2: Configuración de Minikube

### 2.1 Eliminar Cluster Existente (si existe)
```bash
# Verificar estado actual
minikube status

# Eliminar cluster existente
minikube delete
```

### 2.2 Iniciar Minikube con Configuración Optimizada
```bash
# Iniciar con 8GB RAM y 4 CPUs (recomendado para stack completo)
minikube start --memory=8192 --cpus=4 --driver=docker

# Verificar que está corriendo
minikube status
```

**Salida esperada:**
```
minikube
type: Control Plane
host: Running
kubelet: Running
apiserver: Running
kubeconfig: Configured
```

### 2.3 Habilitar Addons Necesarios
```bash
# Metrics Server (para kubectl top)
minikube addons enable metrics-server

# Ingress Controller
minikube addons enable ingress

# Verificar addons habilitados
minikube addons list | grep enabled
```

### 2.4 Verificar Contexto de kubectl
```bash
# Verificar que kubectl apunta a minikube
kubectl config current-context
# Debe mostrar: minikube

# Ver información del cluster
kubectl cluster-info
```

---

## Paso 3: Configuración de Secrets

### 3.1 Crear Namespace GameHub
```bash
kubectl create namespace gamehub
```

### 3.2 Obtener GitHub Personal Access Token

1. Ve a: https://github.com/settings/tokens
2. Click en **"Generate new token (classic)"**
3. Nombre del token: `gamehub-ghcr-access`
4. Selecciona el scope: **`read:packages`**
5. Click en **"Generate token"**
6. **Copia el token** (se muestra solo una vez)

### 3.3 Crear imagePullSecret para GHCR
```bash
# Reemplaza TU_GITHUB_TOKEN con el token que copiaste
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=jpalenz77 \
  --docker-password=TU_GITHUB_TOKEN \
  --docker-email=jpalenz77@users.noreply.github.com \
  -n gamehub
```

**Verificar secret creado:**
```bash
kubectl get secrets -n gamehub
```

---

## Paso 4: Instalación del Stack de Monitorización

### 4.1 Clonar el Repositorio (si no lo has hecho)
```bash
git clone https://github.com/jpalenz77/gamehub_micro.git
cd gamehub_micro
```

### 4.2 Ejecutar Script de Instalación de Monitorización
```bash
# Dar permisos de ejecución
chmod +x monitoring/scripts/install-monitoring.sh

# Ejecutar instalación
./monitoring/scripts/install-monitoring.sh
```

**Durante la instalación se te pedirá:**

1. **¿Configurar Slack?** (y/n)
   - Si dices **`y`**, necesitas tu Slack Webhook URL
   - Si dices **`n`**, puedes configurarlo más tarde

2. **Slack Webhook URL** (si elegiste `y`)
   - Formato: `https://hooks.slack.com/services/YOUR/WEBHOOK/URL`
   - Obtén tu webhook en: https://api.slack.com/apps > Incoming Webhooks

**Tiempo estimado:** 2-3 minutos

### 4.3 Verificar Instalación de Monitorización
```bash
# Ver pods en namespace monitoring
kubectl get pods -n monitoring

# Esperar a que todos estén Running (puede tardar 1-2 minutos)
kubectl wait --for=condition=ready pod --all -n monitoring --timeout=300s
```

**Pods esperados (6 total):**
- `alertmanager-prometheus-alertmanager-0` (2/2 Running)
- `prometheus-grafana-*` (2/2 Running)
- `prometheus-kube-state-metrics-*` (1/1 Running)
- `prometheus-operator-*` (1/1 Running)
- `prometheus-prometheus-node-exporter-*` (1/1 Running)
- `prometheus-prometheus-prometheus-0` (2/2 Running)

---

## Paso 5: Despliegue de Servicios GameHub

### 5.1 Desplegar Backend Services
```bash
# Incluye: PostgreSQL, Redis, Auth, Score, Ranking services
kubectl apply -f infrastructure/kubernetes/games/backend-services.yaml -n gamehub
```

**Servicios desplegados:**
- PostgreSQL (base de datos)
- Redis (cache)
- Auth Service (autenticación)
- Score Service (puntuaciones)
- Ranking Service (rankings)

### 5.2 Desplegar Frontend y CDN
```bash
# Frontend de la aplicación
kubectl apply -f infrastructure/kubernetes/games/frontend-production.yaml -n gamehub

# CDN para archivos de juegos
kubectl apply -f infrastructure/kubernetes/games/cdn-production.yaml -n gamehub

# Kong API Gateway
kubectl apply -f infrastructure/kubernetes/games/kong-deployment.yaml -n gamehub
```

### 5.3 Verificar Deployments
```bash
# Ver todos los deployments
kubectl get deployments -n gamehub

# Ver todos los pods
kubectl get pods -n gamehub

# Esperar a que todos estén Ready (2-3 minutos para descargar imágenes)
kubectl wait --for=condition=available --timeout=300s deployment --all -n gamehub
```

**Deployments esperados (8 total):**
- `postgres-auth` (1/1)
- `redis` (1/1)
- `auth-service` (1/1)
- `score-service` (1/1)
- `ranking-service` (1/1)
- `frontend` (2/2)
- `cdn-service` (2/2)
- `kong` (1/1)

### 5.4 Verificar Servicios
```bash
kubectl get svc -n gamehub
```

**Servicios esperados:**
- `postgres-auth` (ClusterIP)
- `redis` (ClusterIP)
- `auth-service` (NodePort)
- `score-service` (ClusterIP)
- `ranking-service` (ClusterIP)
- `frontend-service` (ClusterIP)
- `cdn-service` (ClusterIP)
- `kong` (ClusterIP)

---

## Paso 6: Configuración de Dashboards y Alertas

### 6.1 Desplegar ServiceMonitors
```bash
# Configurar Prometheus para scraping de métricas
kubectl apply -f monitoring/prometheus/servicemonitors/ -n gamehub
```

**Verificar ServiceMonitors:**
```bash
kubectl get servicemonitors -n gamehub
```

Deberías ver:
- `auth-service`
- `score-service`
- `ranking-service`

### 6.2 Desplegar PrometheusRules (Alertas)
```bash
# Reglas de alertas de infraestructura y gameplay
kubectl apply -f monitoring/prometheus/rules/ -n monitoring
```

**Verificar PrometheusRules:**
```bash
kubectl get prometheusrules -n monitoring | grep gamehub
```

Deberías ver:
- `gamehub-alerts` (10 alertas de infraestructura)
- `gamehub-gameplay-alerts` (4 alertas de gameplay)

### 6.3 Desplegar Dashboards de Grafana
```bash
# Dashboard de servicios
kubectl apply -f monitoring/grafana/dashboards/gamehub-dashboard-configmap.yaml -n monitoring

# Dashboard de gameplay
kubectl apply -f monitoring/grafana/dashboards/gamehub-gameplay-dashboard-configmap.yaml -n monitoring
```

**Verificar ConfigMaps:**
```bash
kubectl get configmaps -n monitoring | grep gamehub
```

### 6.4 Reiniciar Grafana para Cargar Dashboards
```bash
# Reiniciar Grafana
kubectl rollout restart deployment prometheus-grafana -n monitoring

# Esperar a que esté listo
kubectl wait --for=condition=available --timeout=60s deployment/prometheus-grafana -n monitoring
```

---

## Paso 7: Port-Forwards para Acceso Local

### 7.1 Crear Script de Port-Forwards
Puedes crear un script para mantener todos los port-forwards activos:

```bash
cat > /tmp/start-port-forwards.sh << 'EOF'
#!/bin/bash

echo "🚀 Iniciando todos los port-forwards..."

# Matar port-forwards existentes
pkill -f "port-forward" 2>/dev/null || true
sleep 2

# Monitoring Stack
echo "📊 Iniciando port-forwards de monitorización..."
nohup kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80 > /tmp/grafana-pf.log 2>&1 &
nohup kubectl port-forward -n monitoring svc/prometheus-prometheus 9090:9090 > /tmp/prometheus-pf.log 2>&1 &
nohup kubectl port-forward -n monitoring svc/prometheus-alertmanager 9093:9093 > /tmp/alertmanager-pf.log 2>&1 &

# GameHub Services
echo "🎮 Iniciando port-forwards de GameHub..."
nohup kubectl port-forward -n gamehub svc/frontend-service 8081:8081 > /tmp/frontend-pf.log 2>&1 &
nohup kubectl port-forward -n gamehub svc/cdn-service 8080:8080 > /tmp/cdn-pf.log 2>&1 &
nohup kubectl port-forward -n gamehub svc/cdn-service 8083:8080 > /tmp/cdn-8083-pf.log 2>&1 &
nohup kubectl port-forward -n gamehub svc/kong 8000:8000 > /tmp/kong-proxy-pf.log 2>&1 &
nohup kubectl port-forward -n gamehub svc/kong 8001:8001 > /tmp/kong-admin-pf.log 2>&1 &

sleep 3

echo ""
echo "✅ Port-forwards iniciados:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 MONITORING:"
echo "   🎨 Grafana:      http://localhost:3000 (admin/admin123)"
echo "   📈 Prometheus:   http://localhost:9090"
echo "   🔔 AlertManager: http://localhost:9093"
echo ""
echo "🎮 GAMEHUB:"
echo "   🖥️  Frontend:     http://localhost:8081"
echo "   📦 CDN:          http://localhost:8080"
echo "   🎯 CDN Juegos:   http://localhost:8083"
echo "   🦍 Kong Proxy:   http://localhost:8000"
echo "   ⚙️  Kong Admin:   http://localhost:8001"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 Acceso Rápido:"
echo "   Juegos:    http://localhost:8081/games.html"
echo "   Health:    http://localhost:8081/health.html"
echo "   Dashboards: http://localhost:3000/dashboards"
echo ""
echo "⏹️  Para detener: pkill -f 'port-forward'"
EOF

chmod +x /tmp/start-port-forwards.sh
```

### 7.2 Ejecutar Script de Port-Forwards
```bash
/tmp/start-port-forwards.sh
```

### 7.3 Verificar Port-Forwards Activos
```bash
ps aux | grep "port-forward" | grep -v grep
```

**Deberías ver 8 procesos activos.**

---

## Verificación y Troubleshooting

### Verificación Completa del Sistema

#### 1. Verificar Estado de Pods
```bash
# GameHub
kubectl get pods -n gamehub
# Todos deben estar Running/Ready

# Monitoring
kubectl get pods -n monitoring
# Todos deben estar Running/Ready
```

#### 2. Verificar Deployments
```bash
kubectl get deployments -n gamehub
# Columna READY debe mostrar X/X (ej: 2/2, 1/1)
```

#### 3. Verificar Servicios
```bash
kubectl get svc -n gamehub
kubectl get svc -n monitoring
```

#### 4. Verificar Health Checks
```bash
# Frontend
curl http://localhost:8081/health

# CDN
curl http://localhost:8080/health
curl http://localhost:8083/health

# Kong
curl http://localhost:8001/status
```

#### 5. Verificar Métricas
```bash
# Ver uso de recursos
kubectl top pods -n gamehub --containers

# Verificar ServiceMonitors
kubectl get servicemonitors -n gamehub
```

#### 6. Verificar Acceso a Interfaces Web

Abre en tu navegador:

- ✅ **Grafana**: http://localhost:3000
  - Login: `admin` / `admin123`
  - Busca dashboards: "GameHub Services Overview", "GameHub Gameplay"

- ✅ **Prometheus**: http://localhost:9090
  - Ve a `/alerts` para ver alertas configuradas
  - Ve a `/targets` para ver targets de scraping

- ✅ **AlertManager**: http://localhost:9093
  - Ve a `/#/alerts` para ver alertas activas

- ✅ **Frontend**: http://localhost:8081/games.html
  - Carga un juego (Doom, Tetris, etc.)

### Troubleshooting Común

#### Problema: Pods en estado "ImagePullBackOff"
**Causa:** No se puede descargar la imagen desde GHCR

**Solución:**
```bash
# Verificar que el secret existe
kubectl get secret ghcr-secret -n gamehub

# Verificar que los deployments tienen imagePullSecrets
kubectl get deployment auth-service -n gamehub -o yaml | grep -A2 imagePullSecrets

# Recrear el secret si es necesario
kubectl delete secret ghcr-secret -n gamehub
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=jpalenz77 \
  --docker-password=TU_GITHUB_TOKEN \
  -n gamehub
```

#### Problema: Port-forward se cae frecuentemente
**Solución:** Usar el script de port-forwards y ejecutarlo de nuevo si se cae

```bash
/tmp/start-port-forwards.sh
```

#### Problema: Pods en CrashLoopBackOff
**Causa:** Aplicación fallando al iniciar

**Solución:**
```bash
# Ver logs del pod
kubectl logs deployment/NOMBRE_DEPLOYMENT -n gamehub --tail=50

# Describir el pod para ver eventos
kubectl describe pod NOMBRE_POD -n gamehub

# Verificar dependencias (PostgreSQL, Redis)
kubectl get pods -n gamehub | grep -E "postgres|redis"
```

#### Problema: No aparecen métricas en Grafana
**Causa:** ServiceMonitors no configurados o Prometheus no está scraping

**Solución:**
```bash
# Verificar ServiceMonitors
kubectl get servicemonitors -n gamehub

# Ver targets en Prometheus
# Abre http://localhost:9090/targets
# Busca: gamehub/auth-service, gamehub/score-service, gamehub/ranking-service

# Verificar labels de los servicios
kubectl get svc auth-service -n gamehub -o yaml | grep -A5 labels
```

#### Problema: Dashboards no aparecen en Grafana
**Causa:** ConfigMaps no tienen las labels correctas o Grafana no los cargó

**Solución:**
```bash
# Verificar ConfigMaps
kubectl get configmaps -n monitoring -l grafana_dashboard=1

# Reiniciar Grafana
kubectl rollout restart deployment prometheus-grafana -n monitoring

# Esperar 30-60 segundos y refrescar Grafana
```

#### Problema: Alertas no aparecen en Prometheus
**Causa:** PrometheusRules no se aplicaron correctamente

**Solución:**
```bash
# Verificar PrometheusRules
kubectl get prometheusrules -n monitoring | grep gamehub

# Ver detalles de las reglas
kubectl get prometheusrule gamehub-alerts -n monitoring -o yaml | grep "alert:"

# Recargar configuración de Prometheus (se hace automáticamente cada 30s)
# O reiniciar Prometheus
kubectl delete pod prometheus-prometheus-prometheus-0 -n monitoring
```

#### Problema: Minikube sin recursos suficientes
**Síntoma:** Pods en estado "Pending" por recursos

**Solución:**
```bash
# Ver recursos del nodo
kubectl top node

# Si es necesario, recrear Minikube con más recursos
minikube delete
minikube start --memory=10240 --cpus=6 --driver=docker
```

---

## Mantenimiento

### Logs y Debugging

#### Ver Logs de un Deployment
```bash
kubectl logs deployment/NOMBRE -n gamehub --tail=100 -f
```

#### Ver Logs de Todos los Pods de un Deployment
```bash
kubectl logs -l app=frontend -n gamehub --all-containers=true --tail=50
```

#### Ver Eventos del Namespace
```bash
kubectl get events -n gamehub --sort-by='.lastTimestamp'
```

### Actualizar Imágenes

Cuando se publiquen nuevas imágenes en GHCR:

```bash
# Forzar re-descarga de imágenes :latest
kubectl rollout restart deployment --all -n gamehub

# O específico
kubectl rollout restart deployment/frontend -n gamehub
```

### Backup de Configuración

#### Exportar Manifiestos Actuales
```bash
# Crear directorio de backup
mkdir -p backups/$(date +%Y%m%d)

# Exportar deployments
kubectl get deployments -n gamehub -o yaml > backups/$(date +%Y%m%d)/deployments.yaml

# Exportar servicios
kubectl get svc -n gamehub -o yaml > backups/$(date +%Y%m%d)/services.yaml

# Exportar configmaps (sin secrets)
kubectl get configmaps -n gamehub -o yaml > backups/$(date +%Y%m%d)/configmaps.yaml
```

### Actualizar Dashboards o Alertas

#### Actualizar Dashboard
```bash
# Editar el dashboard JSON
vim monitoring/grafana/dashboards/gamehub-services.json

# Actualizar el ConfigMap
kubectl apply -f monitoring/grafana/dashboards/gamehub-dashboard-configmap.yaml -n monitoring

# Reiniciar Grafana
kubectl rollout restart deployment prometheus-grafana -n monitoring
```

#### Actualizar Alertas
```bash
# Editar las reglas
vim monitoring/prometheus/rules/gamehub-alerts.yaml

# Aplicar cambios
kubectl apply -f monitoring/prometheus/rules/gamehub-alerts.yaml -n monitoring

# Prometheus recarga automáticamente (esperar 30s)
# O forzar recarga eliminando el pod
kubectl delete pod prometheus-prometheus-prometheus-0 -n monitoring
```

### Limpiar Todo

#### Eliminar Solo GameHub (mantener monitorización)
```bash
kubectl delete namespace gamehub
```

#### Eliminar Todo (GameHub + Monitorización)
```bash
# Eliminar namespace gamehub
kubectl delete namespace gamehub

# Desinstalar Helm chart
helm uninstall prometheus -n monitoring

# Eliminar namespace monitoring
kubectl delete namespace monitoring

# Eliminar Minikube completamente
minikube delete
```

---

## Comandos Útiles de Referencia

### Gestión de Minikube
```bash
# Estado
minikube status

# Dashboard web
minikube dashboard

# SSH al nodo
minikube ssh

# Ver IP
minikube ip

# Pausar (sin eliminar)
minikube pause

# Reanudar
minikube unpause
```

### Gestión de Pods
```bash
# Ver todos los pods
kubectl get pods --all-namespaces

# Ver pods con uso de recursos
kubectl top pods -n gamehub --containers

# Ejecutar comando en pod
kubectl exec -it POD_NAME -n gamehub -- /bin/bash

# Ver logs en tiempo real
kubectl logs -f POD_NAME -n gamehub
```

### Gestión de Deployments
```bash
# Ver deployments
kubectl get deployments -n gamehub

# Escalar deployment
kubectl scale deployment/frontend --replicas=3 -n gamehub

# Ver historial de rollout
kubectl rollout history deployment/frontend -n gamehub

# Rollback
kubectl rollout undo deployment/frontend -n gamehub
```

### Port-Forwards On-Demand
```bash
# Frontend
kubectl port-forward -n gamehub svc/frontend-service 8081:8081

# Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

# Prometheus
kubectl port-forward -n monitoring svc/prometheus-prometheus 9090:9090
```

---

## URLs de Acceso Rápido

### Aplicación
- 🎮 **Juegos**: http://localhost:8081/games.html
- 🏥 **Health**: http://localhost:8081/health.html
- 📦 **CDN**: http://localhost:8080

### Monitorización
- 🎨 **Grafana**: http://localhost:3000 (admin/admin123)
- 📈 **Prometheus**: http://localhost:9090
- 🔔 **AlertManager**: http://localhost:9093

### API Gateway
- 🦍 **Kong Proxy**: http://localhost:8000
- ⚙️ **Kong Admin**: http://localhost:8001

---

## Notas Finales

### Recursos del Sistema
- **Minikube**: 8GB RAM, 4 CPUs
- **Pods totales**: ~16 (8 GameHub + 6 Monitoring + 2 sistema)
- **Uso aproximado RAM**: 6-7 GB
- **Uso aproximado CPU**: 2-3 cores

### Tiempos de Despliegue
- Instalación Minikube: 2-3 minutos
- Stack de Monitorización: 3-4 minutos
- Servicios GameHub: 2-3 minutos (primera vez con descarga de imágenes)
- **Total**: ~10 minutos

### Mejores Prácticas
1. ✅ Siempre verificar que Minikube tiene suficientes recursos
2. ✅ Mantener los port-forwards activos con el script
3. ✅ Verificar logs si algo falla
4. ✅ Usar `kubectl top` para monitorizar uso de recursos
5. ✅ Hacer backup de configuraciones antes de cambios grandes

### Próximos Pasos
- Configurar alertas de Slack con webhook real
- Personalizar dashboards de Grafana según necesidades
- Agregar más juegos al CDN
- Configurar persistent volumes para datos importantes
- Migrar a AWS EKS o similar para producción

---

## Soporte

### Documentación
- Minikube: https://minikube.sigs.k8s.io/docs/
- Kubernetes: https://kubernetes.io/docs/
- Prometheus: https://prometheus.io/docs/
- Grafana: https://grafana.com/docs/

### Repositorio
- GitHub: https://github.com/jpalenz77/gamehub_micro
- Issues: https://github.com/jpalenz77/gamehub_micro/issues
- Releases: https://github.com/jpalenz77/gamehub_micro/releases

---

**✨ ¡Disfruta de GameHub v2.1! ✨**

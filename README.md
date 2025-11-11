# 🎮 GameHub - Retro Gaming Platform

**Práctica final de la edición 12 del bootcamp de DevOps de KeepCoding**

GameHub es una plataforma de juegos retro basada en microservicios que permite a los usuarios jugar juegos clásicos de DOS, guardar puntuaciones y competir en rankings globales.

[![CI - Tests and Build](https://github.com/jpalenz77/gamehub-micro-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/jpalenz77/gamehub-micro-v2/actions/workflows/ci.yml)

---

## 🏗️ Arquitectura

### Stack Tecnológico

- **Backend**: Node.js + Express (5 microservicios)
- **Frontend**: HTML5 + JS-DOS (emulador de DOSBox en browser)
- **Bases de Datos**: 
  - PostgreSQL 15 (auth, users, scores)
  - MongoDB 7 (game catalog)
  - Redis 7 (cache + event bus)
- **API Gateway**: Kong 3.4 (DB-less mode)
- **Monitoring**: Prometheus + Grafana + AlertManager
- **Orquestación**: Docker Compose / Kubernetes

### Microservicios

| Servicio | Puerto | Descripción | Base de Datos |
|----------|--------|-------------|---------------|
| **auth-service** | 3001 | Autenticación JWT | PostgreSQL |
| **user-service** | 3002 | Gestión de usuarios | PostgreSQL |
| **score-service** | 3003 | Puntuaciones y métricas | PostgreSQL |
| **ranking-service** | 3004 | Rankings con cache | Redis |
| **game-catalog-service** | 3005 | Catálogo de juegos | MongoDB |
| **frontend** | 8000/8082 | Aplicación web | - |
| **kong** | 8000 | API Gateway | - |

---

## 🚀 Inicio Rápido

### Opción 1: Docker Compose (Desarrollo Local)


#### Prerrequisitos

- Minikube 1.32+ o cluster Kubernetes
- kubectl configurado
- Helm 3+ (para monitoreo)
- 8GB RAM disponible
- Docker (para construir imágenes)

#### Instalación

```bash
# 1. Iniciar Minikube con recursos suficientes
minikube start --cpus=4 --memory=8192 --driver=docker

# 2. Habilitar addons necesarios
minikube addons enable ingress
minikube addons enable metrics-server

# 3. Crear namespace y secrets
kubectl apply -f infrastructure/kubernetes/namespace-and-secrets.yaml

# 4. Construir imágenes de servicios
cd services/auth-service && docker build -t gamehub-auth-service:latest .
cd ../user-service && docker build -t gamehub-user-service:latest .
cd ../score-service && docker build -t gamehub-score-service:latest .
cd ../ranking-service && docker build -t gamehub-ranking-service:latest .
cd ../game-catalog-service && docker build -t gamehub-game-catalog-service:latest .
cd ../../frontend && docker build -f Dockerfile.microservices -t gamehub-frontend:latest .

# 5. Cargar imágenes en Minikube
minikube image load gamehub-auth-service:latest
minikube image load gamehub-user-service:latest
minikube image load gamehub-score-service:latest
minikube image load gamehub-ranking-service:latest
minikube image load gamehub-game-catalog-service:latest
minikube image load gamehub-frontend:latest

# 6. Desplegar servicios backend
kubectl apply -f infrastructure/kubernetes/deployments/

# 7. Desplegar Kong API Gateway
kubectl apply -f infrastructure/kubernetes/games/kong-deployment.yaml

# 8. Desplegar frontend y CDN
kubectl apply -f infrastructure/kubernetes/games/frontend-production.yaml
kubectl apply -f infrastructure/kubernetes/games/cdn-production.yaml

# 9. Configurar ingress
kubectl apply -f infrastructure/kubernetes/games/games-ingress.yaml

# 10. Obtener IP del cluster
minikube ip
# Añadir a /etc/hosts: <MINIKUBE_IP> gamehub.local
```

#### Acceso en Kubernetes

```bash
# Verificar que todos los pods estén Running
kubectl get pods -n gamehub

# Obtener URL del frontend
echo "http://$(minikube ip):$(kubectl get svc frontend -n gamehub -o jsonpath='{.spec.ports[0].nodePort}')"

# O usar port-forward
kubectl port-forward -n gamehub svc/frontend 8080:80
# Acceder en http://localhost:8080
```

---

## 📊 Monitoring Stack (Helm)

GameHub incluye un stack completo de monitoreo con Prometheus, Grafana y AlertManager, desplegado mediante Helm.

### Componentes

| Componente | Versión | Puerto | Descripción |
|------------|---------|--------|-------------|
| **Prometheus** | 2.x | 9090 | Recolección de métricas (7d retention, 10Gi storage) |
| **Grafana** | 12.2.1 | 3000 | Visualización y dashboards (5Gi persistent storage) |
| **AlertManager** | 0.29.0 | 9093 | Enrutamiento de alertas a Slack (5Gi storage) |

### Instalación del Stack de Monitoreo

```bash
# 1. Añadir repositorio de Helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# 2. Instalar kube-prometheus-stack
cd monitoring
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values helm/prometheus-values.yaml

# 3. Esperar a que todos los pods estén Running (2-3 minutos)
kubectl get pods -n monitoring -w

# 4. Desplegar ServiceMonitors para scraping
kubectl apply -f prometheus/servicemonitors/

# 5. Desplegar reglas de alertas personalizadas
kubectl apply -f prometheus/rules/

# 6. Desplegar dashboard de Grafana
kubectl apply -f grafana/dashboards/gamehub-gameplay-dashboard-configmap.yaml

# 7. Configurar port-forwards para acceso local
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80 &
kubectl port-forward -n monitoring svc/prometheus-prometheus 9090:9090 &
kubectl port-forward -n monitoring svc/prometheus-alertmanager 9093:9093 &
```

### Acceso al Stack de Monitoreo

- **Grafana**: http://localhost:3000
  - Usuario: `admin`
  - Contraseña: `admin123`
  - Dashboard: http://localhost:3000/d/gamehub-gameplay

- **Prometheus**: http://localhost:9090
  - Targets: http://localhost:9090/targets
  - Alerts: http://localhost:9090/alerts

- **AlertManager**: http://localhost:9093
  - Alerts: http://localhost:9093/#/alerts

### Métricas Personalizadas

El **score-service** expone métricas custom en el endpoint `/metrics`:

| Métrica | Tipo | Labels | Descripción |
|---------|------|--------|-------------|
| `score_submissions_total` | Counter | `game`, `username` | Total de puntuaciones enviadas |
| `last_score_value` | Gauge | `game`, `username`, `user_id` | Última puntuación registrada |

**Ejemplo de consultas PromQL:**

```promql
# Tasa de puntuaciones por minuto
rate(score_submissions_total[1m])

# Puntuaciones por juego
sum(rate(score_submissions_total[5m])) by (game)

# Top 5 jugadores más activos
topk(5, sum(score_submissions_total) by (username))

# Puntuaciones mayores a 5000
last_score_value > 5000
```

### Alertas Configuradas

#### Alertas de Gameplay (monitoring/prometheus/rules/gamehub-gameplay-alerts.yaml)

| Alerta | Condición | Severidad | Descripción |
|--------|-----------|-----------|-------------|
| **GameHubNewScore** | `increase(score_submissions_total[30s]) > 0` | warning | Se envió una nueva puntuación |
| **GameHubHighScore** | `last_score_value > 5000` | warning | Puntuación mayor a 5000 |
| **GameHubPersonalBest** | Score submission + high score | warning | Nuevo récord personal |
| **GameHubActiveSession** | `sum(increase[5m]) > 3` | info | Jugador activo (>3 juegos en 5min) |

#### Alertas de Infraestructura (monitoring/prometheus/rules/gamehub-alerts.yaml)

- **GameHubServiceDown**: Servicio no responde por >1min
- **GameHubHighCPU**: CPU >80% por >5min
- **GameHubHighMemory**: Memoria >80% por >5min
- **GameHubPodCrashLooping**: Pod reiniciando constantemente
- **GameHubHighLatency**: Latencia >500ms en endpoints
- **GameHubDatabaseDown**: PostgreSQL/MongoDB/Redis no disponible
- **GameHubDiskSpaceLow**: Disco <20% libre
- **GameHubPodNotReady**: Pod no ready por >5min
- **GameHubHighRestartRate**: >5 reinicios en 1h
- **GameHubAPIErrors**: Tasa de errores >5% en 5min

### Integración con Slack

Todas las alertas se envían al canal de Slack `#gamehub-alertas`. La configuración está en `monitoring/helm/prometheus-values.yaml`.

**Actualizar webhook de Slack:**

```bash
cd monitoring/scripts
./update-slack-webhook.sh <YOUR_SLACK_WEBHOOK_URL>
```

**Formato de alertas en Slack:**

```
🚨 [FIRING:1] GameHubHighScore - warning

🎮 High Score Alert!
   User: john_doe
   Game: doom
   Score: 7500 points

Status: firing
Severity: warning
Time: 2024-01-15 10:30:00 UTC
```

### Dashboard de Grafana

El dashboard **GameHub Gameplay & Monitoring** incluye 16 paneles:

#### 📊 Paneles de Gameplay
1. **Active Alerts**: Tabla de alertas activas en tiempo real
2. **Total Scores by Game**: Puntuaciones totales por juego
3. **Total Scores by User**: Puntuaciones totales por usuario
4. **Score Submission Rate**: Tasa de envío de puntuaciones (irate 1m)
5. **Latest Scores**: Últimas 10 puntuaciones registradas
6. **Score Submissions Over Time**: Histórico de sumisiones
7. **Top 5 Scores**: Top 5 puntuaciones actuales
8. **Score Timeline**: Timeline de puntuaciones por juego

#### 🖥️ Paneles de Infraestructura
9. **Pod CPU Usage**: Uso de CPU por pod
10. **Pod Memory Usage**: Uso de memoria por pod
11. **Pod Restart Count**: Contador de reinicios por pod
12. **Pod Status**: Estado actual de todos los pods
13. **Network Traffic**: Tráfico de red (bytes sent/received)
14. **Resource Limits**: Tabla de límites de CPU/memoria
15. **Alert History**: Histórico de alertas disparadas
16. **Service Response Times**: Tiempos de respuesta por servicio

### Troubleshooting del Monitoreo

#### Prometheus no encuentra targets

```bash
# 1. Verificar ServiceMonitors
kubectl get servicemonitors -n gamehub

# 2. Verificar que los servicios tienen el label correcto
kubectl get svc -n gamehub --show-labels | grep app=

# 3. Verificar que los puertos tienen nombre "http"
kubectl get svc -n gamehub -o yaml | grep -A5 "ports:"

# 4. Reiniciar Prometheus para recargar configuración
kubectl rollout restart statefulset prometheus-prometheus -n monitoring
```

#### Grafana muestra "server misbehaving"

```bash
# 1. Verificar datasource URL
kubectl get configmap prometheus-grafana -n monitoring -o yaml | grep url:

# 2. Si la URL es incorrecta, patchear el ConfigMap
kubectl patch configmap prometheus-grafana -n monitoring --type='json' \
  -p='[{"op": "replace", "path": "/data/datasource.yaml", "value": "datasources:\n  - name: Prometheus\n    type: prometheus\n    access: proxy\n    url: http://prometheus-prometheus:9090"}]'

# 3. Reiniciar Grafana
kubectl delete pod -n monitoring -l app.kubernetes.io/name=grafana
```

#### Alertas no llegan a Slack

```bash
# 1. Verificar configuración de AlertManager
kubectl get secret alertmanager-prometheus-alertmanager -n monitoring -o yaml

# 2. Ver logs de AlertManager
kubectl logs -n monitoring alertmanager-prometheus-alertmanager-0

# 3. Verificar que las alertas tienen severity: warning (no info)
kubectl get prometheusrules -n monitoring -o yaml | grep severity

# 4. Forzar reload de AlertManager
kubectl exec -n monitoring alertmanager-prometheus-alertmanager-0 -- \
  curl -X POST http://localhost:9093/-/reload
```

#### Dashboard no muestra datos

```bash
# 1. Verificar que las métricas llegan a Prometheus
curl -s "http://localhost:9090/api/v1/query?query=score_submissions_total" | jq

# 2. Verificar que Grafana puede consultar Prometheus
kubectl exec -n monitoring deployment/prometheus-grafana -- \
  wget -qO- http://prometheus-prometheus:9090/api/v1/query?query=up

# 3. Verificar que el dashboard está cargado
kubectl get configmap -n monitoring | grep gamehub-gameplay

# 4. Reiniciar Grafana para recargar dashboards
kubectl rollout restart deployment prometheus-grafana -n monitoring
```

---

## 🧪 Testing

### Health Checks

Todos los servicios exponen endpoints de health:

```bash
# Docker Compose
curl http://localhost:3001/health  # auth-service
curl http://localhost:3002/health  # user-service
curl http://localhost:3003/health  # score-service
curl http://localhost:3004/health  # ranking-service
curl http://localhost:3005/health  # game-catalog-service

# Kubernetes
kubectl exec -n gamehub <POD_NAME> -- wget -qO- http://localhost:3001/health
```

### Logs

```bash
# Docker Compose - Ver logs de todos los servicios
docker compose logs -f

# Docker Compose - Ver logs de un servicio específico
docker compose logs -f score-service

# Kubernetes - Ver logs de un pod
kubectl logs -n gamehub <POD_NAME>

# Kubernetes - Ver logs de un deployment
kubectl logs -n gamehub deployment/score-service -f
```

---

## 🛠️ Desarrollo

### Estructura del Proyecto

```
gamehub/
├── services/                # Microservicios backend
│   ├── auth-service/       # Autenticación JWT
│   ├── user-service/       # Gestión de usuarios
│   ├── score-service/      # Puntuaciones + métricas custom
│   ├── ranking-service/    # Rankings con cache Redis
│   └── game-catalog-service/ # Catálogo de juegos
├── frontend/               # Aplicación web + JS-DOS emulator
├── infrastructure/         # Configuración de infraestructura
│   ├── kong/              # API Gateway config
│   ├── kubernetes/        # Manifiestos K8s (deployments, services, ingress)
│   └── nginx/             # Configuración nginx para CDN
├── monitoring/             # Stack de monitoreo
│   ├── helm/              # prometheus-values.yaml
│   ├── prometheus/        # ServiceMonitors + PrometheusRules
│   ├── grafana/           # Dashboards auto-importados
│   └── scripts/           # Scripts de instalación
├── juegos/                 # Archivos .jsdos de juegos
├── shared/                 # Código compartido (eventos)
└── docker-compose.yml      # Orquestación local
```

### Comandos Útiles

#### Docker Compose

```bash
# Ver logs de un servicio
docker compose logs -f auth-service

# Reiniciar un servicio
docker compose restart auth-service

# Reconstruir un servicio
docker compose up -d --build auth-service

# Ver estado de todos los servicios
docker compose ps

# Detener todo
docker compose down

# Detener y eliminar volúmenes (reset completo)
docker compose down -v
```

#### Kubernetes

```bash
# Ver todos los pods
kubectl get pods -n gamehub

# Ver logs de un pod
kubectl logs -n gamehub <POD_NAME> -f

# Reiniciar un deployment
kubectl rollout restart deployment score-service -n gamehub

# Ver estado de rollout
kubectl rollout status deployment score-service -n gamehub

# Ejecutar comando en un pod
kubectl exec -n gamehub <POD_NAME> -- sh

# Ver métricas de recursos
kubectl top pods -n gamehub
kubectl top nodes

# Escalar manualmente un deployment
kubectl scale deployment score-service -n gamehub --replicas=3

# Ver HPA (autoscaling)
kubectl get hpa -n gamehub

# Port-forward para acceder a un servicio
kubectl port-forward -n gamehub svc/score-service 3003:3003
```

### Variables de Entorno

Ver `.env.example` para la lista completa. Las principales son:

```env
# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# PostgreSQL
POSTGRES_USER=gamehub
POSTGRES_PASSWORD=gamehub_secret

# MongoDB
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=mongo_secret

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
```

---

## 🎯 Patrones Implementados

- **Microservicios**: Servicios independientes con responsabilidad única
- **API Gateway**: Kong como punto único de entrada
- **Event-Driven**: Redis pub/sub para eventos asíncronos
- **CQRS**: Separación de lectura (rankings) y escritura (scores)
- **Cache Distribuido**: Redis con TTL de 30 segundos
- **Circuit Breaker**: Fault tolerance en comunicación entre servicios
- **Health Checks**: Endpoints `/health` y `/ready` en todos los servicios
- **Observability**: Métricas Prometheus + Dashboards Grafana + Alertas Slack
- **Custom Metrics**: score_submissions_total, last_score_value
- **Auto-scaling**: HPA en Kubernetes basado en CPU/memoria
- **GitOps**: Manifiestos declarativos en Git

---

## 🎮 Uso

### 1. Registro de Usuario

1. Abre http://localhost:8082 (Docker Compose) o http://localhost:8081 (Kubernetes)
2. Haz clic en "Registrarse"
3. Completa el formulario
4. Serás redirigido automáticamente a la página de juegos

### 2. Jugar

- Selecciona un juego de la lista
- Espera a que cargue el emulador (5-10 segundos)
- Usa las teclas de dirección y CTRL/ALT para jugar
- Tu puntuación se guardará automáticamente al salir

### 3. Rankings

Los rankings se actualizan en tiempo real y se muestran en el panel derecho.

---

## 📚 Documentación Adicional

- **[ARCHITECTURE.md](ARCHITECTURE.md)**: Arquitectura detallada del sistema
- **[monitoring/README.md](monitoring/README.md)**: Guía completa de monitoreo
- **[infrastructure/kubernetes/games/ARCHITECTURE.md](infrastructure/kubernetes/games/ARCHITECTURE.md)**: Arquitectura Kubernetes con HPA

---

## 🔧 Troubleshooting

### Docker Compose

#### Los servicios no inician

```bash
# Ver logs
docker compose logs

# Verificar puertos ocupados
netstat -tuln | grep -E "3000|3001|3002|3003|3004|3005|5432|6379|8000|8082"

# Reiniciar todo
docker compose down -v
docker compose up -d
```

#### Error 429 (Rate Limiting)

Los límites configurados son:
- Auth: 100 req/min
- Otros servicios: 100-200 req/min

Si necesitas más, edita `infrastructure/kong/kong.yml`

#### Juegos no cargan

1. Verifica que el frontend esté corriendo: `docker compose ps frontend`
2. Comprueba que los archivos .jsdos existan: `ls -lh juegos/`
3. Revisa logs del frontend: `docker compose logs frontend`

### Kubernetes

#### Pods en CrashLoopBackOff

```bash
# Ver logs del pod
kubectl logs -n gamehub <POD_NAME> --previous

# Describir el pod para ver eventos
kubectl describe pod -n gamehub <POD_NAME>

# Verificar recursos disponibles
kubectl top nodes
kubectl describe node <NODE_NAME>
```

#### HPA no escala

```bash
# Verificar metrics-server
kubectl get apiservice v1beta1.metrics.k8s.io -o yaml

# Ver métricas disponibles
kubectl top pods -n gamehub

# Reiniciar metrics-server
minikube addons disable metrics-server
minikube addons enable metrics-server
```

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 👨‍💻 Autor

- GitHub: [@jpalenz77](https://github.com/jpalenz77)
- Proyecto: [gamehub_micro](https://github.com/jpalenz77/gamehub_micro)

**Práctica Final - Bootcamp DevOps Ed. 12 - KeepCoding**

---

## 📄 Licencia

Este proyecto es de uso educativo para la práctica final del Bootcamp de DevOps de KeepCoding.

---

## 🙏 Agradecimientos

- **KeepCoding**: Por el Bootcamp de DevOps
- **JS-DOS**: Por el emulador de DOSBox en browser
- **Prometheus Community**: Por el Helm chart kube-prometheus-stack
- **Comunidad Open Source**: Por todas las herramientas utilizadas

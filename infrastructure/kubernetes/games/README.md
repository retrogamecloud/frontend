# 🎮 GameHub - Escalado Automático por Juego en Kubernetes

Este directorio contiene la configuración para desplegar GameHub en Kubernetes con **escalado automático independiente por cada juego**.

## 📋 Arquitectura

Cada juego tiene su propio:
- **Deployment**: Pod dedicado que ejecuta el frontend del juego
- **Service**: ClusterIP para enrutamiento interno
- **HPA**: Horizontal Pod Autoscaler que escala de 1 a 10 réplicas según CPU/memoria

### Juegos Disponibles (10):
1. DOOM
2. Wolfenstein 3D
3. Dangerous Dave 2
4. Digger
5. Duke Nukem 3D
6. Heroes of Might and Magic 2
7. Lost Vikings
8. Mortal Kombat
9. Street Fighter 2
10. Tetris

## 🚀 Quick Start - Minikube

### Prerequisitos

```bash
# Instalar Minikube
# https://minikube.sigs.k8s.io/docs/start/

# Instalar kubectl
# https://kubernetes.io/docs/tasks/tools/

# Iniciar Minikube con recursos suficientes
minikube start --memory=8192 --cpus=4 --driver=docker
```

### Deploy Completo

```bash
# 1. Ejecutar el script de deploy
./deploy-minikube.sh

# 2. Verificar que todo está corriendo
kubectl get pods -n gamehub

# 3. Ver estado de HPAs
kubectl get hpa -n gamehub

# 4. Monitorear en tiempo real
./monitor-games.sh
```

## 📊 Configuración de HPA

Cada juego escala automáticamente basándose en:

### Métricas de Escalado:
- **CPU**: Escala cuando uso > 70%
- **Memoria**: Escala cuando uso > 80%

### Límites:
- **Min Replicas**: 1 pod por juego
- **Max Replicas**: 10 pods por juego

### Políticas:
- **Scale Up**: Inmediato, duplica pods si es necesario
- **Scale Down**: Espera 5 minutos antes de reducir, máximo 50% por ciclo

### Recursos por Pod:
```yaml
requests:
  cpu: 100m      # 0.1 CPU cores
  memory: 128Mi  # 128 MB RAM

limits:
  cpu: 500m      # 0.5 CPU cores
  memory: 512Mi  # 512 MB RAM
```

## 🧪 Probar el Autoscaling

### Generar Carga en un Juego

```bash
# Generar carga en DOOM por 2 minutos
./load-test.sh doom 120

# Generar carga en Tetris por 5 minutos
./load-test.sh tetris 300

# Generar carga en TODOS los juegos
./load-test.sh all 180
```

### Monitorear el Escalado

```bash
# Monitor en tiempo real con interfaz visual
./monitor-games.sh

# Ver HPAs en watch mode
kubectl get hpa -n gamehub -w

# Ver eventos de escalado
kubectl get events -n gamehub --sort-by='.lastTimestamp' | grep HorizontalPodAutoscaler
```

### Escalar Manualmente

```bash
# Escalar DOOM a 5 réplicas
kubectl scale deployment doom-game --replicas=5 -n gamehub

# Ver todas las réplicas
kubectl get pods -n gamehub -l game=doom
```

## 🗂️ Estructura de Archivos

```
games/
├── game-deployment-template.yaml    # Template base para deployments
├── generate-game-deployments.sh     # Genera los 10 deployments
├── deployments/                     # Deployments generados (10 archivos)
│   ├── doom-game.yaml
│   ├── wolf-game.yaml
│   └── ... (8 más)
├── games-ingress.yaml               # Ingress para enrutar por juego
├── deploy-minikube.sh               # Deploy completo en Minikube
├── monitor-games.sh                 # Monitor de escalado en tiempo real
├── load-test.sh                     # Generador de carga para pruebas
└── README.md                        # Esta documentación
```

## 🔍 Comandos Útiles

### Ver Estado General

```bash
# Pods de todos los juegos
kubectl get pods -n gamehub -l tier=frontend

# HPAs de todos los juegos
kubectl get hpa -n gamehub

# Services
kubectl get svc -n gamehub

# Deployments
kubectl get deployments -n gamehub -l tier=frontend
```

### Ver Métricas de un Juego Específico

```bash
# Ver réplicas de DOOM
kubectl get deployment doom-game -n gamehub

# Ver HPA de DOOM con detalles
kubectl describe hpa doom-game-hpa -n gamehub

# Ver logs de un pod de DOOM
kubectl logs -f <doom-pod-name> -n gamehub

# Ver métricas en tiempo real
kubectl top pods -n gamehub -l game=doom
```

### Debugging

```bash
# Ver eventos de escalado
kubectl get events -n gamehub --field-selector involvedObject.name=doom-game-hpa

# Ver configuración de un deployment
kubectl get deployment doom-game -n gamehub -o yaml

# Entrar en un pod
kubectl exec -it <pod-name> -n gamehub -- sh

# Ver logs del metrics-server
kubectl logs -n kube-system -l k8s-app=metrics-server
```

## 📈 Monitoreo con Prometheus + Grafana

Para métricas avanzadas, despliega Prometheus y Grafana:

```bash
# Habilitar addon de métricas en Minikube
minikube addons enable metrics-server

# Desplegar Prometheus + Grafana (desde directorio raíz)
kubectl apply -f ../../monitoring/
```

### Dashboards Disponibles:
- CPU/Memoria por juego
- Latencia de requests
- Tasa de escalado
- Usuarios concurrentes

## 🌐 Ingress y Routing

El Ingress enruta basándose en el path:

```
http://gamehub.local/game/doom          → doom-game-service
http://gamehub.local/game/wolf          → wolf-game-service
http://gamehub.local/game/tetris        → tetris-game-service
... etc
```

### Configurar /etc/hosts

```bash
# Obtener IP de Minikube
minikube ip

# Añadir a /etc/hosts
echo "$(minikube ip) gamehub.local" | sudo tee -a /etc/hosts
```

## 🔧 Personalizar Configuración

### Cambiar Límites de Escalado

Editar `game-deployment-template.yaml`:

```yaml
spec:
  minReplicas: 2    # Cambiar mínimo
  maxReplicas: 20   # Cambiar máximo
```

Regenerar deployments:
```bash
./generate-game-deployments.sh
kubectl apply -f ./deployments/ -n gamehub
```

### Cambiar Recursos por Pod

Editar `game-deployment-template.yaml`:

```yaml
resources:
  requests:
    cpu: 200m       # Duplicar CPU request
    memory: 256Mi   # Duplicar memoria
  limits:
    cpu: 1000m      # 1 CPU core
    memory: 1Gi     # 1 GB RAM
```

### Cambiar Umbrales de Escalado

```yaml
metrics:
- type: Resource
  resource:
    name: cpu
    target:
      averageUtilization: 50  # Escalar antes (a 50% en vez de 70%)
```

## 🚨 Troubleshooting

### HPA muestra "unknown" en targets

```bash
# Verificar metrics-server
kubectl get deployment metrics-server -n kube-system

# Reiniciar metrics-server
kubectl rollout restart deployment metrics-server -n kube-system

# Esperar 1-2 minutos y verificar
kubectl get hpa -n gamehub
```

### Pods no escalan

```bash
# Ver logs del HPA controller
kubectl logs -n kube-system -l component=kube-controller-manager

# Verificar recursos del nodo
kubectl top nodes

# Verificar eventos
kubectl describe hpa <hpa-name> -n gamehub
```

### Imágenes no se encuentran

```bash
# Asegurar que estás usando el daemon de Docker de Minikube
eval $(minikube docker-env)

# Reconstruir imágenes
docker build -f frontend/Dockerfile.microservices -t gamehub-frontend:latest ./frontend

# Verificar imágenes
docker images | grep gamehub
```

## 📚 Siguientes Pasos

1. **Métricas Custom**: Implementar escalado basado en usuarios concurrentes
2. **Service Mesh**: Añadir Istio para traffic management avanzado
3. **AWS EKS**: Migrar a producción en AWS
4. **Auto-healing**: Configurar probes y self-healing avanzado
5. **Blue/Green Deploys**: Implementar estrategias de deploy sin downtime

## 🤝 Contribuir

Para añadir un nuevo juego:

1. Añadir el juego al array en `generate-game-deployments.sh`
2. Regenerar deployments: `./generate-game-deployments.sh`
3. Añadir ruta en `games-ingress.yaml`
4. Aplicar cambios: `kubectl apply -f ./ -n gamehub`

## 📞 Soporte

- Ver logs: `kubectl logs -f <pod-name> -n gamehub`
- Ver eventos: `kubectl get events -n gamehub`
- Dashboard de Minikube: `minikube dashboard`

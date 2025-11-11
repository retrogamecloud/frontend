# Monitoring Stack - Prometheus, Grafana, AlertManager

Complete monitoring solution for GameHub using Helm and kube-prometheus-stack.

## 📊 Stack Components

- **Prometheus**: Metrics collection and storage
- **Grafana**: Dashboards and visualization
- **AlertManager**: Alert routing and management
- **Node Exporter**: Node-level metrics
- **kube-state-metrics**: Kubernetes resource metrics
- **Prometheus Operator**: Kubernetes CRDs for monitoring

## 🚀 Installation

### 1. Add Helm Repository

```bash
# Add Prometheus community helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

### 2. Create Namespace

```bash
kubectl create namespace monitoring
```

### 3. Install kube-prometheus-stack

```bash
# Install with custom values
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values monitoring/helm/prometheus-values.yaml \
  --wait

# Or use the script
./monitoring/scripts/install-monitoring.sh
```

## 🔔 Slack Integration

### 1. Create Slack Webhook

1. Go to: https://api.slack.com/apps
2. Create New App > From scratch
3. Name: "GameHub Alerts"
4. Select workspace
5. Add features > Incoming Webhooks
6. Activate Incoming Webhooks
7. Add New Webhook to Workspace
8. Select channel (e.g., `#gamehub-alerts`)
9. Copy Webhook URL

### 2. Configure AlertManager

```bash
# Create secret with Slack webhook
kubectl create secret generic alertmanager-slack \
  --from-literal=webhook-url='https://hooks.slack.com/services/YOUR/WEBHOOK/URL' \
  -n monitoring

# Or update the values file and upgrade
helm upgrade prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values monitoring/helm/prometheus-values.yaml \
  --reuse-values
```

## 📈 Access Services

### Grafana

```bash
# Port-forward
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

# URL: http://localhost:3000
# Username: admin
# Password: (see below to get it)
kubectl get secret -n monitoring prometheus-grafana -o jsonpath="{.data.admin-password}" | base64 --decode ; echo
```

### Prometheus

```bash
# Port-forward
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090

# URL: http://localhost:9090
```

### AlertManager

```bash
# Port-forward
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-alertmanager 9093:9093

# URL: http://localhost:9093
```

## 📊 Pre-configured Dashboards

Grafana comes with several pre-installed dashboards:

1. **Kubernetes / Compute Resources / Cluster**
2. **Kubernetes / Compute Resources / Namespace (Pods)**
3. **Kubernetes / Compute Resources / Node (Pods)**
4. **Kubernetes / Networking / Cluster**
5. **Node Exporter / Nodes**

### Custom GameHub Dashboards

Import custom dashboards:

```bash
# Via Grafana UI
1. Dashboards > Import
2. Upload JSON file from monitoring/grafana/dashboards/
3. Select Prometheus datasource
```

Or use ConfigMaps (automatic):
```bash
kubectl apply -f monitoring/grafana/dashboards/
```

## 🚨 Alert Rules

### Default Alerts

The stack includes 100+ pre-configured alerts:

- Node resource usage
- Pod crashes and restarts
- API server health
- etcd health
- Persistent volume issues
- Certificate expiration

### Custom GameHub Alerts

Located in `monitoring/prometheus/rules/`:

- `gamehub-alerts.yaml`: Application-specific alerts
- `high-error-rate.yaml`: HTTP error monitoring
- `hpa-scaling.yaml`: Autoscaling events

Apply custom rules:

```bash
kubectl apply -f monitoring/prometheus/rules/
```

## 🔧 Configuration Files

```
monitoring/
├── helm/
│   └── prometheus-values.yaml          # Helm chart values
├── grafana/
│   ├── dashboards/
│   │   ├── gamehub-overview.json      # Main dashboard
│   │   ├── backend-services.json      # Microservices metrics
│   │   └── frontend-cdn.json          # Frontend/CDN metrics
│   └── datasources/
│       └── prometheus.yaml             # Prometheus datasource
├── prometheus/
│   ├── rules/
│   │   ├── gamehub-alerts.yaml        # Custom alert rules
│   │   └── recording-rules.yaml       # Recording rules
│   └── servicemonitors/
│       ├── auth-service.yaml          # Auth service monitoring
│       ├── score-service.yaml         # Score service monitoring
│       └── ranking-service.yaml       # Ranking service monitoring
└── scripts/
    ├── install-monitoring.sh          # Installation script
    ├── uninstall-monitoring.sh        # Cleanup script
    └── update-slack-webhook.sh        # Update Slack config
```

## 📝 ServiceMonitors

ServiceMonitors tell Prometheus where to scrape metrics:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: auth-service
  namespace: gamehub
spec:
  selector:
    matchLabels:
      app: auth-service
  endpoints:
  - port: http
    path: /metrics
    interval: 15s
```

Apply all ServiceMonitors:

```bash
kubectl apply -f monitoring/prometheus/servicemonitors/
```

## 🧪 Testing Alerts

### Trigger a test alert

```bash
# Crash a pod to trigger alert
kubectl delete pod -n gamehub -l app=auth-service

# High memory usage (manual)
kubectl run stress-test --image=polinux/stress -n gamehub -- stress --vm 1 --vm-bytes 256M --timeout 60s

# Check AlertManager
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-alertmanager 9093:9093
# Visit: http://localhost:9093
```

### Test Slack notification

```bash
# Send test alert
kubectl exec -n monitoring prometheus-kube-prometheus-alertmanager-0 -- \
  amtool alert add test_alert \
    severity=critical \
    summary="Test Alert from GameHub" \
    description="This is a test notification"
```

## 📊 Key Metrics to Monitor

### Application Metrics

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# Request duration
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Active users
gamehub_active_users_total

# Game sessions
gamehub_game_sessions_active
```

### Infrastructure Metrics

```promql
# CPU usage per pod
container_cpu_usage_seconds_total

# Memory usage per pod
container_memory_usage_bytes

# Network traffic
rate(container_network_transmit_bytes_total[5m])

# Disk I/O
rate(container_fs_writes_bytes_total[5m])
```

## 🔄 Upgrade Stack

```bash
# Update helm repo
helm repo update

# Upgrade release
helm upgrade prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values monitoring/helm/prometheus-values.yaml
```

## 🗑️ Uninstall

```bash
# Uninstall helm release
helm uninstall prometheus -n monitoring

# Delete CRDs (optional, be careful!)
kubectl delete crd alertmanagerconfigs.monitoring.coreos.com
kubectl delete crd alertmanagers.monitoring.coreos.com
kubectl delete crd podmonitors.monitoring.coreos.com
kubectl delete crd probes.monitoring.coreos.com
kubectl delete crd prometheusagents.monitoring.coreos.com
kubectl delete crd prometheuses.monitoring.coreos.com
kubectl delete crd prometheusrules.monitoring.coreos.com
kubectl delete crd scrapeconfigs.monitoring.coreos.com
kubectl delete crd servicemonitors.monitoring.coreos.com
kubectl delete crd thanosrulers.monitoring.coreos.com

# Delete namespace
kubectl delete namespace monitoring
```

## 🐛 Troubleshooting

### Prometheus not scraping targets

```bash
# Check ServiceMonitor
kubectl get servicemonitor -n gamehub

# Check Prometheus config
kubectl get prometheus -n monitoring -o yaml

# Check logs
kubectl logs -n monitoring prometheus-kube-prometheus-prometheus-0 -c prometheus
```

### Alerts not firing

```bash
# Check PrometheusRule
kubectl get prometheusrule -n monitoring

# Check AlertManager config
kubectl get secret -n monitoring alertmanager-prometheus-kube-prometheus-alertmanager -o yaml

# Test alert rule
kubectl exec -n monitoring prometheus-kube-prometheus-prometheus-0 -- \
  promtool check rules /etc/prometheus/rules/prometheus-*.yaml
```

### Slack notifications not working

```bash
# Check AlertManager logs
kubectl logs -n monitoring alertmanager-prometheus-kube-prometheus-alertmanager-0

# Test webhook manually
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test message from GameHub"}' \
  YOUR_SLACK_WEBHOOK_URL
```

## 📚 Resources

- [kube-prometheus-stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack)
- [Prometheus Operator](https://prometheus-operator.dev/)
- [Grafana Documentation](https://grafana.com/docs/)
- [AlertManager Configuration](https://prometheus.io/docs/alerting/latest/configuration/)
- [PromQL Tutorial](https://prometheus.io/docs/prometheus/latest/querying/basics/)

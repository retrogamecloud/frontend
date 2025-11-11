#!/bin/bash

# Installation script for Prometheus + Grafana + AlertManager
# For GameHub monitoring stack

set -e

echo "🚀 Installing GameHub Monitoring Stack"
echo "======================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if helm is installed
if ! command -v helm &> /dev/null; then
    echo -e "${RED}❌ Helm is not installed${NC}"
    echo "Install from: https://helm.sh/docs/intro/install/"
    exit 1
fi

echo -e "${GREEN}✅ Helm found${NC}"

# Add Prometheus Community Helm repo
echo -e "${BLUE}📦 Adding Prometheus Community Helm repository...${NC}"
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

echo -e "${GREEN}✅ Helm repo updated${NC}"
echo ""

# Create monitoring namespace
echo -e "${BLUE}📁 Creating monitoring namespace...${NC}"
kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -

echo -e "${GREEN}✅ Namespace created${NC}"
echo ""

# Prompt for Slack webhook
echo -e "${YELLOW}🔔 Slack Integration Setup${NC}"
echo ""
read -p "Do you want to configure Slack notifications? (y/n): " configure_slack

if [ "$configure_slack" = "y" ]; then
    echo ""
    echo "Please provide your Slack webhook URL:"
    echo "(Get it from: https://api.slack.com/apps > Incoming Webhooks)"
    echo ""
    read -p "Slack Webhook URL: " slack_webhook
    
    if [ -n "$slack_webhook" ]; then
        echo -e "${BLUE}🔑 Creating Slack webhook secret...${NC}"
        kubectl create secret generic alertmanager-slack \
          --from-literal=webhook-url="$slack_webhook" \
          -n monitoring \
          --dry-run=client -o yaml | kubectl apply -f -
        
        echo -e "${GREEN}✅ Slack webhook configured${NC}"
    else
        echo -e "${YELLOW}⚠️  No webhook provided, skipping Slack configuration${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Skipping Slack configuration${NC}"
fi

echo ""

# Install kube-prometheus-stack
echo -e "${BLUE}📦 Installing kube-prometheus-stack...${NC}"
echo "This may take a few minutes..."
echo ""

helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values monitoring/helm/prometheus-values.yaml \
  --wait \
  --timeout 10m

echo ""
echo -e "${GREEN}✅ Monitoring stack installed successfully!${NC}"
echo ""

# Wait for pods to be ready
echo -e "${BLUE}⏳ Waiting for pods to be ready...${NC}"
kubectl wait --for=condition=ready pod --all -n monitoring --timeout=5m

echo -e "${GREEN}✅ All pods are ready${NC}"
echo ""

# Get Grafana password
echo -e "${BLUE}🔐 Getting Grafana credentials...${NC}"
GRAFANA_PASSWORD=$(kubectl get secret -n monitoring prometheus-grafana -o jsonpath="{.data.admin-password}" | base64 --decode)

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Installation Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📊 Access Grafana:${NC}"
echo "   kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80"
echo "   URL: http://localhost:3000"
echo "   Username: admin"
echo "   Password: $GRAFANA_PASSWORD"
echo ""
echo -e "${BLUE}📈 Access Prometheus:${NC}"
echo "   kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090"
echo "   URL: http://localhost:9090"
echo ""
echo -e "${BLUE}🔔 Access AlertManager:${NC}"
echo "   kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-alertmanager 9093:9093"
echo "   URL: http://localhost:9093"
echo ""
echo -e "${BLUE}📦 Deployed Components:${NC}"
kubectl get pods -n monitoring
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Configure ServiceMonitors: kubectl apply -f monitoring/prometheus/servicemonitors/"
echo "2. Create custom alerts: kubectl apply -f monitoring/prometheus/rules/"
echo "3. Import Grafana dashboards: monitoring/grafana/dashboards/"
echo ""
echo -e "${GREEN}✅ Happy Monitoring!${NC}"

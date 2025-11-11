#!/bin/bash

# Script to update Slack webhook for AlertManager

set -e

echo "🔔 Update Slack Webhook for AlertManager"
echo "========================================="
echo ""

if [ -z "$1" ]; then
    echo "Usage: $0 <slack-webhook-url>"
    echo ""
    echo "Example:"
    echo "  $0 https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
    echo ""
    echo "Get your webhook URL from:"
    echo "  https://api.slack.com/apps > Incoming Webhooks"
    exit 1
fi

WEBHOOK_URL=$1

echo "📝 Creating/updating Slack webhook secret..."
kubectl create secret generic alertmanager-slack \
  --from-literal=webhook-url="$WEBHOOK_URL" \
  -n monitoring \
  --dry-run=client -o yaml | kubectl apply -f -

echo "✅ Secret updated"
echo ""
echo "🔄 Restarting AlertManager to pick up new configuration..."
kubectl rollout restart statefulset alertmanager-prometheus-kube-prometheus-alertmanager -n monitoring

echo ""
echo "⏳ Waiting for AlertManager to be ready..."
kubectl rollout status statefulset alertmanager-prometheus-kube-prometheus-alertmanager -n monitoring --timeout=2m

echo ""
echo "✅ Slack webhook updated successfully!"
echo ""
echo "📊 Test the integration by triggering an alert:"
echo "   kubectl delete pod -n gamehub -l app=auth-service"

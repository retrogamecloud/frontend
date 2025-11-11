# GameHub - AWS EKS Deployment Guide

This guide covers deploying GameHub to Amazon Elastic Kubernetes Service (EKS) in production.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        AWS Cloud                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Application Load Balancer (ALB)           │ │
│  │         (managed by AWS Load Balancer Controller)      │ │
│  └───────────────────────┬────────────────────────────────┘ │
│                          │                                   │
│  ┌───────────────────────┴────────────────────────────────┐ │
│  │                   EKS Cluster                          │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │           Ingress Controller (Kong)              │ │ │
│  │  │          (1 pod, HPA 1-5 replicas)              │ │ │
│  │  └─────────────────────┬────────────────────────────┘ │ │
│  │                        │                              │ │
│  │  ┌─────────────────────┴─────────────────────────────┐ │ │
│  │  │           Backend Services (ClusterIP)            │ │ │
│  │  │  ┌────────────┐ ┌────────────┐ ┌───────────────┐ │ │ │
│  │  │  │ Auth       │ │ Score      │ │ Ranking       │ │ │ │
│  │  │  │ Service    │ │ Service    │ │ Service       │ │ │ │
│  │  │  │ (1-3 pods) │ │ (1-5 pods) │ │ (1-3 pods)   │ │ │ │
│  │  │  └──────┬─────┘ └──────┬─────┘ └───────┬───────┘ │ │ │
│  │  │         └───────────────┴────────────────┘         │ │ │
│  │  │                         │                          │ │ │
│  │  │  ┌──────────────────────┴───────────────────────┐ │ │ │
│  │  │  │           Data Layer (StatefulSets)          │ │ │ │
│  │  │  │  ┌──────────────┐    ┌───────────────┐      │ │ │ │
│  │  │  │  │  PostgreSQL  │    │  Redis        │      │ │ │ │
│  │  │  │  │  (RDS)       │    │  (ElastiCache)│      │ │ │ │
│  │  │  │  └──────────────┘    └───────────────┘      │ │ │ │
│  │  │  └──────────────────────────────────────────────┘ │ │ │
│  │  │                                                    │ │ │
│  │  │  ┌──────────────────────────────────────────────┐ │ │ │
│  │  │  │       Game Frontends (10 deployments)        │ │ │ │
│  │  │  │  Each with HPA (1-10 pods)                  │ │ │ │
│  │  │  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐        │ │ │ │
│  │  │  │  │Doom│ │Wolf│ │Tetr│ │MK  │ │... │        │ │ │ │
│  │  │  │  └────┘ └────┘ └────┘ └────┘ └────┘        │ │ │ │
│  │  │  └──────────────────────────────────────────────┘ │ │ │
│  │  └────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              Container Registry (ECR)                     │ │
│  │  - gamehub-frontend-doom:v1.0.0                          │ │
│  │  - gamehub-frontend-tetris:v1.0.0                        │ │
│  │  - gamehub-auth-service:v1.0.0                           │ │
│  │  - gamehub-score-service:v1.0.0                          │ │
│  │  - gamehub-ranking-service:v1.0.0                        │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **AWS CLI** installed and configured
   ```bash
   aws --version
   aws configure
   ```

2. **eksctl** installed (EKS cluster management tool)
   ```bash
   # Linux/macOS
   curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
   sudo mv /tmp/eksctl /usr/local/bin
   ```

3. **kubectl** installed
   ```bash
   kubectl version --client
   ```

4. **Docker** installed for building images

5. **AWS Account** with permissions for:
   - EKS
   - ECR
   - VPC
   - EC2
   - RDS (optional, for managed PostgreSQL)
   - ElastiCache (optional, for managed Redis)
   - IAM
   - CloudFormation

## Step 1: Create ECR Repositories

```bash
# Set your AWS region
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create repositories for all services
SERVICES=(
    "gamehub-auth-service"
    "gamehub-score-service"
    "gamehub-ranking-service"
    "gamehub-frontend-doom"
    "gamehub-frontend-wolf"
    "gamehub-frontend-tetris"
    "gamehub-frontend-mortalkombat"
    "gamehub-frontend-dangerousdave2"
    "gamehub-frontend-digger"
    "gamehub-frontend-duke3d"
    "gamehub-frontend-heroesofmightandmagic2"
    "gamehub-frontend-lostvikings"
    "gamehub-frontend-streetfighter2"
)

for service in "${SERVICES[@]}"; do
    aws ecr create-repository \
        --repository-name "$service" \
        --region "$AWS_REGION" \
        --image-scanning-configuration scanOnPush=true \
        --encryption-configuration encryptionType=AES256 || echo "Repository $service might already exist"
done
```

## Step 2: Build and Push Images

```bash
# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Set version tag
export VERSION=v1.0.0

# Build and push game frontend images
export DOCKER_REGISTRY="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
export IMAGE_VERSION="$VERSION"

./scripts/build-game-images.sh --push

# Build and push backend services
cd services/auth-service
docker build -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/gamehub-auth-service:$VERSION .
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/gamehub-auth-service:$VERSION

cd ../score-service
docker build -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/gamehub-score-service:$VERSION .
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/gamehub-score-service:$VERSION

cd ../ranking-service
docker build -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/gamehub-ranking-service:$VERSION .
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/gamehub-ranking-service:$VERSION
```

## Step 3: Create EKS Cluster

```bash
# Create cluster configuration file
cat > eks-cluster-config.yaml <<EOF
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: gamehub-cluster
  region: ${AWS_REGION}
  version: "1.28"

# VPC Configuration
vpc:
  cidr: 10.0.0.0/16
  nat:
    gateway: Single # Use NAT Gateway for private subnets

# IAM Configuration
iam:
  withOIDC: true

# Node Groups
managedNodeGroups:
  - name: gamehub-nodes
    instanceType: t3.medium
    minSize: 3
    maxSize: 10
    desiredCapacity: 3
    volumeSize: 30
    privateNetworking: true
    labels:
      role: worker
    tags:
      k8s.io/cluster-autoscaler/enabled: "true"
      k8s.io/cluster-autoscaler/gamehub-cluster: "owned"
    iam:
      withAddonPolicies:
        autoScaler: true
        albIngress: true
        cloudWatch: true
        ebs: true

# CloudWatch Logging
cloudWatch:
  clusterLogging:
    enableTypes: ["api", "audit", "authenticator", "controllerManager", "scheduler"]

# Add-ons
addons:
  - name: vpc-cni
    version: latest
  - name: coredns
    version: latest
  - name: kube-proxy
    version: latest
  - name: aws-ebs-csi-driver
    version: latest
EOF

# Create the cluster (takes 15-20 minutes)
eksctl create cluster -f eks-cluster-config.yaml
```

## Step 4: Configure kubectl

```bash
# Update kubeconfig
aws eks update-kubeconfig --region $AWS_REGION --name gamehub-cluster

# Verify connection
kubectl get nodes
```

## Step 5: Install Cluster Add-ons

### Metrics Server (for HPA)
```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### AWS Load Balancer Controller
```bash
# Create IAM policy
curl -o iam-policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.6.2/docs/install/iam_policy.json
aws iam create-policy \
    --policy-name AWSLoadBalancerControllerIAMPolicy \
    --policy-document file://iam-policy.json

# Create IAM role and service account
eksctl create iamserviceaccount \
  --cluster=gamehub-cluster \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --attach-policy-arn=arn:aws:iam::$AWS_ACCOUNT_ID:policy/AWSLoadBalancerControllerIAMPolicy \
  --override-existing-serviceaccounts \
  --approve

# Install controller using Helm
helm repo add eks https://aws.github.io/eks-charts
helm repo update
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=gamehub-cluster \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

### Cluster Autoscaler
```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml

# Add cluster name annotation
kubectl -n kube-system annotate deployment.apps/cluster-autoscaler cluster-autoscaler.kubernetes.io/safe-to-evict="false"

# Set image version (match your K8s version)
kubectl -n kube-system set image deployment.apps/cluster-autoscaler cluster-autoscaler=k8s.gcr.io/autoscaling/cluster-autoscaler:v1.28.2
```

## Step 6: Create Namespace and Secrets

```bash
# Create namespace
kubectl create namespace gamehub

# Create database secrets
kubectl create secret generic postgres-auth-secret \
  --from-literal=username=postgres \
  --from-literal=password=YOUR_SECURE_PASSWORD_HERE \
  --from-literal=database=auth_db \
  --namespace=gamehub

# Create JWT secret
kubectl create secret generic jwt-secret \
  --from-literal=JWT_SECRET=YOUR_JWT_SECRET_HERE \
  --from-literal=REFRESH_TOKEN_SECRET=YOUR_REFRESH_SECRET_HERE \
  --namespace=gamehub

# Create ECR pull secret (if using private repos)
kubectl create secret docker-registry ecr-secret \
  --docker-server=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com \
  --docker-username=AWS \
  --docker-password=$(aws ecr get-login-password --region $AWS_REGION) \
  --namespace=gamehub
```

## Step 7: Update Kubernetes Manifests for AWS

Update image references in all deployment files to use ECR URLs:

```bash
# Script to update all deployments
find infrastructure/kubernetes -name "*.yaml" -type f -exec sed -i \
  "s|imagePullPolicy: Never|imagePullPolicy: IfNotPresent|g" {} \;

find infrastructure/kubernetes/games/deployments -name "*.yaml" -type f -exec sed -i \
  "s|image: gamehub-frontend-|image: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/gamehub-frontend-|g" {} \;

sed -i "s|image: gamehub-auth-service|image: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/gamehub-auth-service|g" infrastructure/kubernetes/games/backend-services.yaml
sed -i "s|image: gamehub-score-service|image: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/gamehub-score-service|g" infrastructure/kubernetes/games/backend-services.yaml
sed -i "s|image: gamehub-ranking-service|image: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/gamehub-ranking-service|g" infrastructure/kubernetes/games/backend-services.yaml
```

## Step 8: Deploy to EKS

```bash
# Deploy backend services (PostgreSQL, Redis, Auth, Score, Ranking)
kubectl apply -f infrastructure/kubernetes/games/backend-services.yaml

# Wait for backend to be ready
kubectl wait --for=condition=ready pod -l app=postgres-auth -n gamehub --timeout=300s
kubectl wait --for=condition=ready pod -l app=auth-service -n gamehub --timeout=300s

# Deploy Kong API Gateway
kubectl apply -f infrastructure/kubernetes/games/kong-deployment.yaml

# Deploy game frontends
kubectl apply -f infrastructure/kubernetes/games/deployments/

# Verify deployments
kubectl get pods -n gamehub
kubectl get svc -n gamehub
kubectl get hpa -n gamehub
```

## Step 9: Expose Services with ALB Ingress

Create an Ingress resource for ALB:

```yaml
# infrastructure/aws/ingress-alb.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: gamehub-ingress
  namespace: gamehub
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:REGION:ACCOUNT:certificate/CERT_ID # Add your ACM certificate
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
    alb.ingress.kubernetes.io/ssl-redirect: '443'
    alb.ingress.kubernetes.io/healthcheck-path: /health
    alb.ingress.kubernetes.io/healthcheck-interval-seconds: '30'
    alb.ingress.kubernetes.io/success-codes: '200'
spec:
  rules:
  - host: gamehub.yourdomain.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: kong
            port:
              number: 8000
      - path: /
        pathType: Prefix
        backend:
          service:
            name: doom-game-service  # Default game
            port:
              number: 8081
```

```bash
kubectl apply -f infrastructure/aws/ingress-alb.yaml

# Get ALB DNS name
kubectl get ingress gamehub-ingress -n gamehub -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

## Step 10: Configure Route 53 (Optional)

```bash
# Get ALB DNS
ALB_DNS=$(kubectl get ingress gamehub-ingress -n gamehub -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Create Route 53 hosted zone if needed
aws route53 create-hosted-zone --name yourdomain.com --caller-reference $(date +%s)

# Create A record pointing to ALB (use AWS Console or CLI)
```

## Monitoring and Logging

### CloudWatch Container Insights
```bash
# Install Container Insights
ClusterName=gamehub-cluster
RegionName=$AWS_REGION
FluentBitHttpPort='2020'
FluentBitReadFromHead='Off'
[[ ${FluentBitReadFromHead} = 'On' ]] && FluentBitReadFromTail='Off'|| FluentBitReadFromTail='On'
[[ -z ${FluentBitHttpPort} ]] && FluentBitHttpServer='Off' || FluentBitHttpServer='On'
curl https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/quickstart/cwagent-fluent-bit-quickstart.yaml | sed 's/{{cluster_name}}/'${ClusterName}'/;s/{{region_name}}/'${RegionName}'/;s/{{http_server_toggle}}/"'${FluentBitHttpServer}'"/;s/{{http_server_port}}/"'${FluentBitHttpPort}'"/;s/{{read_from_head}}/"'${FluentBitReadFromHead}'"/;s/{{read_from_tail}}/"'${FluentBitReadFromTail}'"/' | kubectl apply -f -
```

## Cost Optimization

1. **Use Spot Instances** for game frontend pods (non-critical)
2. **RDS/ElastiCache** instead of pods for databases (more reliable, managed backups)
3. **S3 + CloudFront** for .jsdos files instead of storing in containers
4. **Cluster Autoscaler** to scale nodes down during low traffic
5. **HPA** properly configured for each deployment

## Security Best Practices

1. **Secrets Management**: Use AWS Secrets Manager or Systems Manager Parameter Store
2. **Network Policies**: Implement Kubernetes Network Policies
3. **Pod Security Standards**: Enable Pod Security Admission
4. **IAM Roles**: Use IRSA (IAM Roles for Service Accounts)
5. **Private Subnets**: Run worker nodes in private subnets
6. **Security Groups**: Restrict access appropriately
7. **Image Scanning**: Enable ECR image scanning
8. **Encryption**: Enable encryption at rest (EBS, RDS, ElastiCache)

## Backup and Disaster Recovery

```bash
# Install Velero for cluster backups
velero install \
    --provider aws \
    --plugins velero/velero-plugin-for-aws:v1.8.0 \
    --bucket gamehub-backups \
    --backup-location-config region=$AWS_REGION \
    --snapshot-location-config region=$AWS_REGION \
    --secret-file ./credentials-velero

# Create backup schedule
velero schedule create gamehub-daily --schedule="0 2 * * *"
```

## Cleanup

```bash
# Delete all resources
kubectl delete namespace gamehub
eksctl delete cluster --name gamehub-cluster --region $AWS_REGION

# Delete ECR repositories
for service in "${SERVICES[@]}"; do
    aws ecr delete-repository --repository-name "$service" --region "$AWS_REGION" --force
done
```

## Estimated Monthly Costs (us-east-1)

- **EKS Control Plane**: $73/month
- **EC2 Instances** (3x t3.medium): ~$90/month
- **ALB**: ~$20/month + data transfer
- **NAT Gateway**: ~$32/month
- **RDS (if used)**: ~$50-150/month depending on instance type
- **ElastiCache (if used)**: ~$40-100/month
- **Data Transfer**: Variable
- **CloudWatch Logs**: ~$5-20/month

**Total Estimated**: $310-485/month (without traffic costs)

## Next Steps

1. Set up CI/CD pipeline (GitHub Actions, GitLab CI, or AWS CodePipeline)
2. Implement proper monitoring and alerting
3. Set up automated testing
4. Configure auto-scaling policies based on real traffic patterns
5. Implement caching strategy (CloudFront + S3 for static assets)

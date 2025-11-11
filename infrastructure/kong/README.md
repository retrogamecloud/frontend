# Kong API Gateway Configuration

This directory contains the configuration for Kong API Gateway, which serves as the unified entry point for all GameHub microservices.

## Kong Configuration

The `kong.yml` file defines:

- **Services**: Upstream microservices (auth, user, score, ranking, game-catalog)
- **Routes**: URL paths and HTTP methods for each service
- **Plugins**: Rate limiting, CORS, metrics, and transformations

## Key Features

### Rate Limiting
- Auth endpoints: 20 requests/minute (stricter for security)
- Read-only endpoints: 200 requests/minute
- Write endpoints: 100 requests/minute

### CORS
- Configured for all services
- Allows credentials and common headers
- Suitable for frontend cross-origin requests

### Monitoring
- Prometheus plugin enabled for metrics collection
- Exposes metrics at `:8001/metrics`

## Routes

| Path | Service | Methods |
|------|---------|---------|
| `/api/auth/*` | auth-service | GET, POST, PUT, DELETE |
| `/api/users/*` | user-service | GET, POST, PUT, DELETE |
| `/api/scores/*` | score-service | GET, POST, PUT |
| `/api/rankings/*` | ranking-service | GET |
| `/api/games/*` | game-catalog-service | GET |
| `/api/tags` | game-catalog-service | GET |

## Usage

### Docker Compose
Kong is automatically configured when using docker-compose:
```bash
docker-compose up -d kong
```

### Manual Configuration
```bash
# Apply configuration
deck sync --config kong.yml

# Verify routes
curl http://localhost:8000/api/games

# Check Kong health
curl http://localhost:8001/status
```

## Endpoints

- **API Gateway**: `http://localhost:8000`
- **Admin API**: `http://localhost:8001`
- **Metrics**: `http://localhost:8001/metrics`

## Authentication Flow

1. Client calls `/api/auth/login` → receives JWT tokens
2. Client includes `Authorization: Bearer <token>` in subsequent requests
3. Protected services verify token with auth-service
4. Kong forwards authenticated requests to backend services

# RetroGameCloud - Frontend

[![CI/CD Pipeline](https://github.com/retrogamecloud/frontend/actions/workflows/cicd.yml/badge.svg)](https://github.com/retrogamecloud/frontend/actions/workflows/cicd.yml/badge.svg)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green?logo=node.js)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-5.1-white?logo=express)](https://expressjs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Interfaz web de RetroGameCloud. Servidor Express que sirve HTML/CSS/JS con emulador DOS.js integrado. Permite a los usuarios jugar juegos clásicos directamente en el navegador, ver puntuaciones y competir en rankings.

**README general:** [Ir al README Principal](https://github.com/retrogamecloud/.github/blob/main/profile/README.md)  
**Documentación:** [Acceder a la Wiki](https://retrogamecloud.mintlify.app/)

---

## Tabla de Contenidos

- [Descripción del Repositorio](#descripción-del-repositorio)
- [Funcionalidad Principal](#funcionalidad-principal)
- [Stack Tecnológico](#stack-tecnológico)
- [Instalación Local](#instalación-local)
- [Configuración](#configuración)
- [Despliegue con Docker](#despliegue-con-docker)
- [NPM Scripts](#npm-scripts)
- [Pipeline CI/CD](#pipeline-cicd)
- [Rutas y Páginas](#rutas-y-páginas)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Rollback & Limpieza](#rollback--limpieza)
- [Seguridad](#seguridad)

---

## Descripción del Repositorio

Este repositorio contiene la **interfaz web frontend** de RetroGameCloud. Es un servidor Express que:

- ✅ Sirve HTML/CSS/JS estático
- ✅ Integra emulador DOS.js para jugar retro games
- ✅ Proporciona UI para login/registro
- ✅ Muestra lista de juegos disponibles
- ✅ Visualiza perfiles de usuario y estadísticas
- ✅ Comunica con Backend API vía Kong Gateway
- ✅ Maneja tokens JWT en localStorage
- ✅ Soporte responsive y tema retro

El frontend **NO contiene lógica de negocio**, solo UI. Toda la lógica se delega al Backend API.

---

## Funcionalidad Principal

### 1. Páginas Públicas

- **`/` (index.html)** - Login/Register
  - Formulario de login
  - Registro de nuevos usuarios
  - Validación cliente-side
  - Tema retro ASCII

### 2. Páginas Autenticadas

- **`/games.html`** - Catálogo de Juegos
  - Lista de juegos disponibles
  - Búsqueda y filtros
  - Clickear para jugar
  - Ver records personales

- **`/profile.html`** - Perfil de Usuario
  - Datos personales (username, email, avatar)
  - Estadísticas (juegos jugados, score total)
  - Editar perfil
  - Logout

- **`/rankings.html`** - Leaderboards
  - Rankings globales (Top 100)
  - Rankings por juego
  - Posición actual del usuario
  - Historial de cambios

### 3. Modal de Juego

- **Emulador DOS.js**
  - Juega juegos en HTML5/Canvas
  - Controles configurables
  - Audio/Video soportados
  - Pausa/Resume
  - Salir del juego

---

## Stack Tecnológico

### Frontend Runtime

| Componente | Versión | Descripción |
|---|---|---|
| **Node.js** | 20 (LTS) | Servidor runtime |
| **Express** | 5.1.0 | Servidor web minimalista |

### Frontend UI

| Componente | Descripción |
|---|---|
| **HTML5** | Markup semántico |
| **CSS3** | Estilos retro/responsive |
| **Vanilla JavaScript** | Sin frameworks (Fetch API) |
| **jsdos.js** | Emulador DOS.js |
| **localStorage** | Persistencia de tokens JWT |

### Development & Testing

| Herramienta | Versión | Propósito |
|---|---|---|
| **Jest** | 29.7.0 | Test runner |
| **Supertest** | 6.3.3 | Tests HTTP |

### Integración

- **Kong Gateway:** Proxy hacia Backend API
- **Backend API:** API REST en puerto 3000
- **Games CDN:** Assets pesados en puerto 8086

---

## Instalación Local

### Requisitos Previos

- **Node.js 20+** ([Descargar](https://nodejs.org/))
- **npm o yarn**
- **Git**

### Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/retrogamecloud/frontend.git
cd frontend
```

### Paso 2: Instalar Dependencias

```bash
npm install
```

### Paso 3: Configurar Variables de Entorno

```bash
# Copiar template
cp .env.example .env.local

# Editar
nano .env.local
```

**Variables requeridas:**

```bash
# .env.local
NODE_ENV=development
PORT=8080
API_GATEWAY_URL=http://localhost:8000
CDN_BASE_URL=http://localhost:8086
```

### Paso 4: Iniciar el Servidor

```bash
npm start

# Deberías ver:
# Frontend corriendo en http://localhost:8080
```

### Paso 5: Acceder

```
http://localhost:8080
```

---

## Configuración

### Variables de Entorno

```bash
# Desarrollo
NODE_ENV=development
PORT=8080
API_GATEWAY_URL=http://localhost:8000
CDN_BASE_URL=http://localhost:8086

# Producción
NODE_ENV=production
PORT=80
API_GATEWAY_URL=https://retrogamehub.games
CDN_BASE_URL=https://retrogamehub.games/cdn
```

### Archivo `.env.example`

Ver `.env.example` en el repositorio para template.

### Secrets en AWS

> **IMPORTANTE:** Todos los secrets (credenciales, tokens, contraseñas, claves de API) se almacenan **exclusivamente en AWS Secrets Manager** y **NO están en este repositorio público**. No hay información sensible en el código fuente.

---

## Despliegue con Docker

### Opción A: Docker Compose (con todo)

```bash
# Desde root del proyecto
docker-compose up -d

# Incluye: Backend, Frontend, Kong, PostgreSQL, CDN

# Acceder
open http://localhost:8000
```

### Opción B: Docker Standalone

```bash
# Construir
docker build -t retrogamehub/frontend:latest .

# Ejecutar
docker run -d \
  --name frontend \
  -p 8081:8080 \
  -e NODE_ENV=production \
  -e API_GATEWAY_URL=http://kong:8000 \
  retrogamehub/frontend:latest

# Acceder
open http://localhost:8081
```

### Verificar Despliegue

```bash
curl -I http://localhost:8081

# Esperado:
# HTTP/1.1 200 OK
# Content-Type: text/html
```

---

## NPM Scripts

| Script | Comando | Descripción |
|--------|---------|-------------|
| `start` | `node server.js` | Inicia el servidor |
| `start:refactored` | `node server.wrapper.js` | Versión refactorizada |
| `dev` | `nodemon server.js` | Modo desarrollo (si existe nodemon) |
| `test` | `jest` | Ejecutar tests |
| `test:unit` | `jest tests/unit` | Tests unitarios |
| `test:integration` | `jest tests/integration` | Tests de integración |
| `test:coverage` | `jest --coverage` | Con cobertura |
| `test:watch` | `jest --watch` | Modo watch |

### Ejemplos

```bash
# Desarrollo con auto-reload
npm run dev

# Tests con cobertura
npm run test:coverage

# Ver cobertura
open coverage/index.html
```

---

## Pipeline CI/CD

Este repositorio implementa un pipeline CI/CD completamente automatizado mediante GitHub Actions que valida, construye y despliega el frontend de forma segura.

### Validaciones Automáticas

Cada vez que haces un push o abres un Pull Request, se ejecutan automáticamente:

✅ **Testing:** Jest con cobertura mínima 70% (`npm test`)  
✅ **Linting:** ESLint valida la calidad del código (`npm run lint`)  
✅ **Seguridad de Imágenes:** Trivy escanea vulnerabilidades en Docker  
✅ **Análisis Estático:** SonarCloud detecta code smells, bugs y security hotspots  
✅ **Build:** Se construye la imagen Docker y se pushea a GitHub Container Registry (GHCR)  
✅ **Despliegue:** Actualiza automáticamente los manifiestos Kubernetes en el repositorio de infraestructura  

### Workflows Disponibles

| Workflow | Trigger | Descripción |
|---|---|---|
| **cicd.yml** | Push a `main`, PR | Testing, validación y despliegue automático |
| **rollback-frontend.yml** | Manual (workflow_dispatch) | Revertir a una versión anterior si es necesario |
| **dependabot.yml** | Scheduled (diario) | Mantener dependencias actualizadas |

**Documentación detallada:** Ver [`.github/README-WF.md`](./.github/README-WF.md) para más información sobre cada workflow, triggers, variables y secrets.

---

## Rutas y Páginas

### Rutas Públicas

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/` | `index.html` | Login / Registro |
| `/health` | (API) | Health check |

### Rutas Protegidas (requieren login)

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/games.html` | `games.html` | Catálogo de juegos |
| `/profile.html` | `profile.html` | Perfil del usuario |
| `/rankings.html` | `rankings.html` | Leaderboards |

### Flujo de Autenticación

```
User → login() → POST /api/auth/login → Get JWT
                 Store in localStorage
                 Redirect to /games.html

Cada request:
  Authorization: Bearer <JWT>
  Si es inválido → redirect a /
```

---

## Estructura del Proyecto

```
frontend/
├── index.html                    # Página de login/registro
├── games.html                    # Catálogo de juegos
├── profile.html                  # Perfil de usuario
├── rankings.html                 # Leaderboards
├── server.js                     # Punto de entrada Express
├── server.wrapper.js             # Versión refactorizada
├── package.json                  # Dependencias
├── package-lock.json             # Lockfile
├── jest.config.json              # Config de Jest
├── Dockerfile                    # Imagen Docker
├── docker-compose.yml            # Orquestación (en root)
├── .env.example                  # Variables de ejemplo
├── README.md                     # Este archivo
│
├── src/
│   ├── config/
│   │   └── paths.js              # Paths helper
│   ├── middleware/
│   │   └── cacheMiddleware.js    # No-cache headers
│   ├── routes/
│   │   └── routes.js             # Setup de rutas
│   └── utils/
│       └── validators.js         # Client-side validators
│
├── jsdos/
│   ├── dos.min.js                # Emulador DOS.js
│   └── games/
│       ├── doom.zip              # Juegos precompilados
│       └── ...
│
├── tests/
│   ├── README.md                 # Guía de testing
│   ├── unit/
│   │   ├── pages.test.js
│   │   └── ...
│   └── integration/
│       ├── login.test.js
│       ├── games.test.js
│       └── ...
│
├── public/ (si existe)
│   └── assets/
│       ├── images/
│       ├── icons/
│       └── fonts/
│
├── coverage/
    └── (generado por Jest)
│
└── .github/
    ├── workflows/
    │   ├── cicd.yml              # Pipeline CI/CD (Testing, Linting, Build, Deploy)
    │   └── rollback-frontend.yml # Rollback manual
    ├── dependabot.yml            # Actualizaciones automáticas de dependencias
    └── README-WF.md              # Documentación detallada de workflows
```

---

## Testing

### Requisitos

- Cobertura mínima: 70%
- Tests unitarios + integración
- Backend corriendo (para tests de integración)

### Ejecutar Tests

```bash
# Todos
npm test

# Solo unitarios
npm run test:unit

# Solo integración (requiere Backend)
npm run test:integration

# Con cobertura
npm run test:coverage

# Modo watch
npm run test:watch
```

### Ejemplos de Tests

```javascript
// tests/unit/pages.test.js
describe('Login Page', () => {
  it('should display login form', () => {
    // Test de DOM
  });

  it('should validate email format', () => {
    // Test de validators
  });
});

// tests/integration/login.test.js
describe('Login Flow', () => {
  it('should login and redirect to games', async () => {
    // Test HTTP contra Backend
  });
});
```

---

## Troubleshooting

### Error: Cannot find module 'express'

```bash
npm install
```

### Error: Port 8080 already in use

```bash
# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :8080
kill -9 <PID>

# O usar puerto diferente
PORT=8090 npm start
```

### Error: API_GATEWAY_URL not set

```bash
# Verificar .env.local
cat .env.local | grep API_GATEWAY_URL

# Debe ser accesible:
curl http://localhost:8000/api
```

### Error: Emulador DOS.js no carga

```bash
# Verificar que jsdos/ existe
ls -la jsdos/

# Verificar CDN está corriendo
curl http://localhost:8086

# Verificar paths en config
cat src/config/paths.js
```

### Frontend conecta pero error 401

```javascript
// JWT expirado o inválido
localStorage.removeItem('accessToken');
// Volver a login
```

---

## Rollback & Limpieza

### Rollback de Cambios

```bash
# Ver history
git log --oneline -10

# Volver a versión anterior
git reset --hard <commit-hash>

# Push a repo
git push origin main --force-with-lease
```

### Limpiar Node Modules

```bash
rm -rf node_modules package-lock.json
npm install
```

### Limpiar Docker

```bash
# Parar contenedor
docker stop frontend

# Eliminar
docker rm frontend

# Eliminar imagen
docker rmi retrogamehub/frontend:latest

# Reconstruir
docker build -t retrogamehub/frontend:latest .
```

### Resetear Todo

```bash
docker-compose down -v
rm -rf node_modules
npm install
npm start
```

---

## Seguridad

### Token Management

```javascript
// Guardar token después de login
localStorage.setItem('accessToken', data.accessToken);

// Usar en cada request
fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  }
});

// Limpiar al logout
localStorage.removeItem('accessToken');
localStorage.removeItem('username');
```

### CORS

- Backend debe permitir origen del frontend
- Kong Gateway configura CORS
- Si error CORS:
  - Verificar `API_GATEWAY_URL` correcto
  - Verificar Kong tiene CORS habilitado

### Validación

```javascript
// Client-side (NO confiar solo en esto)
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Server-side (confiar SIEMPRE en esto)
// Backend valida también
```

---

## Responsive Design

- Mobile first approach
- Breakpoints: 768px (tablet), 1024px (desktop)
- Touch-friendly inputs
- Viewport meta tag configurado

---

## Tema y Estilos

**Tema retro:**
- Colores: Verde neón (#00ff88), fondo oscuro
- Fuentes: Monospace (Monaco, Courier)
- Efecto scan lines animado
- ASCII art para logo

Personalización:
```css
:root {
  --primary-color: #00ff88;
  --bg-color: #0a0e27;
  --text-color: #ffffff;
}
```

---

## Integración con Backend

### Endpoints Usados

```javascript
// Autenticación
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout

// Usuarios
GET /api/users/:userId
PUT /api/users/:userId
GET /api/users/:userId/stats

// Juegos
GET /api/games
GET /api/games/:gameId

// Puntuaciones
POST /api/scores
GET /api/scores

// Rankings
GET /api/rankings/global
GET /api/rankings/games/:gameId
```

---

## Enlaces Útiles

### Documentación del Proyecto
- **README general:** [/README.md](/../README.md)
- **Documentación:** [Wiki](https://retrogamecloud.mintlify.app/)
- **Workflows CI/CD:** [.github/README-WF.md](./.github/README-WF.md)
- **Testing:** [tests/README.md](./tests/README.md)

### Repositorios Relacionados
- [Backend API](https://github.com/retrogamecloud/backend/blob/main/README.md)
- [Kong Gateway](https://github.com/retrogamecloud/kong/blob/main/README.md)
- [Kubernetes](https://github.com/retrogamecloud/kubernetes/blob/main/README.md)
- [Infrastructure](https://github.com/retrogamecloud/infrastructure)
- [Documentación Centralizada](https://github.com/retrogamecloud/docs)

### Documentación Externa
- **Express.js:** https://expressjs.com/
- **DOS.js:** http://js-dos.com/
- **MDN Web Docs:** https://developer.mozilla.org/

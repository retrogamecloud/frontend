# Workflows CI/CD - Frontend

Este documento describe los workflows ubicados en `.github/workflows` del repositorio frontend: `cicd.yml` y `rollback-frontend.yml`. Incluye descripción funcional, condiciones de ejecución, variables/secrets utilizados, estructura de jobs y ejemplos prácticos para ejecución manual. Estos workflows están diseñados para asegurar calidad del código, seguridad de imágenes y trazabilidad en despliegues mediante actualización automatizada de manifiestos en el repositorio de infraestructura.

## 📑 Índice

1. **[cicd.yml](#cicdyml)**
   - [Descripción del workflow](#descripción-del-workflow)
   - [Triggers y condiciones de ejecución](#triggers-y-condiciones-de-ejecución)
   - [Variables de entorno](#variables-de-entorno-env)
   - [Secrets requeridos](#secrets-requeridos)
   - [Estructura de jobs](#estructura-de-jobs-paso-a-paso)
   - [Ejemplos de ejecución manual](#ejemplos-de-ejecución-manual-workflow_dispatch)
   - [Validaciones y seguridad](#validaciones-y-seguridad)
   - [Comportamiento ante fallos](#comportamiento-ante-fallos)

2. **[rollback-frontend.yml](#rollback-frontendyml)**
   - [Descripción del workflow](#descripción-del-workflow-1)
   - [Inputs del workflow](#inputs-del-workflow-workflow_dispatch)
   - [Casos de ejecución](#casos-de-ejecución-y-posibilidades)
   - [Secrets esperados](#secrets-esperados)
   - [Validaciones y seguridad](#validaciones-y-seguridad-1)
   - [Ejemplos de ejecución manual](#ejemplos-de-ejecución-manual-workflow_dispatch-1)
   - [Buenas prácticas de rollback](#buenas-prácticas-de-rollback)

3. **[dependabot.yml](#dependabotyml)**
   - [Descripción del workflow](#descripción-del-workflow-2)
   - [Configuración actual activa](#configuración-actual-activa)
   - [Triggers y condiciones de ejecución](#triggers-y-condiciones-de-ejecución-1)
   - [Estructura y flujo paso a paso](#estructura-y-flujo-paso-a-paso)
   - [Límites y políticas](#límites-y-políticas)
   - [Ejemplos de ejecución automática](#ejemplos-de-ejecución-automática)
   - [Validaciones y seguridad](#validaciones-y-seguridad-2)
   - [Comportamiento ante fallos](#comportamiento-ante-fallos-1)
   - [Recomendaciones operativas](#recomendaciones-operativas)

4. **[Notas operativas](#notas-operativas)**

5. **[Guía de troubleshooting](#guía-de-troubleshooting)**
   - [cicd.yml - Problemas más comunes](#cicdyml---problemas-más-comunes)
   - [cicd.yml - Jobs específicos](#cicdyml---jobs-específicos)
   - [rollback-frontend.yml - Problemas más comunes](#rollback-frontendyml---problemas-más-comunes)
   - [dependabot.yml - Problemas más comunes](#dependabotyml---problemas-más-comunes)

6. **[Tabla de Referencia](#tabla-de-referencia-workflows-y-triggers)**
   - [Tabla de workflows y triggers](#tabla-de-referencia-workflows-y-triggers)
   - [Tabla de variables de entorno](#tabla-de-variables-de-entorno)
   - [Tabla de secrets requeridos](#tabla-de-secrets-requeridos)

---

## cicd.yml

### Descripción del workflow
Archivo: [.github/workflows/cicd.yml](https://github.com/retrogamecloud/frontend/blob/main/.github/workflows/cicd.yml)
  - **Pipeline completo de CI/CD:** ejecuta linting, tests, análisis de seguridad, compilación, publicación de imagen y actualización de manifiestos en infraestructura.
  - **Calidad de código:** ESLint/Prettier con avisos no-bloqueantes, tests unitarios e integración, cobertura (Codecov) y análisis SonarCloud.
  - **Seguridad de imagen:** escaneo de vulnerabilidades con Snyk (habilitado por defecto en frontend), bloquea publicación si hay CVEs críticos/altos.
  - **Despliegue automatizado:** publica en Docker Hub y GHCR, actualiza automáticamente manifiestos de Kubernetes y ArgoCD en repo `retrogamecloud/kubernetes`.
  - **Notificaciones:** Slack para fallos críticos (si está habilitado).
  - **Control de concurrencia:** evita ejecuciones simultáneas de mismo workflow en misma rama; cancela runs anteriores si hay nuevo push.

### Triggers y condiciones de ejecución
  - **on: push** a `main` (ignora `*.md`, `.gitignore`). Push con tag `v*.*.*` actúa como release automático.
  - **on: pull_request** hacia `main` (mismas exclusiones de paths). Valida PR sin publicar imagen.
  - **on: workflow_dispatch** con input opcional `tag` para lanzamiento manual controlado.
  - **Detección inteligente de cambios:**
    - Si commit contiene `[no-test]` o `[skip-tests]`, job `tests` se omite.
    - Si SOLO hay cambios en docs/configs triviales (`.md`, `.gitignore`, `.env.example`, etc.), tests se omiten.
    - En caso contrario, siempre ejecutan tests.
  - **Ejecución condicional de jobs:**
    - `build` corre si: `tests` pasó O fue skipped.
    - `push` corre solo si: evento NO es PR AND sin vulnerabilidades críticas.
    - `create-update-branch`, `update-*-manifest`, `create-update-pr` corren si: evento NO es PR AND ambos workflows anteriores pasaron.

### Variables de entorno (env)
  - `REGISTRY_GHCR`: `ghcr.io` (GitHub Container Registry).
  - `REGISTRY_DOCKERHUB`: `docker.io` (Docker Hub).
  - `DOCKERHUB_ORG`: `retrogamehub` (organización/user en Docker Hub).
  - `K8S_REPO`: `retrogamecloud/kubernetes` (repo destino para PRs de manifiestos).
  - `K8S_MANIFEST_FILE`: `04-frontend.yaml` (manifiesto directo de K8S, diferente de backend).
  - `ARGOCD_REPO`: `retrogamecloud/kubernetes` (repo de ArgoCD, mismo que K8S_REPO).
  - `ARGOCD_MANIFEST_FILE`: `argocd/base/frontend-deployment.yaml` (manifiesto GitOps, diferente de backend).
  - `ENABLE_SNYK`: `true` (habilitado por defecto en frontend; diferencia con backend).
  - `ENABLE_SLACK_NOTIFICATIONS`: `true` (habilitado por defecto).

### Secrets requeridos
  - `GITHUB_TOKEN`: automático, acceso a repos y PRs.
  - `SONAR_TOKEN` (opcional): habilita SonarCloud; si falta, análisis se omite con aviso.
  - `SNYK_TOKEN` (recomendado): habilita escaneo Snyk; si falta, bloquea en frontend debido a `ENABLE_SNYK: true`.
  - `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`: credenciales Docker Hub para publicar.
  - `K8S_UPDATE_TOKEN`: token con permisos `write` en `retrogamecloud/kubernetes` (crear ramas, PRs, commits).
  - `SLACK_WEBHOOK_URL` (condicional): webhook de Slack; si falta, notificaciones se omiten.

### Estructura de jobs (paso a paso)

#### 1. `eslint-prettier` (no-bloqueante)
- Clonar repo, setup Node.js 20 con caché npm.
- Ejecuta `npm run lint` si existe (ESLint).
- Ejecuta `npm run format:check` si existe (Prettier).
- Resume resultados en `$GITHUB_STEP_SUMMARY`; no bloquea pipeline.
- `continue-on-error: true` → workflow continúa aunque haya errores.

#### 2. `check-changes` (decisión dinámica)
- Analiza mensaje de commit y archivos modificados.
- Output: `should-test=true/false`.
- Si `[no-test]` en mensaje → `false`.
- Si solo docs/configs → `false`.
- Si cambios en código → `true`.

#### 3. `tests` (condicional: `needs.check-changes.outputs.should-test == 'true'`)
- Setup Node.js, instala deps con `npm ci`.
- `npm run test:unit` → tests unitarios.
- `npm run test:integration` → tests de integración.
- `npm run test:coverage` → genera `coverage/lcov.info`.
- SonarCloud scan (si `SONAR_TOKEN` existe); puede fallar.
- Codecov upload del archivo `coverage/lcov.info`.

#### 4. `build` (condicional: `needs.tests.result == 'success' or 'skipped'`)
- Setup Docker Buildx.
- Login a GHCR (GitHub Container Registry).
- Genera etiqueta de versión:
  - Si input `tag` existe → usa ese.
  - Si push de tag `v*.*.*` → usa ese tag.
  - Si no → usa `sha-<short_sha>`.
- Extrae metadatos Docker (imagen, tags, labels).
- **Build local** (sin push) con `load: true` (carga en daemon local).
- Verifica que imagen se construyó: `docker inspect`.
- **Snyk scan** (si `ENABLE_SNYK=true` Y repo público, **obligatorio en frontend**):
  - Escanea imagen local por vulnerabilidades.
  - Si `high/critical` → falla step y marca `has-vulnerabilities=true`.
  - En frontend, `ENABLE_SNYK: true` siempre, por lo que Snyk SIEMPRE se ejecuta.
- Resume en `$GITHUB_STEP_SUMMARY`.

#### 5. `push` (condicional: evento NO es PR AND `has-vulnerabilities != 'true'`)
- Setup Buildx nuevamente.
- Login Docker Hub + GHCR.
- **Rebuild y push** simultáneamente:
  - Tags: `$DOCKERHUB_ORG/$SERVICE:$IMAGE_TAG`, `latest`, GHCR equivalentes.
  - Usa caché de `build` step anterior.

#### 6. `create-update-branch` (prep de rama en K8S repo)
- Clona `retrogamecloud/kubernetes` en `main`.
- Crea rama `auto/<servicio>-<tag>` si no existe, o reutiliza.
- Output: `branch_name`, `service`, `image_tag`, `version`.

#### 7. `update-kubernetes-manifest` + `update-argocd-manifest` (ambos paralelos)
- Clona `retrogamecloud/kubernetes`, checkout a rama `auto/<servicio>-<tag>`.
- `sed` para actualizar `image: $DOCKERHUB_ORG/$SERVICE:$OLD_TAG` → `$NEW_TAG`.
- Actualiza comentario de versión.
- Commit + push con reintentos y rebase (hasta 3 intentos).

#### 8. `create-update-pr` (si ambos manifiestos actualizados)
- Verifica que rama remota existe y tiene cambios vs `main`.
- Si PR ya existe → no crea otra.
- Si no → `gh pr create` con título, body, etiquetas.
- Output: link a PR.

#### 9. `notify-slack` (si alguno de anteriores falló)
- Corre si: `always()` AND alguno de `tests`, `build`, `push`, etc. falló.
- Envía JSON de Slack con detalles: repos, rama, jobs fallidos, link.

### Ejemplos de ejecución manual (`workflow_dispatch`)

#### Ejemplo 1: Release versionado
```
tag: v2.0.45
→ Resultado:
  - ESLint: OK (avisos solo)
  - Tests: OK (unitarios + integración)
  - Build: Construye retrogamehub/frontend:v2.0.45
  - Snyk: Escanea, sin vulnerabilidades críticas
  - Push: Publica a Docker Hub, GHCR, tag latest
  - PR K8S: Crea PR en retrogamecloud/kubernetes/04-frontend.yaml y argocd/base/frontend-deployment.yaml
  - Slack: Silencio (todo OK)
→ Acción: Revisar PR en K8S repo, mergear, ArgoCD sincroniza
```

#### Ejemplo 2: Sin tag (SHA)
```
tag: (vacío)
→ Resultado:
  - Build: Construye retrogamehub/frontend:sha-a1b2c3d
  - Snyk: Detecta sin vulnerabilidades
  - Push: Publica con tag `sha-a1b2c3d` + `latest`
  - PR K8S: Rama auto/frontend-sha-a1b2c3d-1701561234
→ Acción: Revisar PR, mergear; snapshot estable creado
```

#### Ejemplo 3: Fallo de Snyk (frontend siempre con Snyk activo)
```
tag: v2.0.46
→ Resultado:
  - Build: OK
  - Snyk: Detecta CVE-2024-5678 (high), falla step
  - Push: BLOQUEADO (has-vulnerabilities=true)
  - PR K8S: NO se crea
  - Slack: Notifica "Vulnerabilidades críticas detectadas"
→ Acción: Actualizar dependencia vulnerable, re-push con nuevo tag
```

### Validaciones y seguridad
  - **ESLint/Prettier:** no bloqueantes; se resumen pero permiten continuación.
  - **Tests obligatorios:** a menos que `[skip-tests]` en commit o solo docs.
  - **Snyk gate (SIEMPRE en frontend):** `ENABLE_SNYK: true` permanentemente; bloquea `push` si hay `high/critical`.
  - **Cache multi-layer:** GHCR almacena capas; acelera builds repetidos.
  - **Permisos escalonados:** lectura global, sobrescritura en jobs específicos.
  - **Reintentos en K8S:** manifest update reintenta 3 veces con rebase.

### Comportamiento ante fallos
  - **ESLint/Prettier falla:** aviso, workflow continúa.
  - **Tests falla:** workflow se detiene (condicional).
  - **SonarCloud falla:** si `SONAR_TOKEN`, tests falla.
  - **Snyk falla (frontend):** SIEMPRE activo, bloquea `push` automáticamente.
  - **Docker build falla:** error claro, no hay imagen, workflow detiene.
  - **K8S manifest update falla:** reintenta 3 veces; si persiste, workflow falla sin PR.
  - **Slack webhook inválido:** notificación falla pero workflow continúa.

---

## rollback-frontend.yml

### Descripción del workflow
Archivo: [.github/workflows/rollback-frontend.yml](https://github.com/retrogamecloud/frontend/blob/main/.github/workflows/rollback-frontend.yml)
  - Workflow especializado para revertir rápidamente el despliegue del frontend a una versión de imagen previa conocida en Kubernetes/ArgoCD.
  - Actualiza simultáneamente `04-frontend.yaml` (despliegue directo) y `argocd/base/frontend-deployment.yaml` (GitOps) para mantener coherencia.
  - Valida que la imagen destino existe en Docker Hub antes de proceder (`docker manifest inspect`).
  - Siempre crea una PR en `retrogamecloud/kubernetes` para revisión antes de merge; ArgoCD sincroniza tras merge.

### Inputs del workflow (`workflow_dispatch`)
  - **`version` (requerido):** versión o tag de imagen a restaurar. Formato: `v2.0.40`, `sha-xyz9876`, o `latest`.
  - **`reason` (requerido):** descripción del motivo del rollback (ej: `INC-123: Regresión crítica en login`, `CVE-2024-5678: Vulnerabilidad XSS`).

### Casos de ejecución y posibilidades
  - **on: workflow_dispatch** es el único trigger; requiere invocación manual explícita desde GitHub Actions UI o CLI.
  - **Flujo general:**
    1. Valida que la imagen existe en Docker Hub con `docker manifest inspect`.
    2. Si NO existe, falla inmediatamente; evita modificar manifiestos con imagen inexistente.
    3. Si existe, clona repo `retrogamecloud/kubernetes` en rama `main`.
    4. Actualiza ambos manifiestos (`04-frontend.yaml` y `argocd/base/frontend-deployment.yaml`) con `sed`.
    5. Crea rama `rollback/<servicio>-<version>-<timestamp>`.
    6. Commit en nueva rama e invoca `gh pr create` para abrir PR.
    7. PR incluye labels `rollback` y `urgent`, razón, autor y link a workflow run.
    8. Requiere aprobación y merge manual en `retrogamecloud/kubernetes`; ArgoCD sincroniza tras merge.

### Secrets esperados
  - `K8S_UPDATE_TOKEN`: token con permisos de escritura en repo `retrogamecloud/kubernetes` (crear ramas, abrir PRs, hacer commits).
  - `GITHUB_TOKEN` está disponible automáticamente en GitHub Actions (no necesita configuración manual).

### Validaciones y seguridad
  - **Validación de existencia:** antes de modificar manifiestos, comprueba `docker manifest inspect $ORG/$SERVICE:$VERSION` en Docker Hub. Si falla, la ejecución se detiene.
  - **Labels aplicados:** añade `rollback` y `urgent` a la PR (requieren existencia previa en `retrogamecloud/kubernetes`).
  - **Trazabilidad:** todos los commits/PRs incluyen actor (`github.actor`), razón, versión, timestamp en rama y link al workflow run.
  - **Rama temporal:** `rollback/<servicio>-<version>-<timestamp>` evita colisiones si se ejecutan rollbacks simultáneos.

### Ejemplos de ejecución manual (`workflow_dispatch`)

#### Ejemplo 1: Rollback normal a versión anterior por regresión
```
version: v2.0.40
reason: INC-789: Regresión crítica en formulario de login detectada en producción
→ Resultado: PR creada en retrogamecloud/kubernetes con branch rollback/frontend-v2.0.40-1701561234
→ Action: Revisar manifiestos, aprobar y mergear PR; ArgoCD sincroniza automáticamente
```

#### Ejemplo 2: Rollback a SHA previo por vulnerabilidad
```
version: sha-def5678a
reason: CVE-2024-5678: Vulnerabilidad XSS en componente de búsqueda
→ Resultado: PR creada en retrogamecloud/kubernetes con branch rollback/frontend-sha-def5678a-1701561245
→ Action: Revisar, aprobar rápidamente; monitorear rendimiento/errores tras sync; investigar y parchear en nueva release
```

### Buenas prácticas de rollback
  - **Pre-rollback check:**
    - Verificar que la imagen existe en Docker Hub: `docker pull retrogamehub/frontend:v2.0.40` o `docker manifest inspect retrogamehub/frontend:v2.0.40`.
    - Confirmar que es una versión conocida y compilada; revisar su changelog/descripción.
  - **Documentación en `reason`:**
    - Incluir ticket/ID de incidente (ej: `INC-123`, `SEV-1`).
    - Incluir descripción breve (ej: "Regresión de login", "Vulnerabilidad CVE-2024-5678").
    - Formato sugerido: `<TICKET>: <DESCRIPTION>`.
  - **Post-rollback:**
    - Revisar PR antes de merging; validar que manifiestos reflejan versión correcta.
    - Monitorea logs, métricas de error y disponibilidad de servicio (~5-10 min post-sync).
    - Si el rollback no resuelve el problema, considera: configuración incorrecta, estado de sesión, rollback a versión anterior.
  - **Coherencia de manifiestos:**
    - Ambos (`04-frontend.yaml` y `argocd/base/frontend-deployment.yaml`) se actualizan simultáneamente.
    - Verifica en `retrogamecloud/kubernetes` que ambos reflejan la versión destino.
    - Si hay divergencia, crea PR adicional para sincronizar.

---

## dependabot.yml

### Descripción del workflow
Archivo: [.github/dependabot.yml](https://github.com/retrogamecloud/frontend/blob/main/.github/dependabot.yml)
  - **Configuración de Dependabot** para automatizar actualizaciones de dependencias.
  - Escanea periódicamente repositorios de paquetes (GitHub Actions principalmente) en busca de nuevas versiones.
  - Crea PRs automáticas con actualizaciones, agrupadas por política.
  - **Configuración actual:** solo GitHub Actions (`.github/workflows/*.yml`). npm y Docker están deshabilitados.
  - PRs de Dependabot disparan `cicd.yml` automáticamente para validar que actualizaciones no rompen tests/build.
  - Asignación automática a reviewers, agrupación inteligente para reducir ruido.

### Configuración actual activa
  - **Ecosistema:** `github-actions` (único activo).
  - **Directorio:** `/` (raíz; detecta `.github/workflows/*.yml`).
  - **Schedule:** `interval: "daily"` (se ejecuta diariamente a medianoche UTC; nota temporal: "Se cambiará a weekly").
  - **Límite de PRs:** `open-pull-requests-limit: 5` (máximo 5 PRs abiertas simultáneamente).
  - **Asignados:** `evaristogz`, `naesman1`, `jpalenz77` (asignación automática).
  - **Commit message:**
    - `prefix: "ci"` → commits empiezan con `ci: `.
    - `include: "scope"` → incluye scope automático (ej: `ci(actions): ...`).
  - **Agrupación:** `groups.actions-all` con patrón `*` agrupa TODAS las actualizaciones de actions en UNA sola PR.

### Triggers y condiciones de ejecución
  - **Trigger:** Dependabot se ejecuta según `schedule`, NO como webhook.
  - **Horario:** Diariamente; GitHub ejecuta cuando lo considera oportuno (dentro de ventana horaria).
  - **Detección de cambios:** escanea archivos de `package-ecosystem` (ej: `.github/workflows/*.yml` para actions).
  - **Creación de PR:**
    - Si Dependabot detecta nuevas versiones → abre PR.
    - Si PR ya existe para ese paquete/versión → actualiza descripción en lugar de duplicar.
    - Si hay cambios nuevos posteriores al scan anterior → crea PR adicional (respetando límite).
  - **Validación automática:**
    - PR dispara `cicd.yml` en evento `pull_request`.
    - `cicd.yml` ejecuta lint, tests, build con nuevas versiones.
    - Si tests fallan → PR marca como falla; requiere arreglo manual.
    - Si tests pasan → PR lista para merge.

### Estructura y flujo paso a paso

#### 1. Detección de actualizaciones
- Dependabot escanea `.github/workflows/*.yml` cada día.
- Detecta acciones desactualizadas (ej: `actions/checkout@v6` vs `v7` disponible).
- Compara contra versiones en registros públicos.

#### 2. Creación de rama y PR
- Crea rama `dependabot/github-actions/<action-name>-<version>`.
- Commit automático con mensaje `ci(actions): update <action> requirement from v6 to v7`.
- Abre PR con:
  - Título: `ci(actions): update <action> requirement from v6 to v7`.
  - Body: changelog de acción, links a releases.
  - Asignados: `evaristogz`, `naesman1`, `jpalenz77`.
  - Labels: opcionalmente `dependencies` (si está configurado).

#### 3. Agrupación en una PR
- Gracias a `groups.actions-all` con patrón `*`:
  - Si se detectan 3 actualizaciones (ej: `checkout@v6→v7`, `setup-node@v4→v5`, `upload-artifact@v4→v5`).
  - Dependabot crea **una sola PR** que actualiza las 3.
  - Título: `ci(actions): update actions...` (genérico para grupo).

#### 4. CI/CD validation
- PR automáticamente dispara `cicd.yml` (evento `pull_request`).
- ESLint, tests, build ejecutan con nuevas versiones de actions.
- Resultados se muestran como checks en PR.

#### 5. Merge
- Sin `auto-merge` configurado: requiere merge manual.
- Si checks pasan y revisión OK → merge.
- Si checks fallan → requiere arreglo (actualizar workflow, etc.).

### Límites y políticas
  - **Máximo de PRs abiertas:** 5 simultáneamente.
  - **Estrategia:** Si alcanza límite, Dependabot espera hasta que se mergeen/cierren antes de crear nuevas.
  - **Agrupación:** `actions-all` reduce PRs a máximo 1 por scan (agrupa todas las acciones).
  - **Ramas:** Dependabot usa ramas dedicadas; no interfiere con workflow manual.

### Ejemplos de ejecución automática

#### Ejemplo 1: Actualización diaria de actions (con agrupación)
```
Scan detecta:
  - actions/checkout: v6 → v7
  - actions/setup-node: v4 → v5
  - actions/upload-artifact: v4 → v5

Resultado:
  - PR única creada: "ci(actions): update actions..."
  - Rama: dependabot/github-actions/actions-all-1701561234
  - Commits en PR: 3 commits (uno por action)
  - Asignados: evaristogz, naesman1, jpalenz77
  - Dispara cicd.yml: lint + tests + build con nuevas versions

Acción:
  - Esperar checks en PR
  - Si ✅ pasan: Revisar changelog, mergear
  - Si ❌ fallan: Actualizar workflows, re-push, esperar checks nuevamente
```

#### Ejemplo 2: Fallo en tests debido a incompatibilidad
```
PR de Dependabot actualiza actions/setup-node@v4 → v5
cicd.yml ejecuta con v5 → tests fallan (incompatibilidad)
Resultado:
  - PR muestra ❌ checks failed
  - Requiere ajuste manual (ej: cambiar `node-version: "18"` a `"20"`)
  
Acción:
  - Clonar branch dependabot, corregir issue
  - Push fix → triggers cicd.yml nuevamente
  - Una vez ✅ → mergear PR
```

### Validaciones y seguridad
  - **Escaneo automático:** Dependabot mantiene caché de versiones públicas; actualiza periódicamente.
  - **PR reviews:** Aunque automatizadas, PRs pueden ser bloqueadas por branch protection rules.
  - **Commit signoff:** Si repo requiere signoff, PRs de Dependabot fallarán (require configuración).
  - **Permisos:** Dependabot usa token específico con permisos `contents: write`, separado de usuario.
  - **Seguridad de versiones:** Dependabot solo detecta versiones publicadas públicamente.

### Comportamiento ante fallos
  - **Dependabot no crea PR:** Deshabilitado en Settings o repo no tiene acceso.
  - **PR checks fallan:** Nueva versión incompatible; requiere ajuste en código/workflows.
  - **Límite de PRs alcanzado:** Dependabot pausa; merging PRs existentes libera cuota.
  - **Branch protection rules bloquean:** Si repo requiere reviews, Dependabot toma tiempo esperando approval.
  - **Integración con CI no dispara:** PR no tiene permisos para ejecutar workflows; valida en Settings.

### Recomendaciones operativas
  - **Frecuencia:** cambiar de `daily` a `weekly` cuando haya estabilidad (menos ruido, igual seguridad).
  - **Revisión de PRs:** asignar escalada clara (ej: evaristogz revisa seguridad, jpalenz77 compat tests).
  - **Auto-merge:** considerar `auto-merge: patch` tras pasar CI (reducir tareas manuales).
  - **Ignore list:** usar para acciones que requieren testing manual:
    ```yaml
    ignore:
      - dependency-name: "actions/deploy-pages"  # requiere validación manual de deployment
    ```
  - **Configuración futura:**
    - Agregar npm cuando haya estabilidad (menos breaking changes).
    - Agregar Docker para imágenes base (ej: `FROM node:20` → `22`).
    - Usar grupos separados para `prod` vs `dev` deps (diferente frecuencia).
  - **Monitoreo:** revisar PR de Dependabot mensualmente; buscar patrones de fallos.

---

### Notas operativas
- Para lanzamientos manuales con versión controlada, usa `workflow_dispatch` en `cicd.yml` con `tag` (ej: `v2.0.50`).
- Para revertir rápidamente, invoca el workflow de rollback con la `version` previamente publicada en Docker Hub.
- Asegúrate de tener configurados los secrets requeridos en el repositorio y acceso al repo `retrogamecloud/kubernetes`.
- **Frontend diferencia de Backend:** `ENABLE_SNYK: true` siempre en frontend (no es configurable), por lo que Snyk es obligatorio.
- SonarCloud requiere `SONAR_TOKEN`; si no está, el análisis se salta y se agrega aviso en el resumen.
- Las PRs creadas en `retrogamecloud/kubernetes` quedan bajo ramas `auto/<servicio>-<tag>` o `rollback/<servicio>-<version>-<timestamp>` con detalles de versión, tag e ID de commit.
- Mantén coherencia entre `K8S_MANIFEST_FILE` (04-frontend.yaml) y `ARGOCD_MANIFEST_FILE` (argocd/base/frontend-deployment.yaml) para evitar divergencias entre despliegue tradicional y GitOps.

---

## Guía de troubleshooting

### `cicd.yml` - Problemas más comunes
| Problema | Causa Probable | Solución |
|----------|----------------|----------|
| Tests omitidos pero esperabas que corrieran | Commit contiene `[no-test]` o solo hay cambios en `.md` | Revisa último commit; si fue accidental, remueve flag y haz nuevo push |
| Build falla en `npm install` o Dockerfile | Dependencia incompatible o error en Dockerfile | Revisa logs de build; valida localmente `docker build .` con Node.js 20 |
| Snyk bloquea `push` (vulnerabilidades `high/critical`) | Dependencia con CVE sin parchear (Snyk SIEMPRE activo en frontend) | Actualiza paquete: `npm audit fix` o `npm update`, re-push con nuevo tag |
| No se crea PR en K8S repo o sin cambios | `sed` no encontró patrón de imagen | Verifica en `04-frontend.yaml` y `argocd/base/frontend-deployment.yaml` que contengan `image: retrogamehub/frontend:...` |
| Push a Docker Hub falla: "Invalid credentials" | Token de Docker Hub revocado o expirado | Regenera token en Docker Hub; actualiza secret `DOCKERHUB_TOKEN` |
| Codecov upload falla | `coverage/lcov.info` no generado por tests | Valida que tests ejecutan: `npm run test:coverage` genera archivo en `coverage/` |

### `cicd.yml` - Jobs específicos
| Job | Error Típico | Solución |
|-----|--------------|----------|
| `build` | "docker inspect: image not found" | Build falló; revisa logs de `docker build-push-action` por errores en `npm install` o Dockerfile |
| `update-kubernetes-manifest` | "sed: no match found" | Línea con `image: retrogamehub/frontend:` no existe o tiene formato diferente en manifiestos |
| `create-update-pr` | PR no se crea sin error explícito | Rama no tiene cambios vs `main`; valida que `sed` actualizó correctamente los manifiestos |

### `rollback-frontend.yml` - Problemas más comunes
| Problema | Causa Probable | Solución |
|----------|----------------|----------|
| Error: "Imagen ... no existe" | Versión/tag typo o nunca fue publicada | Verifica: `docker manifest inspect retrogamehub/frontend:<version>`. Usa versión que sabes que existe |
| No se crea PR en K8S repo | Token sin permisos o error de rama | Valida K8S_UPDATE_TOKEN tiene permisos en K8S repo; comprueba que rama se creó |
| Manifiestos se actualizan pero con versión incorrecta | `sed` no reemplazó todos los valores | Revisa logs de `sed`; verifica que versión en input coincide exactamente con lo que está en manifiestos |
| ArgoCD no sincroniza tras merge | App no linked a K8S repo o desincronizada | En ArgoCD UI: verifica que app está linked; realiza sync manual si es necesario |

### `dependabot.yml` - Problemas más comunes
| Problema | Causa Probable | Solución |
|----------|----------------|----------|
| PR de Dependabot falla tests | Nueva versión de action incompatible con workflow actual | Actualiza workflow en rama de Dependabot; commit fix; tests re-ejecutarán automáticamente |
| Múltiples PRs en lugar de una agrupada | `groups.actions-all` no funciona (typo en YAML) | Verifica sintaxis de `dependabot.yml`; patrón debe ser exactamente `*` |
| Muchas PRs abiertas simultáneamente | Límite de 5 PRs alcanzado | Es normal; mergea PRs existentes; Dependabot reanuda automáticamente cuando hay cuota |

---

## Tabla de Referencia: workflows y triggers

| Workflow | Triggers | Manual Input | Tiempo Típico | Destino Salida | Concurrency |
|----------|----------|--------------|---------------|-----------------|-------------|
| `cicd.yml` | push `main`, PR, `workflow_dispatch` | `tag` (opcional) | 15-25 min | Docker Hub, GHCR, PR en K8S repo | `cancel-in-progress: true` |
| `rollback-frontend.yml` | `workflow_dispatch` | `version`, `reason` | 2-3 min | PR en K8S repo, ArgoCD sync | N/A |
| `dependabot.yml` | Horario (diario) | Automático | N/A | PR en frontend repo | N/A |

## Tabla de variables de entorno

| Variable | Valor | Propósito | Modificable |
|----------|-------|----------|------------|
| `REGISTRY_GHCR` | `ghcr.io` | GitHub Container Registry | Sí (env) |
| `REGISTRY_DOCKERHUB` | `docker.io` | Docker Hub registry | Sí (env) |
| `DOCKERHUB_ORG` | `retrogamehub` | Org/user en Docker Hub | Sí (env) |
| `K8S_REPO` | `retrogamecloud/kubernetes` | Repo destino de PRs K8S | Sí (env) |
| `K8S_MANIFEST_FILE` | `04-frontend.yaml` | Manifiesto K8S directo | Sí (env) |
| `ARGOCD_REPO` | `retrogamecloud/kubernetes` | Repo ArgoCD (generalmente igual K8S_REPO) | Sí (env) |
| `ARGOCD_MANIFEST_FILE` | `argocd/base/frontend-deployment.yaml` | Manifiesto GitOps | Sí (env) |
| `ENABLE_SNYK` | `true` | Habilita/inhabilita escaneo Snyk | Sí (env) |
| `ENABLE_SLACK_NOTIFICATIONS` | `true` | Habilita/inhabilita notificaciones Slack | Sí (env) |

## Tabla de Secrets Requeridos

| Secret | Requerido | Propósito | Scope |
|--------|-----------|----------|-------|
| `GITHUB_TOKEN` | Sí (automático) | Acceso GitHub, PRs, workflows | Global |
| `SONAR_TOKEN` | Condicional | SonarCloud quality scan | `cicd.yml` |
| `SNYK_TOKEN` | Sí (frontend) | Snyk vulnerability scan | `cicd.yml` (obligatorio en frontend) |
| `DOCKERHUB_USERNAME` | Sí | Credencial Docker Hub | `cicd.yml` |
| `DOCKERHUB_TOKEN` | Sí | Token/password Docker Hub | `cicd.yml` |
| `K8S_UPDATE_TOKEN` | Sí | Permisos write en K8S repo | `cicd.yml`, `rollback-frontend.yml` |
| `SLACK_WEBHOOK_URL` | Condicional | Webhook Slack para notificaciones | `cicd.yml` |

---
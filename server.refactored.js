// ============================================================================
// FRONTEND SERVER - RetroGameCloud (REFACTORIZADO)
// ============================================================================

import { noCacheMiddleware } from "./src/middleware/cacheMiddleware.js";
import { getDirname, getProjectRoot, getGamesPath } from "./src/config/paths.js";
import { setupRoutes, setupHealthCheck } from "./src/routes/routes.js";

/**
 * Crea y configura la aplicación Express
 * @param {string} dirname - Directorio actual
 * @returns {express.Application} App configurada
 */
export function createApp(dirname) {
  const projectRoot = getProjectRoot(dirname);
  const gamesPath = getGamesPath(projectRoot);
  
  // Crear app con rutas
  const app = setupRoutes(dirname, gamesPath);
  
  // Aplicar middleware de caché
  app.use(noCacheMiddleware());
  
  // Configurar health check
  setupHealthCheck(app);
  
  return app;
}

/**
 * Inicia el servidor
 * @param {express.Application} app - App de Express
 * @param {number} port - Puerto del servidor
 * @returns {http.Server} Servidor HTTP
 */
export function startServer(app, port) {
  return app.listen(port, () => {
    console.log(`🎮 Frontend corriendo en http://localhost:${port}`);
  });
}

// ============================================================================
// INICIAR SERVIDOR (solo si se ejecuta directamente)
// ============================================================================

/* istanbul ignore next */
if (import.meta.url === `file://${process.argv[1]}`) {
  const __dirname = getDirname(import.meta.url);
  const PORT = process.env.PORT || 8080;
  
  const app = createApp(__dirname);
  startServer(app, PORT);
}

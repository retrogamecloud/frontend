// ============================================================================
// CONFIGURACIÓN DE RUTAS
// ============================================================================

import express from "express";

/**
 * Configura las rutas de la aplicación
 * @param {string} frontendDir - Directorio del frontend
 * @param {string} gamesPath - Ruta al directorio de juegos
 * @returns {express.Application} App de Express configurada
 */
export function setupRoutes(frontendDir, gamesPath) {
  const app = express();

  // Servir archivos estáticos del frontend
  app.use(express.static(frontendDir));

  // Servir carpeta de juegos
  app.use('/juegos', express.static(gamesPath));

  return app;
}

/**
 * Configura el endpoint de health check
 * @param {express.Application} app - App de Express
 */
export function setupHealthCheck(app) {
  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString() 
    });
  });
}

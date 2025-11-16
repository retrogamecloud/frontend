// ============================================================================
// MIDDLEWARE DE CACHÉ
// ============================================================================

/**
 * Middleware para deshabilitar caché en archivos HTML
 * @returns {Function} Middleware de Express
 */
export function noCacheMiddleware() {
  return (req, res, next) => {
    if (req.url.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  };
}

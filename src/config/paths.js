// ============================================================================
// CONFIGURACIÓN DE RUTAS
// ============================================================================

import path from "path";
import { fileURLToPath } from "url";

/**
 * Obtiene el directorio actual del módulo ES6
 * @param {string} metaUrl - import.meta.url
 * @returns {string} Directorio actual
 */
export function getDirname(metaUrl) {
  return path.dirname(fileURLToPath(metaUrl));
}

/**
 * Calcula la raíz del proyecto (un nivel por encima de 'frontend')
 * @param {string} dirname - Directorio actual
 * @returns {string} Ruta a la raíz del proyecto
 */
export function getProjectRoot(dirname) {
  return path.resolve(dirname, '..');
}

/**
 * Obtiene la ruta al directorio de juegos
 * @param {string} projectRoot - Raíz del proyecto
 * @returns {string} Ruta al directorio de juegos
 */
export function getGamesPath(projectRoot) {
  return path.join(projectRoot, 'juegos');
}

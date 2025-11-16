// ============================================================================
// FRONTEND SERVER - RetroGameCloud (Wrapper para compatibilidad)
// Este archivo mantiene compatibilidad con el deployment actual
// El código refactorizado está en server.refactored.js
// ============================================================================

import { getDirname } from "./src/config/paths.js";
import { createApp } from "./server.refactored.js";

const __dirname = getDirname(import.meta.url);
const PORT = process.env.PORT || 8080;

// Crear aplicación
const app = createApp(__dirname);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🎮 Frontend corriendo en http://localhost:${PORT}`);
});

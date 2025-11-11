import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Middleware para deshabilitar caché en desarrollo
app.use((req, res, next) => {
  if (req.url.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// Determinar la raíz del proyecto (un nivel por encima de 'frontend')
const projectRoot = path.resolve(__dirname, '..');

// 1. Servir todos los archivos estáticos dentro de la carpeta 'frontend' (HTML, CSS, JS de la aplicación)
app.use(express.static(__dirname));

// 2. 🟢 AÑADIDO: Servir la carpeta 'juegos' bajo la ruta URL '/juegos'.
// Esto permite que el path relativo '../juegos/...' funcione correctamente.
app.use('/juegos', express.static(path.join(projectRoot, 'juegos')));

// Health check endpoint para Kubernetes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

const PORT = 8081;
app.listen(PORT, () => {
  console.log(`🎮 Frontend corriendo en http://localhost:${PORT}`);
});
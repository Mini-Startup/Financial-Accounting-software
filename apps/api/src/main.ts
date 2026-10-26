import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { registerRoutes } from './routes';
import { errorHandler } from './errors';

const app = express();
const PORT = process.env.PORT ?? 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || "https://finance-frontend-weld.vercel.app";


// ─── Security & Performance Optimizations ────────────
app.disable('x-powered-by');

// Response timing header for debugging and profiling
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 300) {
      console.warn(`[SLOW API] ${req.method} ${req.originalUrl} - ${duration}ms`);
    }
  });
  next();
});

// Gzip/Brotli compression: compresses JSON responses by 70-90%
app.use(
  compression({
    level: 6,
    threshold: 1024, // only compress responses above 1KB
  })
);

// ─── Middleware ──────────────────────────────────────
app.use(cors({
  origin: ["http://localhost:3000", FRONTEND_URL]
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ─── Routes ─────────────────────────────────────────
registerRoutes(app);

// ─── Global Error Handler ───────────────────────────
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 API server running on http://localhost:${PORT}`);
  });
}

export default app;

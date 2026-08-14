import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { registerRoutes } from './routes';
import { errorHandler } from './errors';

const app = express();
const PORT = process.env.PORT ?? 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || "https://finance-frontend-weld.vercel.app"
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

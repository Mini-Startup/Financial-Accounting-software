import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { registerRoutes } from './routes';
import { errorHandler } from './errors';

const app = express();
const PORT = process.env.PORT ?? 4000;

// ─── Middleware ──────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Routes ─────────────────────────────────────────
registerRoutes(app);

// ─── Global Error Handler ───────────────────────────
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
});

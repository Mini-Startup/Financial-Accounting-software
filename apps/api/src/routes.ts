import { Express } from 'express';
import accountsRouter from './features/accounts/routes';
import brokeragesRouter from './features/brokerages/routes';
import exchangesRouter from './features/exchanges/routes';
import groupsRouter from './features/groups/routes';
import scriptsRouter from './features/scripts/routes';
import tradesRouter from './features/trades/routes';
import tradeFnoRouter from './features/Trade_FnO/routes';
import closingRatesRouter from './features/closing-rates/routes';
import expiryDatesRouter from './features/expiry-dates/routes';

export function registerRoutes(app: Express) {
  // Health check
  app.get('/', (_req, res) => {
    res.json({ status: 'ok', service: 'Financial Accounting API' });
  });

  // Feature routes
  app.use('/accounts', accountsRouter);
  app.use('/brokerages', brokeragesRouter);
  app.use('/exchanges', exchangesRouter);
  app.use('/groups', groupsRouter);
  app.use('/scripts', scriptsRouter);
  app.use('/closing-rates', closingRatesRouter);
  app.use('/expiry-dates', expiryDatesRouter);
  app.use('/', tradesRouter);
  app.use('/', tradeFnoRouter);
}

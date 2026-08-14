import { Express } from 'express';
import accountMastersRouter from './features/account-masters/routes';
import brokeragesRouter from './features/brokerages/routes';
import currenciesRouter from './features/currencies/routes';
import exchangesRouter from './features/exchanges/routes';
import groupsRouter from './features/groups/routes';
import scriptsRouter from './features/scripts/routes';
import tradesRouter from './features/trades/routes';
import tradeFnoRouter from './features/Trade_FnO/routes';
import closingRatesRouter from './features/closing-rates/routes';
import expiryDatesRouter from './features/expiry-dates/routes';
import settlementRouter from './features/settlement/routes';
import vouchersRouter from './features/vouchers/routes';
import ledgerReportRouter from './features/ledger-report/routes';

export function registerRoutes(app: Express) {
  // Health check
  app.get('/', (_req, res) => {
    res.json({ status: 'ok', service: 'Financial Accounting API' });
  });

  // Feature routes
  app.use('/account-masters', accountMastersRouter);
  app.use('/brokerages', brokeragesRouter);
  app.use('/currencies', currenciesRouter);
  app.use('/exchanges', exchangesRouter);
  app.use('/groups', groupsRouter);
  app.use('/scripts', scriptsRouter);
  app.use('/closing-rates', closingRatesRouter);
  app.use('/expiry-dates', expiryDatesRouter);
  app.use('/settlement', settlementRouter);
  app.use('/vouchers', vouchersRouter);
  app.use('/ledger-report', ledgerReportRouter);
  app.use('/', tradesRouter);
  app.use('/', tradeFnoRouter);
}

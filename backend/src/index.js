import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import './utils/db.js';               // connect to Mongo
import './utils/asyncErrors.js';      // express-async-errors side-effect import

import supplierRoutes from './routes/suppliers.js';
import stockRoutes from './routes/stocks.js';
import requestRoutes from './routes/supplierRequests.js';
import alertRoutes from './routes/alerts.js';
import reportRoutes from './routes/reports.js';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/', (_req, res) => res.json({ ok: true, name: 'Inventory Backend' }));

app.use('/api/suppliers', supplierRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/reports', reportRoutes);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));

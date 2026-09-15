import cors from 'cors';
import express from 'express';
import { errorHandler } from './middleware/error-handler.js';
import { inventoryRoutes } from './modules/inventory/inventory.routes.js';
import { productRoutes } from './modules/products/product.routes.js';

export const app = express();

app.disable('x-powered-by');
app.use(
  cors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  }),
);
app.use(express.json({ limit: '256kb' }));

app.get('/health', (_request, response) => {
  return response.json({ status: 'ok', service: 'stockflow-api' });
});

app.use('/products', productRoutes);
app.use('/', inventoryRoutes);

app.use(errorHandler);

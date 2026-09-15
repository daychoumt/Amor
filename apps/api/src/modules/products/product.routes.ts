import { Router } from 'express';
import { createProductSchema, listProductsQuerySchema } from './product.schemas.js';
import { createProduct, getProductById, listProducts } from './product.service.js';

export const productRoutes = Router();

productRoutes.get('/', async (request, response, next) => {
  try {
    const query = listProductsQuerySchema.parse(request.query);
    const products = await listProducts(query.search, query.lowStock === 'true');
    return response.json(products);
  } catch (error) {
    return next(error);
  }
});

productRoutes.get('/:id', async (request, response, next) => {
  try {
    const product = await getProductById(request.params.id);
    return response.json(product);
  } catch (error) {
    return next(error);
  }
});

productRoutes.post('/', async (request, response, next) => {
  try {
    const input = createProductSchema.parse(request.body);
    const product = await createProduct(input);
    return response.status(201).json(product);
  } catch (error) {
    return next(error);
  }
});

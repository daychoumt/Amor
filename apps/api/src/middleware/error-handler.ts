import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    return response.status(400).json({
      message: 'Dados inválidos.',
      issues: error.issues,
    });
  }

  if (error instanceof AppError) {
    return response.status(error.statusCode).json({ message: error.message });
  }

  console.error(error);
  return response.status(500).json({ message: 'Erro interno do servidor.' });
};

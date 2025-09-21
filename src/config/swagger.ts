import swaggerJSDoc from 'swagger-jsdoc';

// Basic Swagger/OpenAPI configuration using swagger-jsdoc
const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LedgerSwap API',
      version: '1.0.0',
      description: 'API documentation for LedgerSwap backend',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
    servers: [
      {
        url: `${process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3002}`}`,
      },
    ],
  },
  // Globs to look for JSDoc comments describing endpoints
  apis: ['src/routes/**/*.ts', 'src/controllers/**/*.ts'],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;

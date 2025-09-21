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
        url: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:${process.env.PORT || 3002}`,
      },
    ],
    paths: {
      '/': {
        get: {
          summary: 'Health check endpoint',
          tags: ['Health'],
          responses: {
            '200': {
              description: 'API is running',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      status: { type: 'string' },
                      timestamp: { type: 'string' },
                      version: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/health': {
        get: {
          summary: 'Service health status',
          tags: ['Health'],
          responses: {
            '200': {
              description: 'Service is healthy'
            }
          }
        }
      }
    }
  },
  // Look for JSDoc comments in both source and compiled files
  apis: ['src/routes/**/*.ts', 'src/controllers/**/*.ts', 'dist/routes/**/*.js', 'dist/controllers/**/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;

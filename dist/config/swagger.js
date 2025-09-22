"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
// Basic Swagger/OpenAPI configuration using swagger-jsdoc
const options = {
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
                url: `https://ledger-swap-backend.vercel.app`,
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
const swaggerSpec = (0, swagger_jsdoc_1.default)(options);
exports.default = swaggerSpec;

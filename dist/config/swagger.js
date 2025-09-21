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
                url: `${process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3002}`}`,
            },
        ],
    },
    // Globs to look for JSDoc comments describing endpoints
    apis: ['src/routes/**/*.ts', 'src/controllers/**/*.ts'],
};
const swaggerSpec = (0, swagger_jsdoc_1.default)(options);
exports.default = swaggerSpec;

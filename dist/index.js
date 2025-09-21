"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("./config/db"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const overviewRoutes_1 = __importDefault(require("./routes/overviewRoutes"));
const payoutRoutes_1 = __importDefault(require("./routes/payoutRoutes"));
const exchangeHistoryRoutes_1 = __importDefault(require("./routes/exchangeHistoryRoutes"));
const addressRoutes_1 = __importDefault(require("./routes/addressRoutes"));
const passport_1 = __importDefault(require("passport"));
require("./config/passport");
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const disputesRoutes_1 = __importDefault(require("./routes/disputesRoutes"));
const tokenChainRoutes_1 = __importDefault(require("./routes/tokenChainRoutes"));
const exchangeRoutes_1 = __importDefault(require("./routes/exchangeRoutes"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = __importDefault(require("./config/swagger"));
const cors_1 = __importDefault(require("cors"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(passport_1.default.initialize());
// CORS: allow frontend origin
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use((0, cors_1.default)({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
const PORT = process.env.PORT || 8080;
// Root health/info route
app.get('/', (req, res) => {
    res.json({
        message: 'LedgerSwap API is running',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});
// Health check endpoint for EB
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'LedgerSwap API',
        docs: '/api-docs',
        baseUrl: `http://localhost:${PORT}`,
    });
});
// Swagger UI and JSON spec
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.default, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'LedgerSwap API Documentation',
    swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showRequestHeaders: true,
    },
    customfavIcon: '/favicon.ico',
    customJs: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
    ],
    explorer: true,
    customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css'
}));
app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swagger_1.default);
});
app.use('/api/auth', authRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/overview', overviewRoutes_1.default);
app.use('/api/payouts', payoutRoutes_1.default);
app.use('/api/exchange-history', exchangeHistoryRoutes_1.default);
app.use('/api/exchanges', exchangeRoutes_1.default);
app.use('/api/addresses', addressRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/admin/management', tokenChainRoutes_1.default);
app.use('/api/disputes', disputesRoutes_1.default);
app.use('/api/upload', uploadRoutes_1.default);
// Handle graceful shutdown and unhandled errors
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

// Initialize database connection for serverless
let dbConnected = false;
const initializeDB = () => __awaiter(void 0, void 0, void 0, function* () {
    if (!dbConnected) {
        try {
            yield (0, db_1.default)();
            dbConnected = true;
            console.log('Database connected successfully');
        }
        catch (err) {
            console.error('Database initialization failed:', err);
            throw err;
        }
    }
});

// Middleware to ensure DB is connected before handling requests
app.use((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield initializeDB();
        next();
    }
    catch (err) {
        res.status(500).json({
            error: 'Database connection failed',
            message: err.message
        });
    }
}));

// Export the Express app for Vercel
module.exports = app;

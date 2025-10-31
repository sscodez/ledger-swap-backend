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
const cryptoRoutes_1 = __importDefault(require("./routes/cryptoRoutes"));
const blogRoutes_1 = __importDefault(require("./routes/blogRoutes"));
const cryptoFeeRoutes_1 = __importDefault(require("./routes/cryptoFeeRoutes"));
const contactRoutes_1 = __importDefault(require("./routes/contactRoutes"));
const flaggedCheckRoutes_1 = __importDefault(require("./routes/flaggedCheckRoutes"));
const chainRoutes_1 = __importDefault(require("./routes/chainRoutes"));
const tokenRoutes_1 = __importDefault(require("./routes/tokenRoutes"));
// import escrowRoutes from './routes/escrowRoutes';
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(passport_1.default.initialize());
// CORS: allow frontend origins
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const allowedOrigins = [
    FRONTEND_URL,
    'https://ledgerswap.io',
    'https://www.ledgerswap.io',
    'http://localhost:3000',
    'http://localhost:3001'
];
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            console.log('CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
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
app.use('/api/crypto', cryptoRoutes_1.default);
app.use('/api/blogs', blogRoutes_1.default);
app.use('/api/crypto-fees', cryptoFeeRoutes_1.default);
app.use('/api/contacts', contactRoutes_1.default);
app.use('/api/flagged-check', flaggedCheckRoutes_1.default);
app.use('/api/chains', chainRoutes_1.default);
app.use('/api/tokens', tokenRoutes_1.default);
// app.use('/api/xumm', xummRoutes);
// app.use('/api/escrow', escrowRoutes);
function start() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield (0, db_1.default)();
            // Start the server
            app.listen(PORT, () => {
                console.log(`Server running on port ${PORT}`);
            });
        }
        catch (err) {
            console.error('Failed to start server:', err);
            process.exit(1);
        }
    });
}
// For Vercel serverless deployment
if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'serverless') {
    // Connect to DB once for serverless
    (0, db_1.default)().catch(err => console.error('DB connection error:', err));
}
else {
    // Start server normally for local/traditional hosting
    start();
}
// Export app for Vercel (must be at top level)
exports.default = app;

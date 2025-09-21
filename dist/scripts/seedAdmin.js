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
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("../config/db"));
const User_1 = __importDefault(require("../models/User"));
(() => __awaiter(void 0, void 0, void 0, function* () {
    dotenv_1.default.config();
    const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@ledgerswap.dev';
    const password = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@12345';
    const name = process.env.DEFAULT_ADMIN_NAME || 'Admin';
    try {
        yield (0, db_1.default)();
        const existing = yield User_1.default.findOne({ email });
        if (existing) {
            console.log(`Admin already exists: ${email}`);
            process.exit(0);
        }
        yield User_1.default.create({ name, email, password, role: 'admin' });
        console.log('Admin user created successfully');
        console.log('===============================');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log('===============================');
        process.exit(0);
    }
    catch (err) {
        console.error('Failed to seed admin:', err);
        process.exit(1);
    }
}))();

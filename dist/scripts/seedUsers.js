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
const Overview_1 = __importDefault(require("../models/Overview"));
(() => __awaiter(void 0, void 0, void 0, function* () {
    dotenv_1.default.config();
    const users = [
        { name: 'Alice', email: 'alice@example.com', password: 'User@12345', role: 'user' },
        { name: 'Bob', email: 'bob@example.com', password: 'User@12345', role: 'user' },
        { name: 'Carol', email: 'carol@example.com', password: 'User@12345', role: 'user' },
    ];
    try {
        yield (0, db_1.default)();
        for (const u of users) {
            const existing = yield User_1.default.findOne({ email: u.email });
            if (existing) {
                console.log(`User already exists: ${u.email}`);
                continue;
            }
            const created = yield User_1.default.create(u);
            yield Overview_1.default.create({ user: created._id });
            console.log(`Seeded user: ${u.email} / ${u.password}`);
        }
        console.log('User seeding completed.');
        process.exit(0);
    }
    catch (err) {
        console.error('Failed to seed users:', err);
        process.exit(1);
    }
}))();

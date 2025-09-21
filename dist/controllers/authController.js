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
exports.facebookCallback = exports.googleCallback = exports.signin = exports.adminSignin = exports.signup = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importDefault(require("../models/User"));
const Overview_1 = __importDefault(require("../models/Overview"));
const generateToken_1 = __importDefault(require("../utils/generateToken"));
const signup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, password } = req.body;
    try {
        const userExists = yield User_1.default.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const user = yield User_1.default.create({
            name,
            email,
            password,
        });
        if (user) {
            yield Overview_1.default.create({ user: user._id });
            const token = (0, generateToken_1.default)(String(user._id));
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token,
            });
        }
        else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
        else {
            res.status(500).json({ message: 'An unknown error occurred' });
        }
    }
});
exports.signup = signup;
const adminSignin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        const user = yield User_1.default.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        if (user.password && (yield bcryptjs_1.default.compare(password, user.password))) {
            const token = (0, generateToken_1.default)(String(user._id));
            return res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token,
                role: user.role,
            });
        }
        return res.status(401).json({ message: 'Invalid email or password' });
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
        else {
            res.status(500).json({ message: 'An unknown error occurred' });
        }
    }
});
exports.adminSignin = adminSignin;
const signin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        const user = yield User_1.default.findOne({ email });
        if (user && user.password && (yield bcryptjs_1.default.compare(password, user.password))) {
            const token = (0, generateToken_1.default)(String(user._id));
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token,
            });
        }
        else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
        else {
            res.status(500).json({ message: 'An unknown error occurred' });
        }
    }
});
exports.signin = signin;
const googleCallback = (req, res) => {
    const user = req.user;
    const token = (0, generateToken_1.default)(user._id.toString());
    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/?token=${token}`);
};
exports.googleCallback = googleCallback;
const facebookCallback = (req, res) => {
    const user = req.user;
    const token = (0, generateToken_1.default)(user._id.toString());
    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/?token=${token}`);
};
exports.facebookCallback = facebookCallback;

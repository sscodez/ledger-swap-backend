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
exports.updateUserProfile = exports.getUserProfile = void 0;
const User_1 = __importDefault(require("../models/User"));
const getUserProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const authReq = req;
    if (authReq.user) {
        res.json({
            _id: authReq.user._id,
            name: authReq.user.name,
            email: authReq.user.email,
            phone: authReq.user.phone,
            country: authReq.user.country,
            profilePicture: authReq.user.profilePicture,
        });
    }
    else {
        res.status(404).json({ message: 'User not found' });
    }
});
exports.getUserProfile = getUserProfile;
const updateUserProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const authReq = req;
    const user = yield User_1.default.findById(authReq.user._id);
    if (user) {
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        user.phone = req.body.phone || user.phone;
        user.country = req.body.country || user.country;
        user.profilePicture = req.body.profilePicture || user.profilePicture;
        if (req.body.password) {
            user.password = req.body.password;
        }
        const updatedUser = yield user.save();
        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone,
            country: updatedUser.country,
            profilePicture: updatedUser.profilePicture,
        });
    }
    else {
        res.status(404).json({ message: 'User not found' });
    }
});
exports.updateUserProfile = updateUserProfile;

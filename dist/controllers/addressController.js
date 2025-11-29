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
exports.updateAddress = exports.deleteAddress = exports.getAddresses = exports.createAddress = void 0;
const Address_1 = __importDefault(require("../models/Address"));
const createAddress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const authReq = req;
    const { coin, network, label, address } = req.body;
    try {
        const newAddress = yield Address_1.default.create({
            user: authReq.user._id,
            coin,
            network,
            label,
            address,
        });
        res.status(201).json(newAddress);
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
exports.createAddress = createAddress;
const getAddresses = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const authReq = req;
    try {
        const addresses = yield Address_1.default.find({ user: authReq.user._id });
        res.json(addresses);
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
exports.getAddresses = getAddresses;
const deleteAddress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const authReq = req;
    try {
        const address = yield Address_1.default.findById(req.params.id);
        if (address) {
            if (address.user.toString() !== String(authReq.user._id)) {
                return res.status(401).json({ message: 'Not authorized' });
            }
            yield address.deleteOne();
            res.json({ message: 'Address removed' });
        }
        else {
            res.status(404).json({ message: 'Address not found' });
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
exports.deleteAddress = deleteAddress;
const updateAddress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const authReq = req;
    const { coin, network, label, address } = req.body;
    try {
        const existingAddress = yield Address_1.default.findById(req.params.id);
        if (!existingAddress) {
            return res.status(404).json({ message: 'Address not found' });
        }
        if (existingAddress.user.toString() !== String(authReq.user._id)) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        existingAddress.coin = coin !== null && coin !== void 0 ? coin : existingAddress.coin;
        existingAddress.network = network !== null && network !== void 0 ? network : existingAddress.network;
        existingAddress.label = label !== null && label !== void 0 ? label : existingAddress.label;
        existingAddress.address = address !== null && address !== void 0 ? address : existingAddress.address;
        const updated = yield existingAddress.save();
        res.json(updated);
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
exports.updateAddress = updateAddress;

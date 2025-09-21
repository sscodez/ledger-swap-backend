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
const multer_1 = __importDefault(require("multer"));
const client_s3_1 = require("@aws-sdk/client-s3");
const crypto_1 = require("crypto");
const router = express_1.default.Router();
// 20 MB per-file limit
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
});
const REGION = process.env.AWS_REGION;
const BUCKET = process.env.S3_BUCKET;
const s3 = new client_s3_1.S3Client({
    region: REGION,
    credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    } : undefined,
});
router.post('/', upload.single('file'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        if (!REGION || !BUCKET) {
            return res.status(500).json({ message: 'S3 configuration missing (AWS_REGION, S3_BUCKET).' });
        }
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: 'No file uploaded. Use form field name "file".' });
        }
        const contentType = file.mimetype || 'application/octet-stream';
        const ext = (((_a = file.originalname) === null || _a === void 0 ? void 0 : _a.split('.').pop()) || '').toLowerCase();
        const key = `${new Date().toISOString().split('T')[0]}/${(0, crypto_1.randomUUID)()}${ext ? '.' + ext : ''}`;
        yield s3.send(new client_s3_1.PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: file.buffer,
            ContentType: contentType,
            // Uncomment to make objects public if bucket policy allows it:
            // ACL: 'public-read',
        }));
        return res.status(201).json({
            success: true,
            key,
            bucket: BUCKET,
            region: REGION,
            // If using public bucket or CloudFront, you can construct a URL. Otherwise return key only.
            url: process.env.S3_PUBLIC_BASE_URL ? `${process.env.S3_PUBLIC_BASE_URL}/${key}` : undefined,
        });
    }
    catch (err) {
        if ((err === null || err === void 0 ? void 0 : err.code) === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ message: 'File too large. Max 20 MB per file.' });
        }
        console.error('S3 upload error:', err);
        return res.status(500).json({ message: 'Upload failed', error: (err === null || err === void 0 ? void 0 : err.message) || String(err) });
    }
}));
exports.default = router;

import express from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const router = express.Router();

// 20 MB per-file limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.S3_BUCKET;

const s3 = new S3Client({
  region: REGION,
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  } : undefined,
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!REGION || !BUCKET) {
      return res.status(500).json({ message: 'S3 configuration missing (AWS_REGION, S3_BUCKET).' });
    }

    const file = (req as any).file as any;
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded. Use form field name "file".' });
    }

    const contentType = file.mimetype || 'application/octet-stream';
    const ext = (file.originalname?.split('.').pop() || '').toLowerCase();
    const key = `${new Date().toISOString().split('T')[0]}/${randomUUID()}${ext ? '.' + ext : ''}`;

    await s3.send(new PutObjectCommand({
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
  } catch (err: any) {
    if (err?.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'File too large. Max 20 MB per file.' });
    }
    console.error('S3 upload error:', err);
    return res.status(500).json({ message: 'Upload failed', error: err?.message || String(err) });
  }
});

export default router;

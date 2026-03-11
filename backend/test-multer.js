const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const express = require('express');

const s3 = new S3Client({
  forcePathStyle: true,
  region: 'ap-northeast-1',
  endpoint: 'https://thhtumfgfrcjuznfgmoy.storage.supabase.co/storage/v1/s3',
  credentials: {
    accessKeyId: 'a6e8bb727e81c105cfca4c8fca7b95c6',
    secretAccessKey: '5cf8e893f9f63c062e4db54e38528de11f75634ab8f69fcd5d4601f283a7237f',
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'uploads',
    acl: 'public-read',
    key: function (req, file, cb) {
      cb(null, Date.now().toString() + ".txt")
    }
  })
});

const app = express();
app.post('/upload', (req, res, next) => {
    upload.single('file')(req, res, function (err) {
        if (err) {
            console.error("MULTER ERROR:", err);
            return res.status(500).json({ error: err.message, name: err.name, code: err.Code });
        }
        res.json({ file: req.file });
    })
});

const server = app.listen(3333, async () => {
    try {
        const fetch = global.fetch;
        const blob = new Blob(['test content'], { type: 'text/plain' });
        const form = new FormData();
        form.append('file', blob, 'test.txt');

        const response = await fetch('http://localhost:3333/upload', {
            method: 'POST',
            body: form
        });
        const text = await response.text();
        console.log("RESPONSE:", text);
    } catch(err) {
        console.log("Error:", err);
    } finally {
        server.close();
    }
});

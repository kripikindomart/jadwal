const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  forcePathStyle: true,
  region: 'ap-northeast-1',
  endpoint: 'https://thhtumfgfrcjuznfgmoy.storage.supabase.co/storage/v1/s3',
  credentials: {
    accessKeyId: 'a6e8bb727e81c105cfca4c8fca7b95c6',
    secretAccessKey: '5cf8e893f9f63c062e4db54e38528de11f75634ab8f69fcd5d4601f283a7237f',
  },
});

async function run() {
  try {
    const data = await s3.send(new ListBucketsCommand({}));
    console.log("Success", data.Buckets);
  } catch (err) {
    console.log("Error", err.name, err.message);
  }
}
run();

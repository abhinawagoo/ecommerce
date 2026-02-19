import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { randomUUID } from "crypto";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

export async function uploadImageToR2(
  buffer: Buffer,
  productId: string,
  position: number
): Promise<string> {
  const webpBuffer = await sharp(buffer)
    .webp({ quality: 85 })
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .toBuffer();

  const key = `products/${productId}/${randomUUID()}.webp`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: webpBuffer,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
      Metadata: { position: String(position) },
    })
  );

  return `${PUBLIC_URL}/${key}`;
}

export async function uploadVideoToR2(
  buffer: Buffer,
  productId: string
): Promise<string> {
  const key = `products/${productId}/${randomUUID()}.mp4`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: "video/mp4",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return `${PUBLIC_URL}/${key}`;
}

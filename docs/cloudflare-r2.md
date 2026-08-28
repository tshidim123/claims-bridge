# Cloudflare R2 setup for private document uploads

Phase 5B uses one private Cloudflare R2 bucket per environment. Do not enable public bucket access or an `r2.dev` URL. Keep development and production buckets, credentials, and account configuration separate.

Configure these server-only variables in the relevant environment:

```text
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=claims-bridge-development
```

The application derives its S3-compatible endpoint as:

```text
https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com
```

Create an R2 API token limited to the selected bucket with object read/write/delete permissions required by this pipeline. Do not grant bucket listing unless a later maintenance process explicitly needs it.

For direct browser uploads, configure the bucket CORS policy with only the exact Claims Bridge origins for that environment. Replace the example origins before applying:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://app.example.com"
    ],
    "AllowedMethods": ["PUT", "HEAD"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 600
  }
]
```

Do not use `*` for `AllowedOrigins`. Remove the localhost origin from production. The application generates short-lived presigned PUT URLs (10 minutes) and GET URLs (3 minutes), and never stores either URL in PostgreSQL.

The current implementation validates PDF, JPEG, and PNG signatures and records technical validation. No malware scanner is configured; files must not be described as malware-scanned or clean until a privacy-reviewed scanner is added.

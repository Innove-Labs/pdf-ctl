# Self-Hosting Guide

This guide covers how to deploy pdf-ctl on your own server.

## Prerequisites

- **Go 1.21+** — to build from source
- **Ghostscript** — required for PDF compression
  ```bash
  # Debian/Ubuntu
  sudo apt install ghostscript

  # macOS
  brew install ghostscript

  # RHEL/CentOS/Fedora
  sudo dnf install ghostscript
  ```
- A Linux/macOS server (VPS, bare metal, or cloud VM)

---

## Quick Start

### 1. Clone and build

```bash
git clone <your-repo-url>
cd pdf-ctl
go build -o pdf-ctl cmd/server/main.go
```

### 2. Create required directories

```bash
mkdir -p DB uploads
```

### 3. Configure environment

Copy the example and edit it:

```bash
cp internal/config/env.example .env
```

Minimum required `.env` for local storage:

```env
HTTP_ADDR=:8080
ENV=prod
STORAGE_TYPE=local
STORAGE_LOCAL_BASE_PATH=./uploads
SQLITE_PATH=./DB/pdfctl.db
MAX_FILE_SIZE_MB=50
FILE_TTL=10m
DELETE_ON_DOWNLOAD=true
MAX_WORKERS=5
```

### 4. Run

```bash
source .env && ./pdf-ctl
# or
env $(cat .env | xargs) ./pdf-ctl
```

The server starts on `:8080` by default.

---

## Configuration Reference

| Variable | Default | Description |
|---|---|---|
| `HTTP_ADDR` | `:8080` | Address and port to listen on |
| `ENV` | `dev` | Set to `prod` to disable debug logging |
| `STORAGE_TYPE` | `local` | `local` or `s3` |
| `STORAGE_LOCAL_BASE_PATH` | `./uploads` | Directory to store uploaded files |
| `SQLITE_PATH` | `./DB/pdfctl.db` | Path to the SQLite database file |
| `MAX_FILE_SIZE_MB` | `50` | Maximum upload size in megabytes |
| `FILE_TTL` | `10m` | How long files are kept before cleanup (e.g. `30m`, `2h`) |
| `DELETE_ON_DOWNLOAD` | `true` | Delete output file immediately after it's downloaded |
| `MAX_WORKERS` | `5` | Number of concurrent PDF processing workers |
| `ANON_MAX_JOBS_PER_HOUR` | `5` | (Reserved) Rate limit for anonymous users |
| `USER_MAX_JOBS_PER_HOUR` | `50` | (Reserved) Rate limit for authenticated users |
| `CLEANUP_INTERVAL` | `30` | How often (in minutes) the cleanup worker runs |
| `CLEAN_UP_QUANTITY` | `2` | Number of expired files deleted per cleanup cycle |

---

## Storage Backends

### Local Filesystem (default)

Files are stored on disk. Suitable for single-server deployments.

```env
STORAGE_TYPE=local
STORAGE_LOCAL_BASE_PATH=/var/lib/pdf-ctl/uploads
```

Make sure the directory exists and is writable by the process user.

### AWS S3

For multi-server or stateless deployments, use S3.

```env
STORAGE_TYPE=s3
STORAGE_S3_BUCKET=your-bucket-name
STORAGE_S3_REGION=us-east-1
STORAGE_S3_PREFIX=pdf-ctl/          # optional key prefix
```

AWS credentials are resolved via the standard SDK chain:
1. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
2. `~/.aws/credentials` file
3. IAM instance role (recommended on EC2)

The IAM role or user needs `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` on the bucket.

---

## Running as a systemd Service

Create `/etc/systemd/system/pdf-ctl.service`:

```ini
[Unit]
Description=pdf-ctl PDF processing service
After=network.target

[Service]
Type=simple
User=pdf-ctl
WorkingDirectory=/opt/pdf-ctl
EnvironmentFile=/opt/pdf-ctl/.env
ExecStart=/opt/pdf-ctl/pdf-ctl
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then enable and start it:

```bash
sudo useradd -r -s /bin/false pdf-ctl
sudo mkdir -p /opt/pdf-ctl/DB /opt/pdf-ctl/uploads
sudo cp pdf-ctl /opt/pdf-ctl/
sudo cp .env /opt/pdf-ctl/
sudo chown -R pdf-ctl:pdf-ctl /opt/pdf-ctl

sudo systemctl daemon-reload
sudo systemctl enable --now pdf-ctl
sudo systemctl status pdf-ctl
```

---

## Reverse Proxy with nginx

Put nginx in front for TLS termination and a public-facing port.

```nginx
server {
    listen 443 ssl;
    server_name pdf.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/pdf.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pdf.yourdomain.com/privkey.pem;

    client_max_body_size 55M;   # slightly above MAX_FILE_SIZE_MB

    location / {
        proxy_pass         http://127.0.0.1:8080;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}

server {
    listen 80;
    server_name pdf.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

Get a free TLS certificate with Certbot:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d pdf.yourdomain.com
```

---

## Docker (manual)

No official Dockerfile is included yet, but here is a minimal one to get started:

```dockerfile
FROM golang:1.21-bookworm AS builder
WORKDIR /app
COPY . .
RUN go build -o pdf-ctl cmd/server/main.go

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ghostscript ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/pdf-ctl .
COPY web/ ./web/
RUN mkdir -p DB uploads
EXPOSE 8080
CMD ["./pdf-ctl"]
```

Build and run:

```bash
docker build -t pdf-ctl .
docker run -d \
  -p 8080:8080 \
  -v $(pwd)/DB:/app/DB \
  -v $(pwd)/uploads:/app/uploads \
  --env-file .env \
  pdf-ctl
```

---

## Verifying the Deployment

```bash
# Health check
curl http://localhost:8080/api/health

# Upload a file
curl -F "file=@document.pdf" http://localhost:8080/api/file

# Create a compress job
curl -X POST http://localhost:8080/api/jobs/compress \
  -H "Content-Type: application/json" \
  -d '{"file_id": "<id-from-upload>"}'

# Check job status
curl http://localhost:8080/api/job/status/<job-id>
```

---

## Troubleshooting

**Compression jobs fail immediately**
- Ghostscript is not installed or not in `PATH`. Run `gs --version` to check.

**Server won't start — "invalid duration" / "invalid int" errors**
- An environment variable has the wrong format. Check `FILE_TTL` is a Go duration string (e.g. `10m`, `1h30m`) and numeric fields are plain integers.

**Uploads fail with 413**
- Increase `MAX_FILE_SIZE_MB` in your `.env` and `client_max_body_size` in nginx to match.

**Files disappear too quickly**
- Increase `FILE_TTL` (e.g. `FILE_TTL=1h`) or set `DELETE_ON_DOWNLOAD=false`.

**SQLite database locked errors under high load**
- Reduce `MAX_WORKERS` or migrate to a separate worker process. SQLite handles moderate concurrency fine but is not designed for high write throughput.

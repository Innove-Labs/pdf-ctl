# pdf-ctl

A self-hostable PDF processing service with a web UI. Handles compress, split, merge, encrypt, decrypt, and image-to-PDF conversion — all processed asynchronously via a worker pool.

## Features

- **Compress** — Reduce PDF file size using Ghostscript
- **Split** — Split PDFs by page, range, or every N pages
- **Merge** — Combine multiple PDFs into one
- **Encrypt** — Password-protect PDFs
- **Decrypt** — Remove password from PDFs
- **Image to PDF** — Convert images (JPG, PNG, etc.) to PDF
- **Pluggable storage** — Local filesystem or AWS S3
- **Async job queue** — Worker pool with SQLite-backed job state

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Go, Gin, GORM, SQLite |
| PDF engine | pdfcpu, Ghostscript |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Storage | Local filesystem or AWS S3 |

---

## Running Locally

### Prerequisites

- [Go 1.21+](https://go.dev/dl/)
- [Node.js 18+](https://nodejs.org/) (for the frontend)
- [Ghostscript](https://www.ghostscript.com/) — required for PDF compression

Install Ghostscript:

```bash
# Ubuntu/Debian
sudo apt install ghostscript

# macOS
brew install ghostscript
```

### 1. Clone the repository

```bash
git clone <repo-url>
cd pdf-ctl
```

### 2. Set up environment

```bash
cp internal/config/env.example .env
```

Edit `.env` as needed. For local development the defaults work out of the box:

```env
HTTP_ADDR=:8080
ENV=dev
STORAGE_TYPE=local
STORAGE_LOCAL_BASE_PATH=./uploads
SQLITE_PATH=./DB/pdfctl.db
MAX_FILE_SIZE_MB=50
FILE_TTL=10m
DELETE_ON_DOWNLOAD=true
MAX_WORKERS=5
```

### 3. Create required directories

```bash
mkdir -p uploads DB
```

### 4. Build and run the backend

```bash
go run cmd/server/main.go
```

The server starts at `http://localhost:8080`.

### 5. Run the frontend (optional, for development)

The production binary serves the pre-built frontend from `./web`. For frontend development, run the dev server separately:

```bash
cd frontend
npm install
npm run dev
```

Frontend dev server runs at `http://localhost:3000` and proxies API calls to `localhost:8080`.

### Running tests

```bash
# All tests
go test ./...

# Specific package with verbose output
go test -v ./internal/processes

# Single test
go test -v -run TestFunctionName ./internal/processes
```

---

## Self-Hosting

### Quick deploy with `deploy.sh`

The repo includes a deploy script that builds everything and pushes it to a remote Linux server over SSH.

**Prerequisites on the remote server:**
- Ghostscript installed
- App directory at `/home/apps/pdf-ctl/` with subdirs `web/`, `uploads/`, `DB/`
- A systemd service named `pdfctl` already configured (see [systemd section](#systemd-service) below)

**Run:**

```bash
./deploy.sh user@your-server.com /path/to/ssh-key.pem
```

What it does:
1. Builds the Next.js frontend (`npm run deploy` → outputs to `./web/`)
2. Cross-compiles the Go binary for `linux/amd64`
3. Rsyncs `web/` and the binary to the remote server
4. Restarts the `pdfctl` systemd service

The script expects the service to already exist on the server. Set that up once following the [systemd](#systemd-service) and [nginx](#nginx-reverse-proxy) sections below, then use `deploy.sh` for all subsequent deploys.

---

### Manual Build

```bash
# Build the frontend
cd frontend
npm install
npm run deploy   # outputs to ../web/
cd ..

# Build the Go binary
go build -o pdf-ctl cmd/server/main.go
```

To cross-compile for Linux from another OS:

```bash
GOOS=linux GOARCH=amd64 go build -o pdf-ctl cmd/server/main.go
```

### Directory structure on server

```
/opt/pdf-ctl/
├── pdf-ctl          # Binary
├── web/             # Built Next.js frontend
├── uploads/         # File storage (local mode)
├── DB/              # SQLite database
└── .env             # Environment config
```

### systemd service

Create `/etc/systemd/system/pdf-ctl.service`:

```ini
[Unit]
Description=pdf-ctl PDF processing service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/pdf-ctl
EnvironmentFile=/opt/pdf-ctl/.env
ExecStart=/opt/pdf-ctl/pdf-ctl
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable pdf-ctl
sudo systemctl start pdf-ctl
sudo systemctl status pdf-ctl
```

### nginx reverse proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Increase for large PDF uploads
    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Add TLS with Certbot:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Docker (single container)

```dockerfile
FROM golang:1.21-alpine AS builder
RUN apk add --no-cache nodejs npm
WORKDIR /app
COPY . .
RUN cd frontend && npm ci && npm run deploy
RUN go build -o pdf-ctl cmd/server/main.go

FROM alpine:latest
RUN apk add --no-cache ghostscript
WORKDIR /app
COPY --from=builder /app/pdf-ctl .
COPY --from=builder /app/web ./web
RUN mkdir -p uploads DB
EXPOSE 8080
CMD ["./pdf-ctl"]
```

```bash
docker build -t pdf-ctl .
docker run -d \
  -p 8080:8080 \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/DB:/app/DB \
  -e ENV=prod \
  pdf-ctl
```

---

## Configuration

All configuration is via environment variables.

| Variable | Default | Description |
|---|---|---|
| `HTTP_ADDR` | `:8080` | Server listen address |
| `ENV` | `dev` | Set to `prod` for Gin release mode |
| `STORAGE_TYPE` | `local` | Storage backend: `local` or `s3` |
| `STORAGE_LOCAL_BASE_PATH` | `./uploads` | Root directory for local storage |
| `SQLITE_PATH` | `./DB/pdfctl.db` | SQLite database file path |
| `MAX_FILE_SIZE_MB` | `50` | Maximum upload size in MB |
| `FILE_TTL` | `10m` | How long files are retained (Go duration) |
| `DELETE_ON_DOWNLOAD` | `true` | Delete output file after it is downloaded |
| `MAX_WORKERS` | `5` | Number of concurrent job workers |
| `CLEANUP_INTERVAL` | `10` | Minutes between cleanup cycles |
| `CLEAN_UP_QUANTITY` | `50` | Files deleted per cleanup cycle |
| `ANON_MAX_JOBS_PER_HOUR` | `5` | Rate limit for anonymous users (reserved) |
| `USER_MAX_JOBS_PER_HOUR` | `50` | Rate limit for authenticated users (reserved) |

### S3 Storage

Set `STORAGE_TYPE=s3` and provide:

| Variable | Description |
|---|---|
| `STORAGE_S3_BUCKET` | S3 bucket name |
| `STORAGE_S3_REGION` | AWS region (e.g. `us-east-1`) |
| `STORAGE_S3_PREFIX` | Optional key prefix |

Credentials are resolved via the standard AWS SDK chain: `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` env vars, `~/.aws/credentials` file, or an IAM instance role.

Required IAM permissions: `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`.

---

## API Reference

### Health check

```
GET /api/health
→ 200 { "status": "ok" }
```

### Upload a file

```
POST /api/file
Content-Type: multipart/form-data

file: <binary>

→ 201 { "id": "<uuid>", "filename": "doc.pdf", "size_bytes": 123456 }
```

### Download a file

```
GET /api/file/:id/download
→ 200 <binary stream>
```

If `DELETE_ON_DOWNLOAD=true` the file is removed from storage after this request.

### Check job status

```
GET /api/job/status/:id

→ 200 { "job_id": "<uuid>", "status": "pending" }          // still queued
→ 200 { "job_id": "<uuid>", "status": "processing" }       // in progress
→ 200 { "job_id": "<uuid>", "status": "failed" }           // error
→ 200 {
    "job_id": "<uuid>",
    "status": "completed",
    "output_files": [
      { "id": "<uuid>", "position": 0 }
    ]
  }
```

Download each output file via `GET /api/file/:id/download`.

### Compress

```
POST /api/jobs/compress
{ "file_id": "<uuid>" }
→ 201 { "job_id": "<uuid>", "status": "pending" }
```

### Split

```
POST /api/jobs/split
{
  "file_id": "<uuid>",
  "mode": "all" | "pages" | "n-pages" | "range",
  "pages": [1, 3, 5],                          // mode=pages
  "n_pages": 2,                                // mode=n-pages
  "ranges": [{ "start": 1, "end": 3 }]        // mode=range
}
→ 201 { "job_id": "<uuid>", "status": "pending" }
```

### Merge

```
POST /api/jobs/merge
{
  "files": [
    { "file_id": "<uuid>", "position": 0 },
    { "file_id": "<uuid>", "position": 1 }
  ]
}
→ 201 { "job_id": "<uuid>", "status": "pending" }
```

### Encrypt

```
POST /api/jobs/encrypt
{
  "files": [{ "file_id": "<uuid>", "position": 0 }],
  "password": "secretpassword"
}
→ 201 { "job_id": "<uuid>", "status": "pending" }
```

### Decrypt

```
POST /api/jobs/decrypt
{
  "files": [{ "file_id": "<uuid>", "position": 0 }],
  "password": "originalpassword"
}
→ 201 { "job_id": "<uuid>", "status": "pending" }
```

### Image to PDF

```
POST /api/jobs/convert-image-pdf
{
  "files": [
    { "file_id": "<uuid>", "position": 0 },
    { "file_id": "<uuid>", "position": 1 }
  ],
  "page_size": "A4",
  "orientation": "portrait",
  "merge_into_one": true
}
→ 201 { "job_id": "<uuid>", "status": "pending" }
```

---

## Architecture

```
Client
  │
  ▼
Gin HTTP Server
  │
  ├── POST /api/file      → Save file to storage, record in DB
  ├── POST /api/jobs/*    → Insert job (status=pending) into DB
  └── GET  /api/job/:id   → Poll job status + output file IDs

Worker Pool (MaxWorkers goroutines)
  │
  ├── Dispatcher polls DB every 1s for pending jobs
  ├── Claims job atomically (SELECT + UPDATE in transaction)
  └── Routes to process via registry:
        compress   → Ghostscript
        split      → pdfcpu
        merge      → pdfcpu
        encrypt    → pdfcpu
        decrypt    → pdfcpu
        convertImg → pdfcpu

CleanupWorker
  └── Deletes expired files every CLEANUP_INTERVAL minutes
```

Jobs flow: `pending → processing → completed | failed`

---

## License

MIT

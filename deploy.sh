#!/usr/bin/env bash
set -e

# Usage: ./deploy.sh user@host /path/to/key.pem
TARGET="${1:?Usage: ./deploy.sh user@host /path/to/key.pem}"
KEY="${2:?Usage: ./deploy.sh user@host /path/to/key.pem}"

SSH="ssh -i $KEY"
RSYNC_SSH="rsync -az -e 'ssh -i $KEY'"

echo "==> Building frontend..."
cd frontend
npm run deploy
cd ..

echo "==> Building Go binary (linux/amd64)..."
GOOS=linux GOARCH=amd64 go build -o pdfctl-bin cmd/server/main.go

echo "==> Uploading to $TARGET..."
rsync -az --delete -e "ssh -i $KEY" web/       "$TARGET:/home/apps/pdf-ctl/web/"
rsync -az           -e "ssh -i $KEY" pdfctl-bin "$TARGET:/home/apps/pdf-ctl/pdfctl"

echo "==> Restarting service..."
$SSH "$TARGET" "sudo systemctl restart pdfctl && sudo systemctl status pdfctl --no-pager"

rm -f pdfctl-bin
echo "==> Deploy complete."

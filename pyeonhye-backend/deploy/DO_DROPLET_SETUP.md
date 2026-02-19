# Pyeonhye Backend Deploy (DigitalOcean Droplet)

This guide assumes Ubuntu 24.04 and a fresh droplet.

## 1) Server bootstrap

```bash
apt update && apt upgrade -y
apt install -y curl git nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v
npm -v
```

## 2) App setup

```bash
mkdir -p /opt
cd /opt
# Replace with your actual repository URL
git clone <YOUR_GITHUB_REPO_URL> pyeonhye-backend
cd /opt/pyeonhye-backend/pyeonhye-backend
npm install
npm run build
cp .env.example .env
```

Edit `.env` with real values:
- `DATABASE_URL`
- `ADMIN_BEARER_TOKEN`
- `CORS_ORIGIN`

## 3) Migration + run test

```bash
npm run migrate
npm run start
```

Health check:

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/promos
```

## 4) systemd service

```bash
cp /opt/pyeonhye-backend/pyeonhye-backend/deploy/systemd/pyeonhye-backend.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable pyeonhye-backend
systemctl restart pyeonhye-backend
systemctl status pyeonhye-backend --no-pager
```

Logs:

```bash
journalctl -u pyeonhye-backend -f
```

## 5) nginx reverse proxy

```bash
cp /opt/pyeonhye-backend/pyeonhye-backend/deploy/nginx/pyeonhye-api.conf /etc/nginx/sites-available/pyeonhye-api
ln -sf /etc/nginx/sites-available/pyeonhye-api /etc/nginx/sites-enabled/pyeonhye-api
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

Public check (replace with your droplet IP):

```bash
curl http://165.232.168.243/health
curl http://165.232.168.243/promos
```

## 6) Frontend env

`pyeonhye/.env.example`:

```env
VITE_API_BASE_URL=http://165.232.168.243
VITE_AD_GROUP_ID=ait-ad-test-interstitial-id
```

For production, use your live ad group ID and HTTPS domain.

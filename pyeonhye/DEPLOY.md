# 편혜 Frontend Deploy Notes

## 1) Environment

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Set real values:

```env
VITE_API_BASE_URL=http://165.232.168.243
VITE_AD_GROUP_ID=<YOUR_LIVE_AD_GROUP_ID>
```

## 2) Build

```bash
npm install --legacy-peer-deps
npm run build
```

## 3) Static hosting options

- GitHub Pages (`docs` or `gh-pages` branch)
- Vercel / Netlify
- Nginx static root on droplet

## 4) Runtime check

- Open app home
- Confirm list loads from `/promos`
- Confirm compare entry ad and premium action ad gates
- Confirm bookmark refresh check flow

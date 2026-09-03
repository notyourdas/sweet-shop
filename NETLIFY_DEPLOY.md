# MithAI Sweet Shop - Netlify Deployment Guide

Follow these steps to deploy this repository to **Netlify**:

---

## 1. Prerequisites
- A free **[Netlify](https://www.netlify.com/)** account.
- This repository exported to **GitHub**, **GitLab**, or uploaded via the **Netlify CLI**.

---

## 2. One-Click / Git Deployment on Netlify

1. Go to your **[Netlify Dashboard](https://app.netlify.com)**.
2. Click **Add new site** > **Import an existing project**.
3. Select your Git provider (**GitHub** / **GitLab** / **Bitbucket**).
4. Choose the repository for **MithAI Sweet Shop**.
5. Netlify will automatically detect the configuration from `netlify.toml`:
   - **Base directory**: (leave blank / root)
   - **Build command**: `mkdir -p dist && cp -r templates/* dist/ && cp -r static dist/ && python3 -m pip install -r requirements.txt`
   - **Publish directory**: `dist`
   - **Functions directory**: `netlify/functions`
6. Under **Environment variables**, configure:
   - `ADMIN_SIGNUP_PASSCODE`: `admin123` (or your custom admin passcode)
   - `GEMINI_API_KEY`: *(Optional)* Your Google Gemini API key for smart AI recommendations.
   - `FLASK_SECRET_KEY`: *(Optional)* Any random 32-character secret string for session security.
7. Click **Deploy MithAI Sweet Shop**.

---

## 3. Netlify CLI Deployment (Alternative Quick Method)

If you prefer deploying from your terminal with Netlify CLI:

```bash
# 1. Install Netlify CLI
npm install -g netlify-cli

# 2. Build the distribution assets
npm run build

# 3. Log in to Netlify
netlify login

# 4. Deploy preview
netlify deploy

# 5. Deploy directly to production
netlify deploy --prod --dir=dist --functions=netlify/functions
```

---

## 4. Architecture on Netlify

- **Static Pages & Assets (`/dist`)**: Served via Netlify High-Speed Global CDN (`index.html`, `admin.html`, `/static/css`, `/static/js`, `/static/images`).
- **Dynamic Flask Backend (`netlify/functions/app.py`)**: Powered by AWS Lambda Serverless WSGI through Netlify Functions handling:
  - Customer & Admin Firebase Authentication (`/api/auth/*`)
  - Sweets Catalog & Live Stock (`/api/sweets/*`)
  - Order Processing & History (`/api/sales`)
  - Executive Sales Intelligence & Metrics (`/api/admin/metrics`)
  - AI Sweet Sommelier Recommendations (`/api/ai/recommend`)
- **Database Persistence**: Backed by Google Cloud Firestore database (`ai-studio-mithaisweetshop-43115c17-caa1-4db0-8ed2-eb47d7b0363b`).

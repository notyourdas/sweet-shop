# 🚀 MithAI Sweet Shop — Netlify Deployment Guide

This guide provides step-by-step instructions for deploying **MithAI Sweet Shop** to **Netlify**.

---

## 🏗️ Architecture Overview

The project is architected to run on Netlify using **Netlify Serverless Functions**:
- **Frontend Assets**: HTML, CSS, JavaScript, and Sweet Images are served directly via Netlify's high-performance global CDN from `/templates` and `/static`.
- **Backend & Data Science**: The Python Flask backend runs via Netlify's Python runtime (`serverless-wsgi`) located in `netlify/functions/app.py`.
- **Routing**: `netlify.toml` automatically routes all API requests (`/api/*`) and dynamic endpoints (`/admin`) to the serverless function.
- **Database**: Cloud Firebase Firestore persists all sweets catalog, customer accounts, and sales transactions across the globe.

---

## 📁 Key Deployment Files Already Configured

1. `netlify.toml`: Directs Netlify on build directories, static folder mapping, and route proxies to the serverless function.
2. `netlify/functions/app.py`: Serverless WSGI entrypoint that adapts the Flask application into a Netlify Function.
3. `requirements.txt`: Python package dependencies (`Flask`, `pandas`, `numpy`, `Werkzeug`, `serverless-wsgi`).

---

## 🌟 Method 1: Deploy via GitHub & Netlify Web UI (Recommended)

1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Deploy MithAI Sweet Shop"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/mithai-sweet-shop.git
   git push -u origin main
   ```

2. **Log in to [Netlify](https://app.netlify.com)**:
   - Click **"Add new site"** > **"Import an existing project"**.
   - Select **GitHub** and authorize access to your `mithai-sweet-shop` repository.

3. **Configure Build Settings**:
   Netlify will automatically detect the settings from `netlify.toml`:
   - **Publish directory**: `templates`
   - **Functions directory**: `netlify/functions`
   - **Build command**: *(leave blank or `pip install -r requirements.txt`)*

4. **Add Environment Variables** (Under *Site configuration* > *Environment variables*):
   - `FLASK_SECRET_KEY`: Any long random secret string (e.g. `mithai-shop-production-secret-9988`)
   - `ADMIN_SIGNUP_PASSCODE`: Passcode for creating new shop admins (default: `admin123`)

5. **Click "Deploy Site"**:
   - Netlify will build the serverless functions and CDN cache.
   - Your live URL will be generated (e.g., `https://mithai-sweet-shop.netlify.app`).

---

## ⚡ Method 2: Deploy via Netlify CLI

If you prefer terminal-based deployment:

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Log In to Netlify**:
   ```bash
   netlify login
   ```

3. **Deploy to Production**:
   ```bash
   netlify deploy --prod
   ```

---

## 💡 Method 3: Hybrid Deployment (Alternative for High-Compute Python)

If you anticipate very heavy Pandas/NumPy computational workloads exceeding Netlify's free function timeout:
1. **Frontend on Netlify**: Host the static assets on Netlify for free instant loading.
2. **Backend on Render / Cloud Run / Railway**: Deploy `app.py` with Gunicorn (`gunicorn app:app`).
3. Set the backend API URL in `netlify.toml` redirects to point to your live backend service.

---

## 🧪 Testing the Deployment

Once deployed, verify:
- ✅ Storefront loads authentic sweet photos: `https://<your-site>.netlify.app/`
- ✅ Sign up as Customer or Admin directly in the UI.
- ✅ Add items to cart and click "Buy Now" to verify Firebase sales recording.
- ✅ Visit `/admin` and log in with your admin credentials to inspect the linear regression sales forecast.

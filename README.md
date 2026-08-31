<div align="center">

<img src="assets/banner.png" alt="openGym" width="720">

<br>

# openGym — Next.js PWA Edition

**A fast, local-first gym & body-weight tracker you actually own.**

Plan your week, run guided workouts, track every set and your body weight over time — on your phone, tablet, or desktop. No accounts required, no database setup needed, 100% offline-capable, and optimized for 1-click deployment on **Vercel**.

<br>

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-38bdf8?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![PWA](https://img.shields.io/badge/PWA-installable-a78bfa?style=flat-square)](https://web.dev/progressive-web-apps/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com)
[![License: AGPL v3](https://img.shields.io/badge/license-AGPL--3.0-a3e635?style=flat-square)](LICENSE)

</div>

<br>

## ✨ Highlights

- ⚡ **Local-First & Zero-Config** — Works instantly with no authentication gates or external database. All workouts, routines, and body weights are stored securely in browser `localStorage`.
- 📱 **Progressive Web App (PWA)** — Installable on iOS (Safari: Share → *Add to Home Screen*) and Android/Chrome (*Install App*). Screen wake lock keeps your phone awake during workouts.
- 🏋️ **Complete Workout Suite** — 1,324+ exercises with animated demonstrations, customizable routines, linear/Greyskull/double progression, 1RM calculator, supersets, and cardio logging.
- 📈 **Stats & Muscle Map** — GitHub-style activity heatmaps, interactive body weight graphs, PR charts, and front/back anatomical muscle maps.
- 🔄 **Universal Backup & Import** — 1-click JSON backup export/import, plus import support for **FitNotes**, **Strong**, **Hevy**, and **Apple Health**.
- 🚀 **Vercel Ready** — Lightweight repository structure with CDN-streamed exercise demonstrations for instant builds and global edge delivery.

---

## 🚀 Quick Start (Local)

### 1. Install dependencies
```bash
npm install
```

### 2. Run local development server
```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 3. Production Build
```bash
npm run build
npm start
```

---

## ☁️ Deploy to Vercel

1. Push your repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: migrate openGym to Next.js PWA"
   git remote add origin https://github.com/YOUR_USERNAME/openGym.git
   git branch -M main
   git push -u origin main
   ```
2. Go to **[Vercel Dashboard](https://vercel.com)** → **Add New Project**.
3. Select your `openGym` GitHub repository.
4. Click **Deploy**. Vercel will automatically detect Next.js and build your app in seconds!

---

## 📱 PWA Installation

- **iOS (Safari)**: Open the URL → Tap **Share** icon → Tap **Add to Home Screen**.
- **Android (Chrome)**: Open the URL → Tap **⋮ (Menu)** → Tap **Install App** or **Add to Home screen**.
- **Desktop (Chrome/Edge)**: Click the **Install** icon in the address bar.

---

## 🔒 Data & Privacy

All training data lives strictly inside your device's browser storage (`gym_state_v1`). You can export a full JSON backup anytime from **Settings → Export backup (JSON)**.

---

## 📄 License

AGPL v3 License · Exercise dataset provided by [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset).

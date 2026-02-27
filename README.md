# 🎤 Tiny Talk

A simple family app for weekly photo presentations. Upload photos throughout the week, then pull them up on the TV for your toddler's "mini presentation" about their week.

## How It Works

1. **During the week**: You and your wife upload photos from your phones
2. **Presentation night**: Open the app on your TV (AirPlay, Chromecast, or browser) and let the little one walk you through their week
3. **History**: Past weeks are saved so you can revisit old presentations

## Setup

### 1. Create GitHub Repo

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/tiny-talk.git
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and import your GitHub repo
2. In the Vercel dashboard for your project:
   - Go to **Storage** → **Create** → **Blob Store**
   - Connect it to your project (this auto-sets `BLOB_READ_WRITE_TOKEN`)
3. Add environment variable:
   - `APP_PIN` = your family PIN (e.g., `5678`)
4. Redeploy

### 3. Use It

- Open `your-app.vercel.app` on your phone → enter PIN → upload photos
- Share the URL with your wife so she can upload too
- On presentation night, open `your-app.vercel.app/present` on your TV for a clean presentation view

### Add to Home Screen (Optional)

On iPhone: Open the URL in Safari → Share → Add to Home Screen. It'll look and feel like a native app.

## Routes

- `/` — Main app (upload, collage view, history)
- `/present` — Clean TV presentation mode (collage + slideshow, keyboard/tap navigation)

## Tech Stack

- **Next.js 14** (App Router)
- **Vercel Blob** (photo storage)
- **TypeScript**
- No database needed — photos are organized by week in blob storage

## Environment Variables

| Variable | Description |
|----------|-------------|
| `BLOB_READ_WRITE_TOKEN` | Auto-set by Vercel Blob storage |
| `APP_PIN` | Your family PIN code |

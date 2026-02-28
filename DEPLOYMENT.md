# 🚀 Hostinger Deployment Guide

## ✅ Pre-Deployment Checklist

### 1. GitHub Repository
- ✅ Repository: `https://github.com/kartvelishvili/handicraftkidscom.git`
- ✅ Branch: `main`
- ✅ Latest commit pushed

### 2. Hostinger Configuration

#### Framework Settings:
```
Framework preset: Vite
Branch: main
Node version: 22.x
Root directory: ./
```

#### Build Settings:
```
Build command: npm run build
Output directory: dist
Install command: npm install
```

#### 🔑 Environment Variables (CRITICAL — MUST ADD):
Navigate to: **Hostinger Panel → Website → Git Deployment → Environment Variables**

Add these TWO variables:

| Variable Name | Value |
|---------------|-------|
| `VITE_SUPABASE_URL` | `https://ubfzmfbjifnwoovgikkc.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViZnptZmJqaWZud29vdmdpa2tjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNTIyMjYsImV4cCI6MjA4MDkyODIyNn0.K0gfZMkXOAHHiBD5e8kU9cFgAQ3HS5kJydEk-5FK3CU` |

⚠️ **WITHOUT THESE, THE SITE WILL NOT WORK** (blank pages, no products, no data)

---

## 🐛 Troubleshooting

### Problem: Product pages show blank/white screen

**Solution 1: Check Environment Variables**
1. Go to Hostinger Panel → Environment Variables
2. Verify both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` exist
3. Re-deploy after adding variables

**Solution 2: Check `.htaccess` file**
1. SSH/FTP into Hostinger
2. Navigate to `public_html/` (or wherever your site root is)
3. Verify `.htaccess` file exists
4. If missing, create it with content from `public/.htaccess` in this repo

**Solution 3: Check Browser Console**
1. Open product page: `https://handicraftkids.com/product/ae87c3cc-e1f2-47a6-b8df-d5683dbcbef2`
2. Open Browser DevTools (F12)
3. Check Console tab for errors
4. Check Network tab for failed requests

**Common Error Messages:**
- `"Failed to fetch"` → Supabase env vars missing
- `"Invalid API key"` → Wrong Supabase anon key
- `404 Not Found` → `.htaccess` not working

---

## 🔍 Manual Verification Steps

After deployment:

### 1. Test Homepage
- URL: `https://handicraftkids.com/`
- Expected: Hero, categories, products load

### 2. Test Category Page
- URL: `https://handicraftkids.com/category/all`
- Expected: Product grid with filtering

### 3. Test Product Page (CRITICAL)
- URL: `https://handicraftkids.com/product/ae87c3cc-e1f2-47a6-b8df-d5683dbcbef2`
- Expected: Product images, price, description, add to cart button
- If blank: Check console logs (F12 → Console)

### 4. Test Direct URL (SPA Routing)
- Refresh on product page (F5)
- Expected: Page reloads correctly (not 404)
- If 404: `.htaccess` rewrite rules not active

---

## 📁 File Structure on Hostinger

After successful build, your `public_html/` should contain:

```
public_html/
├── index.html          # Main SPA entry
├── .htaccess           # Rewrite rules (MUST EXIST)
├── assets/             # JS/CSS bundles
│   ├── index-[hash].js
│   └── index-[hash].css
├── robots.txt
├── sitemap.xml
└── [other static files]
```

---

## ⚙️ Advanced: Manual .htaccess Creation

If Hostinger doesn't automatically copy `.htaccess`, create it manually:

**Path:** `public_html/.htaccess`

**Content:**
```apache
ErrorDocument 404 /index.html

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ index.html [L]
</IfModule>
```

---

## 📞 Support Checklist for Hostinger Support

If still not working, contact Hostinger support with:

1. **Issue:** "Product pages show blank screen on direct URL access"
2. **Framework:** Vite (React SPA)
3. **Expected:** All URLs should serve `index.html` (not 404)
4. **Request:** Enable `mod_rewrite` and verify `.htaccess` is active
5. **Repository:** https://github.com/kartvelishvili/handicraftkidscom.git

---

## ✅ Deployment Complete Checklist

- [ ] GitHub repo connected to Hostinger
- [ ] Branch set to `main`
- [ ] Node version set to 22.x
- [ ] Environment variables added (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
- [ ] Build completed successfully (check Hostinger logs)
- [ ] Homepage loads (`/`)
- [ ] Category page loads (`/category/all`)
- [ ] Product page loads directly (`/product/[id]`)
- [ ] Product page reloads correctly on F5 (no 404)
- [ ] Browser console has no errors
- [ ] Add to cart works
- [ ] Checkout flow works

---

## 🎯 Quick Test Command (Local)

Before deploying, test locally:

```bash
# Build production version
npm run build

# Test the built version locally
npx serve dist -p 3001

# Test SPA routing
# Open: http://localhost:3001/product/ae87c3cc-e1f2-47a6-b8df-d5683dbcbef2
# Refresh page (F5) - should NOT 404
```

If local test works but production doesn't → environment variables issue.

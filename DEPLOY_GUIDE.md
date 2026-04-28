# PredictIQ — Deploy গাইড (বাংলা)

## ধাপ ১ — GitHub এ Project আপলোড করুন

1. https://github.com → Sign Up / Login
2. "New Repository" বাটনে ক্লিক করুন
3. Repository name: `predictiq`
4. "Create Repository" ক্লিক করুন
5. এই পুরো `predictiq` ফোল্ডারের সব ফাইল আপলোড করুন
   (Drag & drop করুন GitHub পেজে)

---

## ধাপ ২ — Vercel এ Deploy করুন

1. https://vercel.com → GitHub দিয়ে Sign Up
2. "Add New Project" ক্লিক করুন
3. আপনার `predictiq` repository সিলেক্ট করুন
4. "Deploy" বাটন চাপুন
5. ২-৩ মিনিটে Deploy হয়ে যাবে ✅

---

## ধাপ ৩ — API Key যোগ করুন (গুরুত্বপূর্ণ!)

API Key ছাড়া AI কাজ করবে না।

1. Vercel Dashboard → আপনার Project → "Settings" ট্যাব
2. বাম মেনুতে "Environment Variables" ক্লিক করুন
3. নিচের মতো যোগ করুন:

   Key:   ANTHROPIC_API_KEY
   Value: sk-ant-api03-xxxxxxxxxxxxxxxx (আপনার আসল key)

4. "Save" করুন
5. Project আবার Redeploy করুন

### API Key কোথায় পাবেন?
- https://console.anthropic.com → "API Keys" → "Create Key"

---

## ধাপ ৪ — Custom Domain যোগ করুন

1. প্রথমে Domain কিনুন:
   - https://namecheap.com (সস্তা, recommended)
   - উদাহরণ: `predictiq.com` বা `predictiq.xyz`

2. Vercel Dashboard → আপনার Project → "Settings" → "Domains"
3. আপনার domain টাইপ করুন → "Add" ক্লিক করুন
4. Vercel একটা DNS record দেবে (যেমন: CNAME বা A record)
5. Namecheap Dashboard → "Domain List" → "Manage" → "Advanced DNS"
6. Vercel এর দেওয়া DNS record টা সেখানে যোগ করুন
7. ১৫-৩০ মিনিট অপেক্ষা করুন → আপনার domain কাজ শুরু করবে ✅

---

## Project ফাইল স্ট্রাকচার

```
predictiq/
├── api/
│   └── analyze.js        ← Backend (API key এখানে সুরক্ষিত)
├── src/
│   ├── main.jsx           ← React entry point
│   └── App.jsx            ← মূল App
├── index.html
├── package.json
├── vite.config.js
└── vercel.json
```

---

## সমস্যা হলে?

- ❌ "API key not configured" → ধাপ ৩ আবার করুন
- ❌ Build failed → GitHub এ সব ফাইল ঠিকমতো আছে কিনা দেখুন
- ❌ Domain কাজ করছে না → DNS propagation এ ২৪ ঘন্টা লাগতে পারে

---

সাহায্যের জন্য: https://vercel.com/docs

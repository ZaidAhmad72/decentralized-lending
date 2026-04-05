# ⚡ Quick Deploy Checklist

## 🎯 Deploy to Vercel (Recommended) - 5 Minutes

### Step 1: Go to Vercel
👉 [vercel.com/new](https://vercel.com/new)

### Step 2: Import Repository
- Connect GitHub
- Select: `ZaidAhmad72/decentralized-lending`
- Branch: `defi-architecture`
- Root Directory: `frontend`

### Step 3: Add Environment Variables
Copy-paste these exactly:

```
NEXT_PUBLIC_SUPABASE_URL=https://wasrxmbolaabniccxvnq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_6fdVsXTJCQY97hEXSzu90Q_038A5SDl
GROQ_API_KEY=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
```

### Step 4: Deploy
Click "Deploy" and wait 2-3 minutes ☕

### Step 5: Update Supabase
After deployment, add your Vercel URL to Supabase:

1. Go to: [supabase.com/dashboard/project/wasrxmbolaabniccxvnq/auth/url-configuration](https://supabase.com/dashboard/project/wasrxmbolaabniccxvnq/auth/url-configuration)
2. Add to Redirect URLs: `https://your-app.vercel.app/auth/callback`
3. Update Site URL: `https://your-app.vercel.app`

### Step 6: Test
✅ Visit your app
✅ Try signup
✅ Try login with OTP
✅ Check dashboard

---

## 🔥 Features Included

✅ OTP 2-Factor Authentication
✅ Multi-currency support (10 cryptos)
✅ Private lending pools
✅ Fraud detection system
✅ Credit scoring
✅ Real-time crypto prices
✅ AI chatbot
✅ Dark mode
✅ Multi-language support
✅ Smart wallet integration

---

## 📱 Your App URLs After Deploy

- **Production**: `https://your-project.vercel.app`
- **Dashboard**: `https://your-project.vercel.app/dashboard`
- **API**: `https://your-project.vercel.app/api/*`

---

## 🆘 Need Help?

Check `DEPLOYMENT_GUIDE.md` for detailed instructions.

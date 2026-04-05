# Deployment Guide - DeFi Lending Platform

## 🚀 Recommended Deployment Platform: **Vercel**

Vercel is the best choice for this Next.js application because:
- Built by the creators of Next.js
- Zero-config deployment
- Automatic HTTPS
- Edge network for fast global access
- Free tier with generous limits
- Easy environment variable management
- Automatic preview deployments for branches

## 📋 Prerequisites

Before deploying, ensure you have:
1. GitHub account (already connected)
2. Supabase project (already set up)
3. Vercel account (free)
4. GROQ API key (already have)

## 🔧 Step-by-Step Deployment

### 1. Prepare Your Repository

Your code is already pushed to GitHub on the `defi-architecture` branch.

### 2. Sign Up for Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up"
3. Choose "Continue with GitHub"
4. Authorize Vercel to access your repositories

### 3. Import Your Project

1. Click "Add New..." → "Project"
2. Find `ZaidAhmad72/decentralized-lending`
3. Click "Import"
4. Select the `defi-architecture` branch
5. Set Root Directory to `frontend`

### 4. Configure Environment Variables

In the Vercel project settings, add these environment variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://wasrxmbolaabniccxvnq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_6fdVsXTJCQY97hEXSzu90Q_038A5SDl

# GROQ API for Chatbot
GROQ_API_KEY=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

# Optional: Biconomy Wallet (if you have these)
# NEXT_PUBLIC_BICONOMY_BUNDLER_URL=your_bundler_url
# NEXT_PUBLIC_BICONOMY_PAYMASTER_KEY=your_paymaster_key
```

### 5. Build Settings

Vercel should auto-detect these, but verify:
- **Framework Preset**: Next.js
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 6. Deploy

1. Click "Deploy"
2. Wait 2-3 minutes for the build
3. Your app will be live at `https://your-project.vercel.app`

## 🔐 Supabase Configuration

### Update Supabase Auth Settings

After deployment, update your Supabase project:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Add your Vercel URL to:
   - **Site URL**: `https://your-project.vercel.app`
   - **Redirect URLs**: 
     - `https://your-project.vercel.app/auth/callback`
     - `http://localhost:3000/auth/callback` (for local dev)

### Enable Email OTP

1. Go to **Authentication** → **Providers** → **Email**
2. Enable "Email OTP"
3. Configure email templates if needed
4. Set OTP expiration (recommended: 10 minutes)

## 🌐 Alternative Deployment Options

### Option 2: Netlify
- Similar to Vercel
- Good Next.js support
- Free tier available
- Deploy: [netlify.com](https://netlify.com)

### Option 3: Railway
- Great for full-stack apps
- Includes database hosting
- Free tier with $5 credit/month
- Deploy: [railway.app](https://railway.app)

### Option 4: Render
- Free tier available
- Good for static sites
- Auto-deploy from GitHub
- Deploy: [render.com](https://render.com)

## 📊 Post-Deployment Checklist

After deployment, verify:

- [ ] Homepage loads correctly
- [ ] Signup works (creates user in Supabase)
- [ ] Login sends OTP email
- [ ] OTP verification works
- [ ] Dashboard displays user data
- [ ] Deposit functionality works
- [ ] Borrow functionality works
- [ ] Repay functionality works
- [ ] Private pools accessible
- [ ] Crypto dashboard shows prices
- [ ] Chatbot responds
- [ ] Fraud detection active
- [ ] Theme toggle works
- [ ] Language switcher works

## 🐛 Troubleshooting

### Build Fails
- Check Node.js version (should be 18+)
- Verify all dependencies in package.json
- Check build logs for specific errors

### Authentication Issues
- Verify Supabase URL and keys
- Check redirect URLs in Supabase
- Ensure email provider is enabled

### API Errors
- Verify GROQ API key is valid
- Check Supabase RLS policies
- Review browser console for errors

### OTP Not Sending
- Check Supabase email settings
- Verify SMTP configuration
- Check spam folder
- Review Supabase logs

## 🔒 Security Recommendations

1. **Environment Variables**: Never commit `.env.local` to Git
2. **Supabase RLS**: Ensure Row Level Security policies are enabled
3. **API Keys**: Rotate keys periodically
4. **HTTPS**: Always use HTTPS in production (Vercel does this automatically)
5. **CORS**: Configure allowed origins in Supabase

## 📈 Monitoring

### Vercel Analytics
- Enable Vercel Analytics for free
- Track page views, performance, and errors

### Supabase Monitoring
- Monitor database usage
- Check API request counts
- Review authentication logs

## 💰 Cost Estimate

### Free Tier Limits:
- **Vercel**: 100GB bandwidth, unlimited deployments
- **Supabase**: 500MB database, 2GB bandwidth, 50,000 monthly active users
- **GROQ**: Check current limits

### When to Upgrade:
- High traffic (>100k visitors/month)
- Large database (>500MB)
- Need custom domains
- Require priority support

## 🚀 Quick Deploy Button

You can also create a one-click deploy button by adding this to your README:

```markdown
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ZaidAhmad72/decentralized-lending&project-name=defi-lending&repository-name=defi-lending&root-directory=frontend&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,GROQ_API_KEY)
```

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Review Supabase logs
3. Check browser console
4. Review this guide
5. Contact support if needed

---

**Ready to deploy?** Follow the steps above and your DeFi lending platform will be live in minutes! 🎉

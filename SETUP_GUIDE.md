# 📱 Android Discord X-Comment Bot Setup Guide

This guide enables you to build, test, and deploy your Python Discord bot directly from your **Android device** using F-droid Termux, GitHub, and continuous cloud workers like Render or Railway.

---

## 🛠️ Phase 1: Local Phone Workspace Setup

1. **Install Termux**:
   - Download the F-Droid client and install **Termux** (avoid the Google Play Store version as it is outdated and unsupported).
   - Link: [F-Droid Termux](https://f-droid.org/en/packages/com.termux/)

2. **System Setup in Termux**:
   Open Termux and run:
   ```bash
   pkg update && pkg upgrade -y
   pkg install git python sqlite -y
   ```

3. **Get the Code & Run locally**:
   ```bash
   git clone <YOUR_GITHUB_REPOSITORY_URL>
   cd <REPOSITORY_NAME>
   python -m venv venv
   source venv/activate
   pip install -r requirements.txt
   ```

---

## 🪐 Phase 2: Create App Tokens

### A. Discord Developer Credentials
1. Visit [Discord Developer Portal](https://discord.com/developers/applications) on your phone.
2. Click **New Application** and give your bot a name.
3. In the **Bot** tab:
   - Click **Reset Token** and copy the resulting string (this is your `DISCORD_TOKEN`).
   - Scroll down to **Privileged Gateway Intents** and check the **Message Content Intent** box. Save changes!
4. In **OAuth2 > URL Generator**:
   - Check `bot` and `applications.commands`.
   - Bot Permissions needed: `Send Messages`, `Embed Links`, `Read Message History`.
   - Copy the generated URL at the bottom and invite the bot to your channel.

### B. Twitter / X Developer API Credentials
1. Go to [X Developer Dashboard](https://developer.twitter.com/en/portal/dashboard).
2. Under your Project, open your Application Settings:
   - Enable **OAuth 1.0a** and choose App Permissions: **Read and Write and Direct Message**.
   - Fill in placeholder Redirect URI and Website details (e.g. `https://github.com/`).
   - Save.
3. In **Keys and Access Tokens** tab:
   - Generate **Consumer Keys** (Consumer API Key and Secret).
   - Generate **Access Token and Secret** with "Read and Write" capabilities.
   - Save these somewhere safe.

---

## 🚀 Phase 3: Push to GitHub on Android

1. Configure your Termux shell credentials:
   ```bash
   git config --global user.name "Your Username"
   git config --global user.email "your.email@example.com"
   ```
2. Create standard commits:
   ```bash
   git init
   git add .
   git commit -m "feat: complete discord twitter bot"
   git branch -M main
   git remote add origin https://github.com/USERNAME/REPO.git
   git push -u origin main
   ```
   *Note: When Git queries for your GitHub password, use your **Personal Access Token (PAT)** generated under GitHub Developer Settings instead.*

---

## 🪐 Phase 4: Free Cloud Deployments

### Option A: Railway (Continuous bot deployment)
1. Sign up on [Railway.app](https://railway.app) via your GitHub.
2. Click **New Project** > **Deploy from GitHub**.
3. Link your repo. In **Variables**, add the keys from `.env.example`.
4. Railway detects your multi-stage `Dockerfile` automatically and launches instantly!

### Option B: Render Background Workers
1. Go to [Render](https://render.com) and link your GitHub.
2. Choose **New > Background Worker**.
3. Select your bot's repository.
4. Set Environment mode to **Docker** (it will build off your production `Dockerfile` automatically).
5. Load your environment variables and launch!

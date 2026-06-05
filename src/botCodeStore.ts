export const botPyCode = `import os
import re
import sqlite3
import difflib
import json
import logging
from datetime import datetime
from dotenv import load_dotenv

import discord
from discord import app_commands
from discord.ext import commands
import google.generativeai as genai
import tweepy

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[
        logging.FileHandler("bot.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("DiscordXBot")

# Database Initialization
DB_FILE = "bot_history.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_url TEXT NOT NULL,
            original_author TEXT,
            summary TEXT,
            category TEXT,
            comment_text TEXT NOT NULL UNIQUE,
            confidence_score REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()
    logger.info("Database initialized successfully.")

init_db()

# Configure APIs
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Twitter Credentials (OAuth 1.0a or OAuth 2.0 User Context required for posting replies)
TWITTER_CONSUMER_KEY = os.getenv("TWITTER_CONSUMER_KEY")
TWITTER_CONSUMER_SECRET = os.getenv("TWITTER_CONSUMER_SECRET")
TWITTER_ACCESS_TOKEN = os.getenv("TWITTER_ACCESS_TOKEN")
TWITTER_ACCESS_TOKEN_SECRET = os.getenv("TWITTER_ACCESS_TOKEN_SECRET")

# Configure Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    logger.warning("GEMINI_API_KEY is not defined in environment!")

# Initialize Discord Bot
intents = discord.Intents.default()
bot = commands.Bot(command_prefix="!", intents=intents)

# Check Comment Similarity
def check_similarity(new_comment: str, threshold: float = 0.5) -> tuple[bool, float]:
    """Check if the comment is highly similar to any comment in the SQLite history."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT comment_text FROM comments")
    past_comments = [row[0] for row in cursor.fetchall()]
    conn.close()

    max_ratio = 0.0
    for past in past_comments:
        ratio = difflib.SequenceMatcher(None, new_comment.lower(), past.lower()).ratio()
        if ratio > max_ratio:
            max_ratio = ratio
        if ratio >= threshold:
            return True, ratio
    return False, max_ratio

def extract_tweet_id(url: str) -> str | None:
    """Extract tweet ID from X / Twitter URL."""
    match = re.search(r"status/(\\d+)", url)
    return match.group(1) if match else None

def extract_username(url: str) -> str:
    """Extract username from X / Twitter URL."""
    match = re.search(r"(?:twitter|x)\\.com/([^/]+)", url)
    return match.group(1) if match else "Unknown"

async def generate_response_for_x_post(post_url: str, custom_context: str = None) -> dict:
    """
    Uses Gemini API to analyze context, summarize, categorize and generate replies.
    """
    if not GEMINI_API_KEY:
        raise ValueError("Gemini API Key is missing. Please configure it in .env")

    post_author = extract_username(post_url)
    
    prompt = f"""
    You are an smart, tech-savvy, and helpful community manager and builder.
    Analyze the following social post from Twitter/X:
    URL: {post_url}
    Post Author: @{post_author}
    Additional Scraped Context (if any): {custom_context or 'No explicit text provided; analyze based on standard topics related to the profile if possible.'}

    Your tasks:
    1. Summarize the main message or information of the post in 1 brief sentence.
    2. Classify the main topic category strictly into one of the following:
       - announcements
       - partnerships
       - testnets
       - funding
       - community updates
       - technology
       - governance
       - education
       - general
    3. Determine the author's intent (e.g. informative, marketing, sharing a milestone, tutorial, call-to-action).
    4. Generate a natural, constructive, and highly relevant reply comment following these Comment Quality Rules:
       - Never generate generic hype spam (DO NOT use "Great project!", "LFG", "Amazing!", "Bullish", "Nice work team").
       - Every comment must reference something specific mentioned in the post.
       - Look like it was written by a real, intelligent community member.
       - Keep it short: exactly 1 to 2 sentences max.
       - Make it constructive (ask a highly relevant smart question, highlight a specific tech achievement, or share a logical insight).
    5. Evaluate your confidence score (0.0 to 1.0) on how relevant and accurate this comment is.

    Return the results in a strict JSON format matching this schema:
    {{
      "summary": "Your brief summary here",
      "category": "category_name",
      "author_intent": "intent_here",
      "generated_comment": "Your elegant, human-like comment here",
      "confidence_score": 0.95
    }}
    """
    
    model = genai.GenerativeModel(
        "gemini-1.5-flash",
        generation_config={"response_mime_type": "application/json"}
    )
    
    response = model.generate_content(prompt)
    try:
        data = json.loads(response.text)
        return data
    except Exception as e:
        logger.error(f"Failed to parse JSON response from Gemini: {response.text}")
        raise e

def post_tweet_reply(tweet_id: str, text: str) -> bool:
    """Post comment as a reply to Twitter/X user's post."""
    if not all([TWITTER_CONSUMER_KEY, TWITTER_CONSUMER_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET]):
        logger.warning("Twitter API keys are not fully configured. Tweepy posting skipped.")
        return False

    try:
        client = tweepy.Client(
            consumer_key=TWITTER_CONSUMER_KEY,
            consumer_secret=TWITTER_CONSUMER_SECRET,
            access_token=TWITTER_ACCESS_TOKEN,
            access_token_secret=TWITTER_ACCESS_TOKEN_SECRET
        )
        client.create_tweet(text=text, in_reply_to_tweet_id=tweet_id)
        logger.info(f"Successfully posted X reply to tweet ID: {tweet_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to post to X: {e}")
        raise e

# Bot Commands
@bot.event
async def on_ready():
    logger.info(f"Logged in as {bot.user.name} ({bot.user.id})")
    try:
        synced = await bot.tree.sync()
        logger.info(f"Synced {len(synced)} slash commands globally.")
    except Exception as e:
        logger.error(f"Failed to sync commands: {e}")

@bot.tree.command(name="comment", description="Generate and automatically publish a reply to an X post.")
@app_commands.describe(x_post_url="The full URL of the Twitter/X post to reply to")
async def comment_command(interaction: discord.Interaction, x_post_url: str):
    await interaction.response.defer(ephemeral=False)
    
    tweet_id = extract_tweet_id(x_post_url)
    if not tweet_id:
        await interaction.followup.send("❌ Error: Invalid X/Twitter URL structure. Ensure it includes '/status/<number>'.")
        return

    try:
        ai_result = await generate_response_for_x_post(x_post_url)
        generated_text = ai_result.get("generated_comment")
        summary = ai_result.get("summary")
        category = ai_result.get("category", "general")
        confidence = ai_result.get("confidence_score", 0.0)
        
        # Check similarity anti-spam safeguard
        is_spam, ratio = check_similarity(generated_text, threshold=0.5)
        if is_spam:
            logger.warning(f"Prevented duplicate comment generation. Similarity score {ratio:.2f} too high.")
            await interaction.followup.send(
                f"⚠️ **Anti-Spam Safeguard Triggered!**\\n"
                f"The bot generated a comment that is too similar ({ratio*100:.1f}%) to an existing comment in the history.\\n"
                f"Generated (blocked): *\\"{generated_text}\\"*"
            )
            return

        x_author = extract_username(x_post_url)
        posted_status = "⚠️ Simulating (Twitter Credentials Missing)"
        publish_success = False

        try:
            publish_success = post_tweet_reply(tweet_id, generated_text)
            if publish_success:
                posted_status = "✅ Successfully Published to Twitter!"
        except Exception as api_err:
            posted_status = f"❌ Failed to publish to Twitter: {str(api_err)}"

        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO comments (post_url, original_author, summary, category, comment_text, confidence_score) VALUES (?, ?, ?, ?, ?, ?)",
            (x_post_url, x_author, summary, category, generated_text, confidence)
        )
        conn.commit()
        conn.close()

        embed = discord.Embed(
            title="🎯 X Comment Butler - Reply Generated",
            url=x_post_url,
            color=discord.Color.green() if publish_success else discord.Color.blue(),
            timestamp=datetime.now()
        )
        embed.add_field(name="👤 Original Author", value=f"@{x_author}", inline=True)
        embed.add_field(name="🏷️ Category", value=f"\`{category}\`", inline=True)
        embed.add_field(name="🧠 Post Summary", value=summary, inline=False)
        embed.add_field(name="💬 Generated Comment", value=f"**\\"{generated_text}\\"**", inline=False)
        embed.add_field(name="📈 Confidence Score", value=f"{confidence*100:.1f}%", inline=True)
        embed.add_field(name="📡 Posting Status", value=posted_status, inline=True)
        embed.set_footer(text="Anti-Spam checked & Logged securely")

        await interaction.followup.send(embed=embed)
        
    except Exception as e:
        logger.error(f"Error in 'comment' command: {e}")
        await interaction.followup.send(f"❌ Core Error generating comment: {str(e)}")

@bot.tree.command(name="preview", description="Previews an AI-generated comment for an X post without publishing it.")
@app_commands.describe(x_post_url="The full URL of the Twitter/X post to preview")
async def preview_command(interaction: discord.Interaction, x_post_url: str):
    await interaction.response.defer(ephemeral=False)
    
    tweet_id = extract_tweet_id(x_post_url)
    if not tweet_id:
        await interaction.followup.send("❌ Error: Invalid X/Twitter URL structure.")
        return

    try:
        ai_result = await generate_response_for_x_post(x_post_url)
        generated_text = ai_result.get("generated_comment")
        summary = ai_result.get("summary")
        category = ai_result.get("category", "general")
        confidence = ai_result.get("confidence_score", 0.0)

        is_spam, ratio = check_similarity(generated_text, threshold=0.5)
        spam_warn = ""
        if is_spam:
            spam_warn = f"⚠️ **Warn:** This comment is {ratio*100:.1f}% similar to a previously logged comment!\\n"

        x_author = extract_username(x_post_url)

        embed = discord.Embed(
            title="🔍 X Comment Preview (No Posting)",
            url=x_post_url,
            color=discord.Color.gold(),
            timestamp=datetime.now()
        )
        embed.add_field(name="👤 Original Author", value=f"@{x_author}", inline=True)
        embed.add_field(name="🏷️ Category", value=f"\`{category}\`", inline=True)
        embed.add_field(name="🧠 Post Summary", value=summary, inline=False)
        embed.add_field(name="💬 Preview Reply", value=f"**\\"{generated_text}\\"**", inline=False)
        embed.add_field(name="📈 Confidence Score", value=f"{confidence*100:.1f}%", inline=True)
        embed.add_field(name="⚠️ Anti-Spam", value="Safe / Unique" if not is_spam else f"Similarity Alert {ratio*100:.1f}%", inline=True)
        
        if spam_warn:
            embed.description = spam_warn

        await interaction.followup.send(embed=embed)

    except Exception as e:
        await interaction.followup.send(f"❌ Error during preview: {str(e)}")

@bot.tree.command(name="history", description="Displays recent comments published by this bot.")
async def history_command(interaction: discord.Interaction):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT id, original_author, category, comment_text, created_at FROM comments ORDER BY id DESC LIMIT 5")
    rows = cursor.fetchall()
    conn.close()

    if not rows:
        await interaction.response.send_message("📭 No comment logs found in database. Start commenting to fill logs!")
        return

    embed = discord.Embed(
        title="📚 Posted Comment Log History",
        description="Here are the last 5 comments generated and published by the butler:",
        color=discord.Color.purple()
    )

    for row in rows:
        comment_id, author, category, text, date_str = row
        dt = date_str.split(".")[0] if "." in date_str else date_str
        embed.add_field(
            name=f"ID #{comment_id} | @{author} ({category}) — {dt}",
            value=f"*\\"{text}\\"*",
            inline=False
        )

    await interaction.response.send_message(embed=embed)

@bot.tree.command(name="stats", description="Displays metrics about total comments generated by this bot.")
async def stats_command(interaction: discord.Interaction):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM comments")
    total_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT AVG(confidence_score) FROM comments")
    avg_score = cursor.fetchone()[0] or 0.0
    
    cursor.execute("SELECT category, COUNT(*) FROM comments GROUP BY category ORDER BY COUNT(*) DESC")
    category_counts = cursor.fetchall()
    
    conn.close()

    embed = discord.Embed(
        title="📊 X-Commenter Bot Statistics Dashboard",
        color=discord.Color.dark_green(),
        timestamp=datetime.now()
    )
    embed.add_field(name="🤖 Total Comments Posted", value=f"**{total_count}** replies logs", inline=True)
    embed.add_field(name="🎚️ Average Smart Confidence", value=f"**{avg_score*100:.1f}%** score", inline=True)
    
    cat_breakdown = ""
    for cat, count in category_counts:
        cat_breakdown += f"• \`{cat}\`: {count} comments\\n"
    
    embed.add_field(name="🧩 Category Distribution Breakdown", value=cat_breakdown or "No comments logged yet.", inline=False)
    
    await interaction.response.send_message(embed=embed)

if __name__ == "__main__":
    bot.run(DISCORD_TOKEN)
`;

export const requirementsTxt = `discord.py>=2.3.2
tweepy>=4.14.0
google-generativeai>=0.3.2
python-dotenv>=1.0.0
`;

export const dockerfileCode = `# Multi-stage lightweight python builder
FROM python:3.10-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \\
    build-essential \\
    libsqlite3-dev \\
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Final production runner stage
FROM python:3.10-slim AS runner

WORKDIR /app

# Copy python user package dependencies
COPY --from=builder /root/.local /root/.local
COPY . .

ENV PATH=/root/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1

# Run Python Discord Bot
CMD ["python", "bot.py"]
`;

export const dockerComposeCode = `version: '3.8'

services:
  discord-x-comment-bot:
    build: .
    container_name: discord_x_bot
    restart: unless-stopped
    volumes:
      - ./bot_history.db:/app/bot_history.db
      - ./bot.log:/app/bot.log
    environment:
      - DISCORD_TOKEN=\${DISCORD_TOKEN}
      - GEMINI_API_KEY=\${GEMINI_API_KEY}
      - TWITTER_CONSUMER_KEY=\${TWITTER_CONSUMER_KEY}
      - TWITTER_CONSUMER_SECRET=\${TWITTER_CONSUMER_SECRET}
      - TWITTER_ACCESS_TOKEN=\${TWITTER_ACCESS_TOKEN}
      - TWITTER_ACCESS_TOKEN_SECRET=\${TWITTER_ACCESS_TOKEN_SECRET}
`;

export const envExampleCode = `# ====================================================================
# Discord Bot CONFIGURATION
# ====================================================================

# 1. Discord Bot Access Token
DISCORD_TOKEN="YOUR_DISCORD_BOT_TOKEN_HERE"

# 2. Google Gemini API AI Key 
GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"

# 3. Twitter / X Developer OAuth 1.0a User Credentials (V2 Write Capability)
TWITTER_CONSUMER_KEY="YOUR_X_CONSUMER_API_KEY"
TWITTER_CONSUMER_SECRET="YOUR_X_CONSUMER_API_SECRET"
TWITTER_ACCESS_TOKEN="YOUR_X_ACCESS_TOKEN"
TWITTER_ACCESS_TOKEN_SECRET="YOUR_X_ACCESS_TOKEN_SECRET"
`;

export const phoneSetupGuideMarkdown = `### 📱 Android Phone deployment & Setup masterclass

This guide provides an end-to-end, zero-PC workflow directly from your **Android device**.

---

#### 🛠️ Phase 1: Local Phone Workspace Setup (using Termux)
1. **Install Termux** from F-Droid.
2. **Launch Termux and run system updates**:
   \`\`\`bash
   pkg update && pkg upgrade -y
   \`\`\`
3. **Install Git, Python 3, and SQLite build systems**:
   \`\`\`bash
   pkg install git python sqlite -y
   \`\`\`
4. **Clone your repository locally**:
   \`\`\`bash
   git clone https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_BOT_REPOSITORY>.git
   cd <YOUR_BOT_REPOSITORY>
   \`\`\`
5. **Create & activate a Python Virtual Environment**:
   \`\`\`bash
   python -m venv venv
   source venv/bin/activate
   \`\`\`
6. **Install Python dependencies**:
   \`\`\`bash
   pip install --upgrade pip
   pip install -r requirements.txt
   \`\`\`
`;

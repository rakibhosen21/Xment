import express, { Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

// Load environmental variables
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// In-Memory simulated SQLite cache for the playground run
const historyDb: any[] = [
  {
    id: "1",
    xPostUrl: "https://x.com/VitalikButerin/status/1785210984120392341",
    xAuthor: "VitalikButerin",
    originalText: "EIP-4844 blobs have been live for a while. We are starting to see layer 2 gas fees drop significantly, enabling a much smoother user experience. What is the next bottleneck we should focus on?",
    summary: "Vitalik highlights the success of EIP-4844 blobs in reducing Layer 2 gas fees and prompts the community to identify the next critical bottleneck.",
    generatedComment: "Solving L2 user friction is a massive milestone. Addressing state growth and peer-to-peer data availability bottlenecks seems like the logical next step for long-term scalability.",
    confidenceScore: 0.94,
    category: "technology",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: "posted",
    style: "Technical"
  },
  {
    id: "2",
    xPostUrl: "https://x.com/Stripe/status/1792198031201931812",
    xAuthor: "Stripe",
    originalText: "Happy to announce our partnership with Avalanche to make crypto onboarding smoother. Users can now buy AVAX directly natively inside Stripe-powered applications.",
    summary: "Stripe announces an onboarding partnership with Avalanche integration to buy AVAX natively inside Stripe apps.",
    generatedComment: "This is major for real-world user adoption. Embedded checkout flows remove a huge barrier for non-technical users entering the Avalanche ecosystem.",
    confidenceScore: 0.96,
    category: "partnerships",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    status: "posted",
    style: "Engaging"
  }
];

// Helper to check comment similarity (using simple character Jaccard index or string overlap)
function calculateSimilarity(s1: string, s2: string): number {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const w1 = new Set(clean(s1).split(''));
  const w2 = new Set(clean(s2).split(''));
  const intersection = new Set([...w1].filter(x => w2.has(x)));
  const union = new Set([...w1, ...w2]);
  return intersection.size / union.size;
}

// Simulated X Scraper - fetches placeholder texts with typical high-profile tweets if the url is famous, or generates context
function mockXFetcher(url: string): { author: string, tweetId: string, text: string } {
  const tweetIdMatch = url.match(/status\/(\d+)/);
  const tweetId = tweetIdMatch ? tweetIdMatch[1] : Math.floor(Math.random() * 10000000).toString();
  
  let author = 'Unknown';
  const authorMatch = url.match(/(?:twitter|x)\.com\/([^/]+)/);
  if (authorMatch) {
    author = authorMatch[1];
  }

  // Generate generic premium mock tweet text based on the URL context if recognizable
  let text = "Exciting times ahead for the modular blockchain paradigm! We are launching our public testnet next week to stress-test high throughput and global consensus builders. Check out our docs and sign up today!";
  if (url.toLowerCase().includes('vitalik') || url.toLowerCase().includes('ethereum')) {
    text = "Decentralization is more than just secure blockspace. It requires user-friendly light clients, censorship-resistant relayers, and robust decentralized governance architectures. Happy to see progress being made here.";
  } else if (url.toLowerCase().includes('solana') || url.toLowerCase().includes('monad')) {
    text = "Parallel execution is proving to be a game changer for high-performance virtual machines. By optimization state access lists, we achieve incredible sub-second state finality.";
  } else if (url.toLowerCase().includes('partner') || url.toLowerCase().includes('collab')) {
    text = "We are teaming up with the industry leaders to bring next-generation distributed data availability layers to our developers. Launching joint testnet campaigns soon!";
  } else if (url.toLowerCase().includes('funding') || url.toLowerCase().includes('raised')) {
    text = "Incredibly proud to announce our $25M Series B funding round led by top tier builders. This capital allows us to double down on research, hire stellar builders, and ship our mainnet.";
  }

  return { author, tweetId, text };
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// System Status / Logs
app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    sqliteFile: 'bot_history.db',
    geminiInitialized: !!process.env.GEMINI_API_KEY,
    totalRecords: historyDb.length
  });
});

// Logs History
app.get('/api/history', (req: Request, res: Response) => {
  res.json(historyDb);
});

// Clear Sim DB
app.post('/api/history/clear', (req: Request, res: Response) => {
  historyDb.length = 0;
  res.json({ message: "Simulated history DB cleared" });
});

// Bot Simulation Logic (runs Gemini backend if key provided, else uses sophisticated fallback generator system)
app.post('/api/simulate', async (req: Request, res: Response) => {
  const { url, mode, tone, customText } = req.body;

  if (!url) {
    return res.status(400).json({ error: "Missing Target X Post URL" });
  }

  const { author, tweetId, text: originalText } = mockXFetcher(url);
  const postContent = customText || originalText;

  let summary = "";
  let generatedComment = "";
  let confidenceScore = 0.85;
  let category = "general";
  let similarityRatio = 0;
  let isSpamGuardTriggered = false;

  // Let's call Gemini if API Key is available
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
        You are an elite, human-like, tech-savvy community developer and developer advocate.
        Analyze this social network post:
        URL: ${url}
        Author: @${author}
        Post Content: "${postContent}"

        Target Response Tone: ${tone || 'Engaging'} (e.g. Technical, Witty, Witty/Smart, Analytical, Supportive)

        Deliver:
        1. Set the main category strictly among: announcements, partnerships, testnets, funding, community updates, technology, governance, education, general.
        2. A clear 1-sentence analytical summary of the post's core message.
        3. A 1-2 sentence maximum elegant human-like reply. Follow all anti-hype quality rules. DO NOT use words like "Great project", "LFG", "Amazing", "Bullish", "Nice work team". Instead, reference details like technology, mechanisms, or integration. Set your confidence score from 0.0 to 1.0.

        Output ONLY a strict JSON payload format with exact keys:
        {
          "summary": "...",
          "category": "...",
          "comment": "...",
          "confidence": 0.9
        }
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const responseText = response.text || '';
      const data = JSON.parse(responseText);
      summary = data.summary || `Analysis on @${author}'s post.`;
      category = data.category || 'general';
      generatedComment = data.comment || "Fascinating discussion. Looking forward to seeing the detailed technical specification.";
      confidenceScore = data.confidence || 0.88;
    } catch (err: any) {
      console.error("Gemini call error, dropping to robust simulation rules:", err);
      // Fallback fallback below
    }
  }

  // Smart Context Fallbacks when Gemini is not configured or fails
  if (!generatedComment) {
    summary = `Post from @${author} highlights core updates and milestones regarding distributed application ecosystems.`;
    
    // Choose category based on keywords
    if (postContent.toLowerCase().includes('testnet') || postContent.toLowerCase().includes('mainnet')) {
      category = 'testnets';
    } else if (postContent.toLowerCase().includes('partner') || postContent.toLowerCase().includes('team')) {
      category = 'partnerships';
    } else if (postContent.toLowerCase().includes('fund') || postContent.toLowerCase().includes('raised') || postContent.toLowerCase().includes('capital')) {
      category = 'funding';
    } else if (postContent.toLowerCase().includes('upgrade') || postContent.toLowerCase().includes('gwei') || postContent.toLowerCase().includes('throughput')) {
      category = 'technology';
    } else {
      category = 'general';
    }

    // Tone variations
    if (tone === 'Technical') {
      generatedComment = `Interesting scaling model. How are you addressing potential state bloom constraints during high throughput bursts?`;
    } else if (tone === 'Analytical') {
      generatedComment = `Reducing friction in onboarding is vital. This structural shift makes absolute sense compared to previous solutions in this space.`;
    } else if (tone === 'Witty') {
      generatedComment = `Finally a project building actual infrastructure instead of just adding more shiny buttons nobody uses. Keep shipping!`;
    } else if (tone === 'Supportive') {
      generatedComment = `Incredible progress, @${author}! Really proud of the speed and precision your team has shown to make this happen.`;
    } else {
      generatedComment = `This is a big step forward. The details around distributed consensus optimizations are exactly what real builders are hoping to see.`;
    }
    confidenceScore = 0.85;
  }

  // Anti-Spam Check: Compare against existing Simulator history logs
  historyDb.forEach(item => {
    const score = calculateSimilarity(generatedComment, item.generatedComment);
    if (score > similarityRatio) {
      similarityRatio = score;
    }
  });

  // If match is too high (>0.6 similarity), trigger simulated anti-spam block
  if (similarityRatio >= 0.55) {
    isSpamGuardTriggered = true;
  }

  // Set response payload
  const logResponse: any = {
    id: (historyDb.length + 1).toString(),
    xPostUrl: url,
    xAuthor: author,
    originalText: postContent,
    summary,
    generatedComment,
    confidenceScore,
    category,
    createdAt: new Date().toISOString(),
    status: isSpamGuardTriggered ? 'failed' : (mode === 'preview' ? 'preview_only' : 'posted'),
    style: tone || 'Engaging',
    similarityScore: similarityRatio
  };

  if (isSpamGuardTriggered) {
    logResponse.feedback = `⚠️ **SpamGuard Alert**: Comment is too similar (${Math.floor(similarityRatio * 100)}%) to an previously published response! Blocked to prevent account suspension.`;
  }

  // Only commit to history if successfully posted or previewed
  if (!isSpamGuardTriggered) {
    historyDb.unshift(logResponse); 
  }

  res.json({
    success: !isSpamGuardTriggered,
    result: logResponse
  });
});

// Serve frontend assets in production build / preview
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

// Fallback to SPA index.html
app.get('*', (req: Request, res: Response) => {
  const indexFile = path.join(distPath, 'index.html');
  res.sendFile(indexFile);
});

// Run server
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});

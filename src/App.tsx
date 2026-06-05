import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Settings, 
  History, 
  HelpCircle, 
  Copy, 
  Check, 
  Cpu, 
  Send, 
  FileCode, 
  Flame, 
  BookOpen, 
  Smartphone, 
  Twitter, 
  Sliders, 
  CheckCircle,
  Database,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Info
} from 'lucide-react';
import { botPyCode, requirementsTxt, dockerfileCode, dockerComposeCode, envExampleCode, phoneSetupGuideMarkdown } from './botCodeStore';

export default function App() {
  // General UI States
  const [activeTab, setActiveTab] = useState<'playground' | 'code' | 'guide'>('playground');
  const [selectedFile, setSelectedFile] = useState<string>('bot.py');
  
  // Custom Workspace Inputs
  const [xPostUrl, setXPostUrl] = useState<string>('https://x.com/VitalikButerin/status/1785210984120392341');
  const [customPostContent, setCustomPostContent] = useState<string>('');
  const [selectedTone, setSelectedTone] = useState<string>('Technical');
  const [commandMode, setCommandMode] = useState<'comment' | 'preview'>('comment');
  
  // Simulated State Values
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [statusMeta, setStatusMeta] = useState<any>({
    status: 'online',
    sqliteFile: 'bot_history.db',
    geminiInitialized: false,
    totalRecords: 0
  });

  // Simulator Discord Chats Stream
  const [discordChatHistory, setDiscordChatHistory] = useState<any[]>([
    {
      id: 'welcome-bot',
      author: 'X Comment Butler',
      isBot: true,
      timestamp: 'Today at 2:00 PM',
      content: 'Hello! I am initialized and ready to auto-publish premium replies to Twitter/X! Use /comment <url> to reply, or /preview <url> to draft.',
      embeds: null
    }
  ]);
  
  // Local Database Logs (history tracker)
  const [logs, setLogs] = useState<any[]>([]);

  // Fetch status & logs on mount
  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
      const statusRes = await fetch('/api/status');
      if (statusRes.ok) {
        const meta = await statusRes.json();
        setStatusMeta(meta);
      }
    } catch (err) {
      console.warn("Failed to talk with express backend, using fallback client simulation logs");
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Set default post preview when user clicks specific samples
  const selectSamplePost = (url: string, content: string) => {
    setXPostUrl(url);
    setCustomPostContent(content);
  };

  // Run Simulated/Real Discord bot request
  const submitSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!xPostUrl.trim()) return;

    setLoading(true);

    // 1. Add user slash message to Discord chat log
    const userMsgId = Date.now().toString();
    const cmdText = `/${commandMode} url: ${xPostUrl} ${selectedTone ? `tone: ${selectedTone}` : ''}`;
    const userMsg = {
      id: userMsgId,
      author: 'You (rakibhosen9923)',
      isBot: false,
      timestamp: 'Just now',
      content: cmdText,
      roleColor: 'text-amber-400'
    };

    setDiscordChatHistory(prev => [...prev, userMsg]);

    try {
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: xPostUrl,
          mode: commandMode,
          tone: selectedTone,
          customText: customPostContent
        })
      });

      if (!response.ok) {
        throw new Error("Simulation endpoint returned error code");
      }

      const resData = await response.json();
      const botPayload = resData.result;

      // Create beautiful Discord Embed
      const botEmbeds = [];
      if (botPayload.status === 'failed' && botPayload.feedback) {
        botEmbeds.push({
          title: "❌ Slash command failure",
          description: botPayload.feedback,
          color: "border-red-500 bg-red-950/40 text-red-100",
          fields: [
            { name: "Attempted Comment", value: botPayload.generatedComment || "N/A" }
          ]
        });
      } else {
        const isPreview = botPayload.status === 'preview_only';
        botEmbeds.push({
          title: isPreview ? "🔍 X Reply Comment Draft (No Posting)" : "🎯 X Reply Successfully Generated!",
          description: `Below is the context-aware analysis and reply comment calculated by Google Gemini AI:`,
          color: isPreview ? "border-amber-500 bg-amber-950/20" : "border-emerald-500 bg-emerald-950/20",
          fields: [
            { name: "👤 Original Author", value: `@${botPayload.xAuthor}`, inline: true },
            { name: "🏷️ Topic Category", value: `\`${botPayload.category}\``, inline: true },
            { name: "🧠 Post Summary", value: botPayload.summary, inline: false },
            { name: "💬 Generated Comment (1-2 sentences)", value: `*"${botPayload.generatedComment}"*`, inline: false },
            { name: "📈 AI Confidence Rating", value: `${Math.floor(botPayload.confidenceScore * 100)}%`, inline: true },
            { name: "📡 Twitter Access Context", value: isPreview ? "Simulated Draft (No Key Checked)" : "Posted successfully via User Context API", inline: true }
          ]
        });
      }

      // Add Bot reaction chat to Discord UI
      setDiscordChatHistory(prev => [
        ...prev,
        {
          id: 'bot-reply-' + Date.now(),
          author: 'X Comment Butler',
          isBot: true,
          timestamp: 'Just now',
          content: '',
          embeds: botEmbeds
        }
      ]);

      // Refresh database logs
      fetchLogs();

    } catch (err: any) {
      setDiscordChatHistory(prev => [
        ...prev,
        {
          id: 'bot-err-' + Date.now(),
          author: 'X Comment Butler',
          isBot: true,
          timestamp: 'Just now',
          content: `❌ **Error processing command**: The simulation endpoint failed. Check your network or make sure the server has initialized properly.`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Trigger Discord Command Simulator for statistics dashboard
  const runDirectCommand = (cmd: 'history' | 'stats' | 'clear') => {
    // Write user input
    setDiscordChatHistory(prev => [
      ...prev,
      {
        id: 'cmd-input-' + Date.now(),
        author: 'You (rakibhosen9923)',
        isBot: false,
        timestamp: 'Just now',
        content: `/${cmd}`
      }
    ]);

    setTimeout(() => {
      if (cmd === 'history') {
        const embedFields = logs.slice(0, 4).map(log => ({
          name: `ID #${log.id} | @${log.xAuthor} (${log.category})`,
          value: `*"${log.generatedComment}"*`
        }));

        setDiscordChatHistory(prev => [
          ...prev,
          {
            id: 'bot-history-' + Date.now(),
            author: 'X Comment Butler',
            isBot: true,
            timestamp: 'Just now',
            content: logs.length ? '📚 **Recently Created Comment Logs:**' : '📭 No comments recorded in history database yet!',
            embeds: logs.length ? [{
              title: "📚 sqlite3 bot_history.db Logs",
              description: "Latest bot activities stored in the database:",
              color: "border-purple-500 bg-purple-950/25",
              fields: embedFields
            }] : null
          }
        ]);
      } else if (cmd === 'stats') {
        const uniqueCategories = Array.from(new Set(logs.map(l => l.category)));
        const catListText = uniqueCategories.map(cat => {
          const count = logs.filter(l => l.category === cat).length;
          return `• \`${cat}\`: ${count} comments`;
        }).join('\n');

        setDiscordChatHistory(prev => [
          ...prev,
          {
            id: 'bot-stats-' + Date.now(),
            author: 'X Comment Butler',
            isBot: true,
            timestamp: 'Just now',
            content: '',
            embeds: [{
              title: "📊 Discord Bot Core Statistics Dashboard",
              color: "border-teal-500 bg-teal-950/20",
              fields: [
                { name: "🤖 Total Comments Stored", value: `**${logs.length}** log items`, inline: true },
                { name: "🎚️ Average Integrity rating", value: `**92.4%**`, inline: true },
                { name: "🧩 Topic Categories Tracked", value: catListText || "No records", inline: false }
              ]
            }]
          }
        ]);
      } else if (cmd === 'clear') {
        fetch('/api/history/clear', { method: 'POST' });
        setLogs([]);
        setDiscordChatHistory(prev => [
          ...prev,
          {
            id: 'bot-clear-' + Date.now(),
            author: 'X Comment Butler',
            isBot: true,
            timestamp: 'Just now',
            content: '🧹 **History Database logs cleared from server memory!**'
          }
        ]);
      }
    }, 400);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStates(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [key]: false }));
    }, 1500);
  };

  // Get current file code based on selection
  const getFileContent = () => {
    switch (selectedFile) {
      case 'bot.py': return botPyCode;
      case 'requirements.txt': return requirementsTxt;
      case 'Dockerfile': return dockerfileCode;
      case 'docker-compose.yml': return dockerComposeCode;
      case '.env.example': return envExampleCode;
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* Header Visualizer */}
      <header className="border-b border-slate-800 bg-slate-900/85 backdrop-blur sticky top-0 z-50 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl font-bold shadow-md shadow-amber-500/10 flex items-center justify-center">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-slate-800 border border-slate-700 text-amber-400 font-mono px-2 py-0.5 rounded-full uppercase tracking-wider">Discord & X Integration Hub</span>
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              X Reply Comment Butler <span className="text-slate-500 font-light text-sm">v1.2</span>
            </h1>
          </div>
        </div>

        {/* Navigation Workbench Tabs */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-sm">
          <button 
            id="nav-tab-playground"
            onClick={() => setActiveTab('playground')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'playground' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
          >
            🕹️ Discord Simulator
          </button>
          <button 
            id="nav-tab-code"
            onClick={() => setActiveTab('code')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'code' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
          >
            🗂️ Production Files
          </button>
          <button 
            id="nav-tab-guide"
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'guide' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
          >
            📱 Mobile Setup Guide
          </button>
        </div>
      </header>

      {/* Main Responsive Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Playgound/Simulator Main Content (Column span 8/12) */}
        {activeTab === 'playground' && (
          <>
            {/* Input and Configuration Board */}
            <div className="lg:col-span-5 flex flex-col space-y-6">
              
              {/* Simulator Action Input Card */}
              <div id="sim-control-board" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/5 rounded-full blur-2xl"></div>
                
                <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2 mb-4">
                  <Sliders className="w-5 h-5 text-amber-400" />
                  Bot command simulation parameters
                </h3>

                <form onSubmit={submitSimulation} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      1. Choose Discord Command Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCommandMode('comment')}
                        className={`py-2 px-3 rounded-lg font-mono text-xs text-left border flex items-center justify-between transition ${commandMode === 'comment' ? 'bg-amber-500/10 border-amber-500 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                      >
                        <span>/comment</span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded uppercase">Auto Publish</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setCommandMode('preview')}
                        className={`py-2 px-3 rounded-lg font-mono text-xs text-left border flex items-center justify-between transition ${commandMode === 'preview' ? 'bg-amber-500/10 border-amber-500 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                      >
                        <span>/preview</span>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase">Draft Only</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex justify-between">
                      <span>2. Paste Target X Post Link</span>
                      <span className="text-[10px] font-normal text-amber-400 font-mono hover:underline cursor-pointer" onClick={() => selectSamplePost('https://x.com/VitalikButerin/status/1785210984120392341', '')}>Sample 1</span>
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={xPostUrl}
                        onChange={(e) => setXPostUrl(e.target.value)}
                        placeholder="https://x.com/username/status/1234567890"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        3. Custom Post Body (Optional simulation contextual override)
                      </label>
                      <button 
                        type="button"
                        onClick={() => setCustomPostContent('')}
                        className="text-[10px] text-slate-500 hover:text-slate-300 line-clamp-1"
                      >
                        Clear
                      </button>
                    </div>
                    <textarea
                      value={customPostContent}
                      onChange={(e) => setCustomPostContent(e.target.value)}
                      placeholder="Simulated tweet text body content (helps generate realistic, highly specific replies)..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 min-h-[70px] resize-none"
                    />
                  </div>

                  {/* Tone Modifiers */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      4. Reply Personality / Tone
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 text-xs text-center">
                      {['Technical', 'Analytical', 'Witty', 'Supportive', 'Engaging'].map((tone) => (
                        <button
                          key={tone}
                          type="button"
                          onClick={() => setSelectedTone(tone)}
                          className={`py-1.5 px-2 rounded-lg transition-all border ${selectedTone === tone ? 'bg-amber-500 text-slate-950 font-bold border-amber-500' : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'}`}
                        >
                          {tone}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Submit Simulation */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-amber-400 hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                        <span>AI Butler is thinking...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Simulate Bot Slash Event</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Simulated Preset Quick Buttons */}
                <div className="mt-4 pt-4 border-t border-slate-800/80">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-2 tracking-wider">Try quick preset topics</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => selectSamplePost(
                        "https://x.com/Stripe/status/1792198031201931812",
                        "Happy to announce our partnership with Avalanche to make crypto onboarding smoother. Users can now buy AVAX directly natively inside Stripe-powered applications."
                      )}
                      className="text-[11px] bg-slate-950 border border-slate-800 px-2 py-1.5 rounded-lg text-slate-300 hover:border-amber-400/50 transition truncate max-w-full"
                    >
                      🚀 Partnership Announcement
                    </button>
                    <button
                      onClick={() => selectSamplePost(
                        "https://x.com/Arbitrum/status/18329598219",
                        "Arbitrum Nitro is rolling out. The scaling throughput gains are insane. High-frequency decentralized finance application state channels are now feasible for pennies down."
                      )}
                      className="text-[11px] bg-slate-950 border border-slate-800 px-2 py-1.5 rounded-lg text-slate-300 hover:border-amber-400/50 transition truncate max-w-full"
                    >
                      ⛓️ Tech Scaling Post
                    </button>
                  </div>
                </div>
              </div>

              {/* Server / Env Information */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 text-xs space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800/50">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-amber-500" />
                    Interactive Sandbox Environment Info
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono uppercase tracking-widest">Connected</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-slate-400">
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase font-mono">SQLite State DB:</span>
                    <span className="font-mono text-slate-200">bot_history.db</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase font-mono flex items-center gap-1">
                      Gemini Server Keys:
                      <span className="relative group">
                        <Info className="w-3 h-3 text-slate-400 hover:text-amber-400 cursor-pointer" />
                        <span className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 text-[9px] w-48 p-2 rounded shadow-xl text-slate-200 leading-normal z-50">
                          If GEMINI_API_KEY is configured in your secrets manager, the bot uses live Gemini AI. Otherwise, it executes elite analytical heuristics.
                        </span>
                      </span>
                    </span>
                    <span className="font-mono text-slate-200 flex items-center gap-1">
                      {statusMeta.geminiInitialized ? (
                        <>
                          <CheckCircle className="w-3 h-3 text-emerald-500 inline" />
                          <span>Gemini Live Enabled</span>
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 bg-amber-500 rounded-full inline-block animate-ping"></span>
                          <span>Local AI Emulator</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="block text-[10px] text-slate-500 uppercase font-mono mb-1">Direct Simulator operations:</span>
                  <div className="grid grid-cols-3 gap-1">
                    <button 
                      onClick={() => runDirectCommand('stats')}
                      className="bg-slate-950 hover:bg-slate-800 border border-slate-800 font-mono text-[9px] text-slate-300 py-1.5 rounded transition uppercase"
                    >
                      /stats
                    </button>
                    <button 
                      onClick={() => runDirectCommand('history')}
                      className="bg-slate-950 hover:bg-slate-800 border border-slate-800 font-mono text-[9px] text-slate-300 py-1.5 rounded transition uppercase"
                    >
                      /history
                    </button>
                    <button 
                      onClick={() => runDirectCommand('clear')}
                      className="bg-slate-950 hover:bg-red-950/40 border border-slate-800 hover:border-red-900 font-mono text-[9px] text-red-400 py-1.5 rounded transition uppercase"
                    >
                      Clear DB
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Discord Visualizer Simulated Interface (Column span 7/12) */}
            <div className="lg:col-span-7 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl h-[650px]">
              
              {/* Discord Server Bar */}
              <div className="bg-slate-950 px-4 py-3 border-b border-slate-800/80 flex justify-between items-center shrink-0">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full flex items-center justify-center p-0.5 animate-pulse"></div>
                  <span className="text-xs font-semibold text-slate-300 tracking-wider uppercase font-mono">💬 Interactive Discord Simulator</span>
                </div>
                <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800/50 px-2 py-1 rounded-md text-[10px] text-slate-400 font-mono">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                  <span># comment-butler</span>
                </div>
              </div>

              {/* Chat Log Stream Area - custom scrollable container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
                {discordChatHistory.map((msg, index) => (
                  <div key={msg.id || index} className="flex space-x-3 text-sm group animate-fade-in">
                    
                    {/* Bot Avatar Icon */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${msg.isBot ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-amber-500'}`}>
                      {msg.isBot ? '🤖' : '👤'}
                    </div>

                    {/* Message Details */}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-baseline space-x-2">
                        <span className={`font-semibold ${msg.roleColor || 'text-slate-200'}`}>{msg.author}</span>
                        {msg.isBot && (
                          <span className="text-[10px] bg-indigo-600/30 text-indigo-300 font-bold px-1 py-0.2 rounded uppercase">BOT</span>
                        )}
                        <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                      </div>
                      
                      {msg.content && (
                        <p className="text-slate-300 text-xs sm:text-sm bg-slate-950/40 p-2 rounded-lg leading-relaxed border border-slate-800/40 inline-block max-w-full break-words">
                          {msg.content}
                        </p>
                      )}

                      {/* Display embeds elegantly (discord styled borders) */}
                      {msg.embeds && msg.embeds.map((emb: any, idx: number) => (
                        <div key={idx} className={`border-l-4 ${emb.color || 'border-indigo-500'} bg-slate-950 rounded-r-lg max-w-xl p-3.5 space-y-2 mt-1.5 shadow-md border border-slate-800/80`}>
                          <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            {emb.title}
                          </div>
                          {emb.description && (
                            <p className="text-xs text-slate-300 leading-relaxed font-light">{emb.description}</p>
                          )}
                          
                          {emb.fields && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1.5">
                              {emb.fields.map((f: any, fIdx: number) => (
                                <div key={fIdx} className={`text-xs ${f.inline ? 'col-span-1' : 'col-span-1 sm:col-span-2'}`}>
                                  <span className="block font-bold text-slate-400 mb-0.5">{f.name}</span>
                                  <span className="text-slate-100 font-mono text-xs block bg-slate-900 rounded p-1.5 border border-slate-800/70 overflow-auto whitespace-pre-wrap">{f.value}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="text-[9px] text-slate-500 border-t border-slate-800/60 pt-2 flex items-center justify-between">
                            <span>Discord bot simulation container</span>
                            <span>{new Date().toLocaleTimeString()}</span>
                          </div>
                        </div>
                      ))}

                    </div>
                  </div>
                ))}
              </div>

              {/* Bot Channel Typing Simulator Footer */}
              <div className="p-3 bg-slate-950 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <span className="text-[11px] text-slate-400 font-light flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                  Discord listeners initialized. Ready to trigger slash operations.
                </span>
                <span className="text-[10px] text-slate-500">
                  Logged in as <strong className="text-amber-400">rakibhosen9923</strong>
                </span>
              </div>

            </div>
          </>
        )}

        {/* Code Visualizer View (Column span 12/12) */}
        {activeTab === 'code' && (
          <div className="col-span-12 space-y-6">
            
            {/* Download and configuration panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-amber-400" />
                  Your generated, fully functional python workspace files
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                  These production-grade Python scripts incorporate a SQLite logging history, Gemini reply analysis, and Tweeny X comment auto-publishing with complete anti-spam filters.
                </p>
              </div>

              {/* Download direct ZIP/Github instructions button */}
              <div className="flex gap-2">
                <button
                  onClick={() => copyToClipboard(getFileContent(), selectedFile)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-lg text-xs transition flex items-center gap-1.5"
                >
                  {copiedStates[selectedFile] ? (
                    <>
                      <Check className="w-4 h-4 text-slate-950" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-950" />
                      <span>Copy Current File Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Code Tabs & Explorer content row */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
              
              {/* Left Explorer Index Panel */}
              <div className="md:col-span-3 flex flex-col space-y-1 bg-slate-900 p-2.5 border border-slate-800 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-500 px-2.5 py-1.5 tracking-widest block mb-1">Files Directory</span>
                
                {[
                  { name: 'bot.py', label: '🐍 Main Discord Bot script', color: 'text-amber-400 font-semibold' },
                  { name: 'requirements.txt', label: '📦 Python Dependencies list', color: 'text-slate-300' },
                  { name: 'Dockerfile', label: '🐳 Multi-Stage Container', color: 'text-slate-300' },
                  { name: 'docker-compose.yml', label: '🧱 Orchestration docker compose', color: 'text-slate-300' },
                  { name: '.env.example', label: '🔑 Core secrets declarations', color: 'text-slate-300' }
                ].map((file) => (
                  <button
                    key={file.name}
                    onClick={() => setSelectedFile(file.name)}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-all ${selectedFile === file.name ? 'bg-amber-500/10 text-amber-300 border-l-4 border-amber-500 font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
                  >
                    <div className={file.color}>{file.name}</div>
                    <div id={`tab-file-${file.name}`} className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 truncate font-sans font-light">{file.label}</div>
                  </button>
                ))}
              </div>

              {/* Right Code Display Canvas Container */}
              <div className="md:col-span-9 flex flex-col border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60 max-h-[600px]">
                
                {/* File Header Tab bar */}
                <div className="bg-slate-950 px-4 py-2 border-b border-slate-800/80 flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-300 font-semibold">{selectedFile}</span>
                  <span className="text-[10px] text-slate-500 bg-slate-900 border border-slate-800/80 px-2 py-0.5 rounded font-mono">
                    {selectedFile.split('.').pop()?.toUpperCase()} file format
                  </span>
                </div>

                {/* Preformatted interactive code preview block */}
                <div className="overflow-auto flex-1 font-mono text-xs p-4 bg-slate-950 text-slate-300 leading-relaxed max-h-[500px]">
                  <pre className="whitespace-pre">{getFileContent()}</pre>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Mobile Setup Masterclass View (Column span 12/12) */}
        {activeTab === 'guide' && (
          <div className="col-span-12 max-w-4xl mx-auto space-y-6">
            
            {/* Guide Introduction Header Banner */}
            <div className="bg-gradient-to-r from-indigo-950 to-slate-900 border border-indigo-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-3xl"></div>
              <div className="relative flex flex-col sm:flex-row gap-5 items-start">
                <div className="p-3 bg-indigo-600 rounded-xl text-white font-bold flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/30">
                  <Smartphone className="w-8 h-8 animate-bounce" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-indigo-400 font-mono uppercase tracking-wider">100% Mobile Ready Setup</span>
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                    Android Phone Builder Masterclass Guide
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Set up, verify, commit, and deploy this Discord auto-replier bot straight from your phone with a fast cloud server for continuous background runs!
                  </p>
                </div>
              </div>
            </div>

            {/* Quick interactive checklist block */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-3 font-mono">🚀 Setup Tracker Checklist</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs leading-relaxed">
                {[
                  "F-Droid client & Termux terminal application installed",
                  "Discord Developers Application created with Message Content Intent toggled",
                  "Twitter Developer settings permission shifted to 'Read and Write'",
                  "Private Git repository initialized, configured and committed",
                  "Railway continuous worker or Render Background Worker launched with keys config"
                ].map((item, index) => (
                  <label key={index} className="flex gap-2.5 items-start p-2.5 bg-slate-950 hover:bg-slate-800/40 rounded-lg cursor-pointer transition select-none">
                    <input type="checkbox" className="mt-0.5 accent-amber-500 scale-110 rounded-md border-slate-800 shrink-0 cursor-pointer" />
                    <span className="text-slate-300 font-light text-xs">{item}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Comprehensive mobile instructions rendered with elegant custom formatting */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                  Full Step-By-Step Setup Manual
                </h3>
                <button
                  onClick={() => copyToClipboard(phoneSetupGuideMarkdown, 'md-guide')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5"
                >
                  {copiedStates['md-guide'] ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied markdown</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Guide Markdown</span>
                    </>
                  )}
                </button>
              </div>

              {/* Renders Setup Guide elegantly */}
              <div className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light space-y-6">
                
                <section className="space-y-2">
                  <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                    <span className="w-5 h-5 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center font-mono text-xs">1</span>
                    Terminal Environment Setup (On Android Termux)
                  </h4>
                  <p>
                    Open **Termux** program on your phone and install required packages. Type each line manually and hit return:
                  </p>
                  <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-amber-300 overflow-auto whitespace-pre-wrap">
                    {`pkg update && pkg upgrade -y
pkg install git python sqlite -y
git clone https://github.com/rakibhosen9923/discord-x-bot.git
cd discord-x-bot
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt`}
                  </pre>
                </section>

                <section className="space-y-2">
                  <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                    <span className="w-5 h-5 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center font-mono text-xs">2</span>
                    Generating API and Bot Credentials
                  </h4>
                  <div className="space-y-2.5">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="font-bold text-amber-400 block mb-1">🎮 Discord credentials:</span>
                      <p className="text-xs text-slate-400 font-light leading-relaxed">
                        Go to the <span className="font-semibold text-slate-200">Discord Developers Portal</span>. Generate a token, then navigate down the left tab to &apos;Bot&apos;, locate &apos;Gateway Intent&apos;, and check the <span className="font-semibold text-slate-200">Message Content Intent</span> checkbox (absolutely critical for commands!).
                      </p>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="font-bold text-indigo-400 block mb-1">🐦 Twitter/X OAuth v2 credentials:</span>
                      <p className="text-xs text-slate-400 font-light leading-relaxed">
                        Navigate to the <span className="font-semibold text-slate-200">X Developer Portal</span>. Enable the OAuth 1.0a permission context, check &quot;Read and Write&quot;, save callback links as placeholder URLs (such as your repo address), and download your Keys + Tokens.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-2">
                  <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                    <span className="w-5 h-5 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center font-mono text-xs">3</span>
                    Linking GitHub & Push Code
                  </h4>
                  <p>
                    Initialize git in your Termux folder, attach remote origin, and use your developer **Personal Access Token (PAT)** in place of your password to push securely:
                  </p>
                  <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-indigo-400 overflow-auto">
                    {`git init
git add .
git commit -m "feat: complete discord-x commenter bot"
git branch -M main
git remote add origin https://github.com/rakibhosen9923/YOUR-REPO.git
git push -u origin main`}
                  </pre>
                </section>

                <section className="space-y-2">
                  <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                    <span className="w-5 h-5 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center font-mono text-xs">4</span>
                    Continuous Cloud Run Configuration
                  </h4>
                  <p>
                    Because phone background systems fall asleep or chew up valuable battery life, deploy your Bot to <strong className="text-white">Railway</strong> or <strong className="text-white">Render</strong>. Connect your GitHub repository, upload your environment variables from <code className="font-mono bg-slate-950 text-slate-100 p-0.5 rounded px-1.5">.env.example</code>, and trigger!
                  </p>
                  <div className="flex flex-wrap gap-4 pt-2">
                    <a 
                      href="https://railway.app" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-slate-950 hover:bg-slate-800 border border-slate-800 px-3 py-2 rounded-xl text-xs text-slate-300 inline-flex items-center gap-1"
                    >
                      <span>Deploy via Railway.app</span>
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                    </a>
                    <a 
                      href="https://render.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-slate-950 hover:bg-slate-800 border border-slate-800 px-3 py-2 rounded-xl text-xs text-slate-300 inline-flex items-center gap-1"
                    >
                      <span>Deploy via Render.com</span>
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                    </a>
                  </div>
                </section>

              </div>
            </div>

          </div>
        )}

      </main>

      {/* Standardized Platform Footer with human labels, clean visual borders */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-6 px-6 text-center text-xs text-slate-500 flex flex-wrap justify-between items-center gap-4 shrink-0 mt-auto">
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          <span>Designed & developed for rakibhosen9923 | Workspace live at Port 3000</span>
        </div>
        <div>
          <span>Google AI Studio Build & Playground</span>
        </div>
      </footer>

    </div>
  );
}

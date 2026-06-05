/**
 * Types defining data structures of our Discord Bot workbench & Simulator
 */

export interface BotFile {
  path: string;
  name: string;
  content: string;
  language: string;
}

export type TopicCategory = 
  | 'announcements'
  | 'partnerships'
  | 'testnets'
  | 'funding'
  | 'community updates'
  | 'technology'
  | 'governance'
  | 'education'
  | 'general';

export interface CommentLog {
  id: string;
  xPostUrl: string;
  xAuthor: string;
  originalText: string;
  summary: string;
  generatedComment: string;
  confidenceScore: number;
  category: TopicCategory;
  createdAt: string;
  status: 'posted' | 'preview_only' | 'failed';
  feedback?: string;
  style: string;
}

export interface BotConfig {
  botName: string;
  toneMode: 'Engaging' | 'Technical' | 'Supportive' | 'Analytical' | 'Witty' | 'Skeptical';
  cooldownSecs: number;
  minConfidence: number;
  antiSpamSimilarityThreshold: number;
}

export interface DiscordMessage {
  id: string;
  user: {
    username: string;
    avatarUrl?: string;
    isBot?: boolean;
    roleColor?: string;
  };
  content: string;
  timestamp: string;
  embeds?: Array<{
    title?: string;
    description?: string;
    color?: string;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
    footer?: { text: string };
  }>;
}

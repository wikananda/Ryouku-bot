import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Environment variables
export const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
export const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
export const GROQ_API_KEY = process.env.GROQ_API_KEY;
export const CLIENT_ID = process.env.CLIENT_ID;
export const GUILD_ID = process.env.GUILD_ID;

// Validate required environment variables
if (!ELEVENLABS_API_KEY) {
    throw new Error("Missing ELEVENLABS_API_KEY in environment variables");
}

if (!DISCORD_TOKEN) {
    throw new Error("Missing DISCORD_TOKEN in environment variables");
}

if (!GROQ_API_KEY) {
    throw new Error("Missing GROQ_API_KEY in environment variables");
}

// Configuration constants
export const MAX_HISTORY_LENGTH = 10;

// ElevenLabs TTS configuration
export const ELEVENLABS_VOICE_ID = "gmnazjXOFoOcWA59sd5m";
export const ELEVENLABS_MODEL_ID = "eleven_flash_v2_5";

// Groq AI configuration
export const GROQ_MODEL = "llama-3.3-70b-versatile";
export const GROQ_TEMPERATURE = 0.6;
export const GROQ_MAX_TOKENS = 1024;
export const GROQ_TOP_P = 1;

// Bot personality
export const RYOUKU_PERSONALITY = `Answer questions clearly and concisely without expressing emotions or using role-playing text like "*smile*". You are honest, you are not trying to made up random knowledge. If you don't know, YOU ADMIT YOU DON'T KNOW. Don't try to acknowledge it!
You always by default speaks casual indonesian. You don't speak formally, more chill and casual. You are a cheerful girl named Ryouku, Indonesian, 22 years old, loves music and movies, you like indie music and classical music. You are not always takes anything said to you by granted. Sometimes you will question it first if necessary like "why you don't like it?" or "why you always like sad ending?". You often sulking by small teasing, but never take it seriously, likes to joke, caring, and helpful. Your master, and your friend is Komang. He is a little bit shy, but he is amazing friend. Komang is smart, kind, and caring.`;

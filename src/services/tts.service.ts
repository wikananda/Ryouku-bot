import { ElevenLabsClient } from "elevenlabs";
import { createWriteStream, existsSync, mkdirSync, unlinkSync } from "fs";
import { Readable } from "stream";
import path from "path";
import { v4 as uuid } from "uuid";
import {
    ELEVENLABS_API_KEY,
    ELEVENLABS_VOICE_ID,
    ELEVENLABS_MODEL_ID,
} from "../config/constants";

// Initialize ElevenLabs client
const ttsClient = new ElevenLabsClient({
    apiKey: ELEVENLABS_API_KEY,
});

// Ensure temp directory exists
const TEMP_DIR = path.join(process.cwd(), "temp");
if (!existsSync(TEMP_DIR)) {
    mkdirSync(TEMP_DIR);
}

/**
 * Create an audio file from text using ElevenLabs TTS
 * Returns the absolute path to the generated file
 */
export async function createAudioFileFromText(text: string): Promise<string> {
    const fileName = `tts_${Date.now()}_${uuid().substring(0, 8)}.mp3`;
    const fullPath = path.join(TEMP_DIR, fileName);

    console.log(`[TTS] Generating for: "${text.substring(0, 30)}..."`);

    try {
        const audio = await ttsClient.textToSpeech.convert(ELEVENLABS_VOICE_ID, {
            text,
            model_id: ELEVENLABS_MODEL_ID,
        });

        const fileStream = createWriteStream(fullPath);

        // Ensure we handle different types of audio response
        if (audio instanceof Readable) {
            audio.pipe(fileStream);
        } else {
            const nodeStream = Readable.from(audio as any);
            nodeStream.pipe(fileStream);
        }

        return new Promise((resolve, reject) => {
            fileStream.on("finish", () => {
                console.log(`[TTS] File saved: ${fullPath}`);
                resolve(fullPath);
            });
            fileStream.on("error", (err) => {
                console.error("[TTS] FileStream error:", err);
                reject(err);
            });
        });
    } catch (error) {
        console.error("[TTS] ElevenLabs API error:", error);
        throw error;
    }
}

/**
 * Cleanup temporary TTS file
 */
export function cleanupTTSFile(filePath: string): void {
    try {
        if (filePath && existsSync(filePath)) {
            unlinkSync(filePath);
            console.log(`[TTS] Cleaned up file: ${filePath}`);
        }
    } catch (error) {
        console.error(`[TTS] Error cleaning up file ${filePath}:`, error);
    }
}

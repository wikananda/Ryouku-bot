import { ElevenLabsClient } from "elevenlabs";
import { createWriteStream, existsSync, mkdirSync } from "fs";
import { Readable } from "stream";
import path from "path";
import {
    ELEVENLABS_API_KEY,
    ELEVENLABS_VOICE_ID,
    ELEVENLABS_MODEL_ID,
} from "../config/constants";

// Initialize ElevenLabs client
const ttsClient = new ElevenLabsClient({
    apiKey: ELEVENLABS_API_KEY,
});

/**
 * Create an audio file from text using ElevenLabs TTS
 */
export async function createAudioFileFromText(text: string): Promise<string> {
    const fullPath = path.join(process.cwd(), "audio.mp3");

    console.log(`Generating TTS for: "${text.substring(0, 20)}..."`);

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
                console.log(`TTS file saved: ${fullPath}`);
                resolve(fullPath); // Return absolute path
            });
            fileStream.on("error", (err) => {
                console.error("FileStream error:", err);
                reject(err);
            });
        });
    } catch (error) {
        console.error("ElevenLabs API error:", error);
        throw error;
    }
}

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { createWriteStream } from "fs";
import { Readable } from "stream";
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
    const filename = `audio.mp3`;

    const audio = await ttsClient.textToSpeech.convert(ELEVENLABS_VOICE_ID, {
        text,
        modelId: ELEVENLABS_MODEL_ID,
    });

    const fileStream = createWriteStream(filename);
    const nodeStream = Readable.from(audio as any);
    nodeStream.pipe(fileStream);

    return new Promise((resolve, reject) => {
        fileStream.on("finish", () => resolve(filename));
        fileStream.on("error", reject);
    });
}

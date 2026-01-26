import { Readable } from "stream";
import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    StreamType,
    VoiceConnection,
    AudioPlayer,
} from "@discordjs/voice";
import { VoiceBasedChannel } from "discord.js";
import { Innertube, ClientType } from "youtubei.js";
import prism from "prism-media";

// Singleton instance for InnerTube
let youtube: Innertube | null = null;

async function getInnertube() {
    if (!youtube) {
        // Use ANDROID client - doesn't require OAuth and works well for audio
        youtube = await Innertube.create({
            client_type: ClientType.ANDROID,
            retrieve_player: false, // Skip player retrieval on init
        });
        console.log("[YouTube] InnerTube initialized with ANDROID client");
    }
    return youtube;
}

/**
 * Extract video ID from various YouTube URL formats
 */
function extractVideoId(url: string): string | null {
    const patterns = [
        /youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

/**
 * Get video title from YouTube URL
 */
export async function getVideoTitle(youtubeUrl: string): Promise<string> {
    const yt = await getInnertube();
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
        throw new Error("Invalid YouTube URL");
    }
    const info = await yt.getBasicInfo(videoId);
    return info.basic_info.title || "Unknown Title";
}

/**
 * Play YouTube audio in voice channel using youtubei.js
 * @param onFinish - Callback when song finishes playing
 * @returns Object with title, player, connection, and voiceChannel
 */
export async function playYoutubeAudio(
    voiceChannel: VoiceBasedChannel,
    youtubeUrl: string,
    onFinish?: () => void
): Promise<{
    title: string;
    player: AudioPlayer;
    connection: VoiceConnection;
    voiceChannel: VoiceBasedChannel;
}> {
    try {
        console.log(`Setting up playback for: ${youtubeUrl}`);

        // Initialize InnerTube
        const yt = await getInnertube();

        // Extract video ID from URL
        const videoId = extractVideoId(youtubeUrl);
        if (!videoId) {
            throw new Error("Invalid YouTube URL - could not extract video ID");
        }
        console.log(`Video ID: ${videoId}`);

        // Create voice connection first
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });

        connection.on(VoiceConnectionStatus.Ready, () => {
            console.log("Voice connection ready");
        });

        connection.on(VoiceConnectionStatus.Disconnected, () => {
            console.log("Voice connection disconnected");
        });

        // Get video info using ANDROID client
        console.log("Fetching video info...");
        const info = await yt.getBasicInfo(videoId);
        const title = info.basic_info.title || "Unknown Title";
        console.log(`Playing: ${title}`);

        // Get the best audio format
        const format = info.chooseFormat({
            type: 'audio',
            quality: 'best'
        });

        if (!format) {
            throw new Error("No suitable audio format found");
        }

        // Decipher the URL (this returns a Promise)
        const audioUrl = await format.decipher(yt.session.player);
        if (!audioUrl) {
            throw new Error("Failed to decipher audio URL");
        }
        console.log("Audio URL obtained");

        // Fetch the audio stream
        const response = await fetch(audioUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch audio: ${response.status}`);
        }

        // Convert to Node stream
        const nodeStream = Readable.fromWeb(response.body as any);

        // Convert the stream to PCM using ffmpeg
        const transcoder = new prism.FFmpeg({
            args: [
                "-analyzeduration", "0",
                "-loglevel", "0",
                "-f", "s16le",
                "-ar", "48000",
                "-ac", "2",
            ],
        } as any);

        // Pipe the audio stream into FFmpeg
        const pcmStream = nodeStream.pipe(transcoder);

        // Create audio resource from the PCM stream
        const resource = createAudioResource(pcmStream, {
            inputType: StreamType.Raw,
        });

        // Create and play
        const player = createAudioPlayer();

        player.on("stateChange", (oldState, newState) => {
            console.log(`Player state: ${oldState.status} -> ${newState.status}`);
        });

        player.on("error", (error) => {
            console.error("Player error:", error);
            connection.destroy();
        });

        player.on(AudioPlayerStatus.Idle, () => {
            console.log("Playback finished");
            if (onFinish) {
                onFinish();
            } else {
                connection.destroy();
            }
        });

        player.play(resource);
        connection.subscribe(player);
        console.log("Started playing!");

        return {
            title,
            player,
            connection,
            voiceChannel
        };

    } catch (error) {
        console.error("Error playing YouTube audio:", error);
        throw error;
    }
}
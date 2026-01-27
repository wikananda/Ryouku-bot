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

// Singleton instances for different clients
let searchClient: Innertube | null = null;
let playbackClient: Innertube | null = null;

/**
 * Get the client used for searching and general metadata (WEB)
 */
async function getSearchClient() {
    if (!searchClient) {
        searchClient = await Innertube.create({
            client_type: ClientType.WEB,
            retrieve_player: false,
        });
        console.log("[YouTube] Search client (WEB) initialized");
    }
    return searchClient;
}

/**
 * Get the client used for playback extraction (ANDROID)
 */
async function getPlaybackClient() {
    if (!playbackClient) {
        playbackClient = await Innertube.create({
            client_type: ClientType.ANDROID,
            retrieve_player: true,
        });
        console.log("[YouTube] Playback client (ANDROID) initialized");
    }
    return playbackClient;
}
/**
 * Warm up clients on startup
 */
export async function warmupClients() {
    console.log("[YouTube] Warming up clients...");
    await Promise.all([getSearchClient(), getPlaybackClient()]);
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
        /^([a-zA-Z0-9_-]{11})$/,
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
    const yt = await getSearchClient();
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
        throw new Error("Invalid YouTube URL");
    }
    // WEB client is very stable for basic info
    const info = await yt.getBasicInfo(videoId);
    return info.basic_info.title || "Unknown Title";
}

/**
 * Search for videos on YouTube
 */
export async function searchVideos(query: string) {
    if (!query) return [];

    const yt = await getSearchClient();

    try {
        // WEB search is most comprehensive
        const results = await yt.search(query, { type: 'video' });
        const videos = results.videos || [];

        return videos.slice(0, 10).map((v: any) => ({
            title: v.title?.toString() || 'Unknown Title',
            id: v.id?.toString() || ''
        })).filter((v: any) => v.id);
    } catch (error) {
        console.error("YouTube search error:", error);
        return [];
    }
}

/**
 * Play YouTube audio in voice channel using youtubei.js
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

        const sClient = await getSearchClient();
        const pClient = await getPlaybackClient();

        const videoId = extractVideoId(youtubeUrl);
        if (!videoId) {
            throw new Error("Invalid YouTube URL - could not extract video ID");
        }

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });

        // Use Search client for metadata (faster/stays on WEB)
        console.log("Fetching video metadata...");
        const basicInfo = await sClient.getBasicInfo(videoId);
        const title = basicInfo.basic_info.title || "Unknown Title";
        console.log(`Playing: ${title}`);

        // Use Playback client (ANDROID) for actual stream extraction
        console.log("Extracting audio stream (ANDROID client)...");
        let info;
        try {
            info = await pClient.getInfo(videoId);
        } catch (e) {
            console.warn("Playback client getInfo failed, falling back to Search client or BasicInfo:", e);
            // Fallback: try getBasicInfo which doesn't parse 'watch next' (the usual crash point)
            try {
                info = (await pClient.getBasicInfo(videoId)) as any;
            } catch (e2) {
                console.error("Secondary fallback failed:", e2);
                // Last ditch effort: use search client for playback too
                info = (await sClient.getInfo(videoId)) as any;
            }
        }

        const format = info.chooseFormat({
            type: 'audio',
            quality: 'best'
        });

        if (!format) {
            throw new Error("No suitable audio format found");
        }

        console.log("Deciphering audio URL...");
        // Use the session of the client that provided the info
        const session = (info as any).session || pClient.session;
        const audioUrl = await format.decipher(session.player);
        if (!audioUrl) {
            throw new Error("Failed to decipher audio URL. This content might be restricted.");
        }

        const response = await fetch(audioUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch audio: ${response.status}`);
        }

        const nodeStream = Readable.fromWeb(response.body as any);
        const transcoder = new prism.FFmpeg({
            args: [
                "-analyzeduration", "0",
                "-loglevel", "0",
                "-f", "s16le",
                "-ar", "48000",
                "-ac", "2",
            ],
        } as any);

        const resource = createAudioResource(nodeStream.pipe(transcoder), {
            inputType: StreamType.Raw,
        });

        const player = createAudioPlayer();
        player.on(AudioPlayerStatus.Idle, () => {
            if (onFinish) onFinish();
            else connection.destroy();
        });

        player.on("error", (error) => {
            console.error("Player error:", error);
            connection.destroy();
        });

        player.play(resource);
        connection.subscribe(player);
        console.log("Started playing!");

        return { title, player, connection, voiceChannel };

    } catch (error) {
        console.error("Error playing YouTube audio:", error);
        throw error;
    }
}
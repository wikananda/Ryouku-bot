import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    VoiceConnection,
    AudioPlayer,
    entersState,
    NoSubscriberBehavior,
} from "@discordjs/voice";
import { VoiceBasedChannel } from "discord.js";
import play from "play-dl";

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
    try {
        const info = await play.video_info(youtubeUrl);
        return info.video_details.title || "Unknown Title";
    } catch (error) {
        console.error("[YouTube] Error fetching video title:", error);
        return "Unknown Title";
    }
}

/**
 * Search for videos on YouTube
 */
export async function searchVideos(query: string) {
    if (!query) return [];

    try {
        const searchResults = await play.search(query, {
            limit: 10,
            source: { youtube: "video" }
        });

        return searchResults.map((video) => ({
            title: video.title || "Unknown Title",
            id: video.id || ""
        })).filter((v) => v.id);
    } catch (error) {
        console.error("[YouTube] Search error:", error);
        return [];
    }
}

/**
 * Play YouTube audio in voice channel using play-dl
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
        console.log(`[YouTube] Setting up playback for: ${youtubeUrl}`);

        // Validate URL
        const videoId = extractVideoId(youtubeUrl);
        if (!videoId) {
            youtubeUrl = `https://www.youtube.com/watch?v=${youtubeUrl}`;
        }

        // Get video info
        console.log("[YouTube] Fetching video metadata...");
        const info = await play.video_info(youtubeUrl);
        const title = info.video_details.title || "Unknown Title";
        console.log(`[YouTube] Playing: ${title}`);

        // Create voice connection
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });

        // Get audio stream from play-dl
        console.log("[YouTube] Creating audio stream...");
        const stream = await play.stream(youtubeUrl);

        // Create audio resource
        const resource = createAudioResource(stream.stream, {
            inputType: stream.type,
        });

        // Create audio player
        const player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play,
            },
        });

        // Set up event listeners
        player.on("stateChange", (oldState, newState) => {
            console.log(`[YouTube] Player State: ${oldState.status} -> ${newState.status}`);
            if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
                console.log("[YouTube] Playback finished");
                if (onFinish) onFinish();
                else connection.destroy();
            }
        });

        player.on("error", (error) => {
            console.error("[YouTube] Player error:", error);
            connection.destroy();
        });

        connection.on("stateChange", (oldState, newState) => {
            console.log(`[YouTube] Connection State: ${oldState.status} -> ${newState.status}`);
        });

        connection.subscribe(player);

        try {
            // Wait for connection to be ready before playing
            console.log("[YouTube] Waiting for connection to be ready...");
            await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
            console.log("[YouTube] Connection ready! Starting playback...");

            player.play(resource);
            console.log("[YouTube] ✓ Playback started successfully");
        } catch (error) {
            console.error("[YouTube] Connection failed to become ready:", error);
            connection.destroy();
            throw new Error("Failed to establish voice connection");
        }

        return { title, player, connection, voiceChannel };

    } catch (error) {
        console.error("[YouTube] Error playing audio:", error);
        throw error;
    }
}
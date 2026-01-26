import { VoiceBasedChannel, TextBasedChannel } from "discord.js";
import {
    AudioPlayer,
    VoiceConnection,
} from "@discordjs/voice";

export interface QueueItem {
    url: string;
    title: string;
    requestedBy: string; // User ID or username
}

interface GuildQueue {
    items: QueueItem[];
    currentSong: QueueItem | null;
    player: AudioPlayer | null;
    connection: VoiceConnection | null;
    voiceChannel: VoiceBasedChannel | null;
    textChannel: TextBasedChannel | null;
}

// Store queues per guild
const guildQueues = new Map<string, GuildQueue>();

/**
 * Get or create queue for a guild
 */
function getQueue(guildId: string): GuildQueue {
    if (!guildQueues.has(guildId)) {
        guildQueues.set(guildId, {
            items: [],
            currentSong: null,
            player: null,
            connection: null,
            voiceChannel: null,
            textChannel: null,
        });
    }
    return guildQueues.get(guildId)!;
}

/**
 * Add song to queue
 */
export function addToQueue(
    guildId: string,
    item: QueueItem
): { position: number; isPlaying: boolean } {
    const queue = getQueue(guildId);
    queue.items.push(item);

    const isPlaying = queue.currentSong !== null;
    const position = queue.items.length;

    return { position, isPlaying };
}

/**
 * Get next song from queue
 */
export function getNext(guildId: string): QueueItem | null {
    const queue = getQueue(guildId);
    return queue.items.shift() || null;
}

/**
 * Get current song
 */
export function getCurrentSong(guildId: string): QueueItem | null {
    const queue = getQueue(guildId);
    return queue.currentSong;
}

/**
 * Set current song
 */
export function setCurrentSong(guildId: string, song: QueueItem | null): void {
    const queue = getQueue(guildId);
    queue.currentSong = song;
}

/**
 * Get all queued items (not including current)
 */
export function getQueueItems(guildId: string): QueueItem[] {
    const queue = getQueue(guildId);
    return [...queue.items];
}

/**
 * Skip current song
 */
export function skipCurrent(guildId: string): void {
    const queue = getQueue(guildId);
    if (queue.player) {
        queue.player.stop();
    }
}

/**
 * Remove item at index (1-indexed for users)
 */
export function removeAt(guildId: string, index: number): QueueItem | null {
    const queue = getQueue(guildId);

    if (index < 1 || index > queue.items.length) {
        return null;
    }

    const removed = queue.items.splice(index - 1, 1)[0];
    return removed;
}

/**
 * Clear entire queue and stop playback
 */
export function clearQueue(guildId: string): void {
    const queue = getQueue(guildId);
    queue.items = [];
    queue.currentSong = null;

    if (queue.player) {
        queue.player.stop();
    }

    if (queue.connection) {
        queue.connection.destroy();
    }

    queue.player = null;
    queue.connection = null;
    queue.voiceChannel = null;
}

/**
 * Check if guild is currently playing
 */
export function isPlaying(guildId: string): boolean {
    const queue = getQueue(guildId);
    return queue.currentSong !== null;
}

/**
 * Set player and connection for a guild
 */
export function setPlayerInfo(
    guildId: string,
    player: AudioPlayer,
    connection: VoiceConnection,
    voiceChannel: VoiceBasedChannel,
    textChannel: TextBasedChannel
): void {
    const queue = getQueue(guildId);
    queue.player = player;
    queue.connection = connection;
    queue.voiceChannel = voiceChannel;
    queue.textChannel = textChannel;
}

/**
 * Get text channel for guild
 */
export function getTextChannel(guildId: string): TextBasedChannel | null {
    const queue = getQueue(guildId);
    return queue.textChannel;
}

/**
 * Get voice channel for guild
 */
export function getVoiceChannel(guildId: string): VoiceBasedChannel | null {
    const queue = getQueue(guildId);
    return queue.voiceChannel;
}

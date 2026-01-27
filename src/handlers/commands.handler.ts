import { Client, CommandInteraction, GuildMember } from "discord.js";
import { createAudioFileFromText } from "../services/tts.service";
import {
    playAudioText,
    connectToVoiceChannel,
    disconnectFromVoiceChannel,
} from "../services/voice.service";
import { playYoutubeAudio, getVideoTitle, searchVideos } from "../services/youtube.service";
import * as QueueService from "../services/queue.service";
import { AUDIO_GENERATION_ERROR_MESSAGE, VOICE_CHANNEL_REQUIRED_MESSAGE } from "../utils/validation.utils";

/**
 * Play next song in queue
 */
async function playNextInQueue(guildId: string): Promise<void> {
    const nextSong = QueueService.getNext(guildId);

    if (!nextSong) {
        // No more songs in queue
        QueueService.clearQueue(guildId);
        console.log("Queue empty, playback finished");
        return;
    }

    const voiceChannel = QueueService.getVoiceChannel(guildId);
    if (!voiceChannel) {
        QueueService.clearQueue(guildId);
        return;
    }

    try {
        QueueService.setCurrentSong(guildId, nextSong);

        const result = await playYoutubeAudio(voiceChannel, nextSong.url, () => {
            // When this song finishes, play next
            playNextInQueue(guildId);
        });

        const textChannel = QueueService.getTextChannel(guildId);
        if (textChannel) {
            await (textChannel as any).send(`Now playing: **[${result.title}](${nextSong.url})** 🎵`);
        }

        // Store player and connection info
        QueueService.setPlayerInfo(guildId, result.player, result.connection, result.voiceChannel, textChannel!);

        console.log(`Auto-playing next in queue: ${result.title}`);
    } catch (error) {
        console.error("Error auto-playing next song:", error);
        // Try next song if this one fails
        playNextInQueue(guildId);
    }
}

/**
 * Handle /say command
 */
async function handleSayCommand(interaction: CommandInteraction): Promise<void> {
    const text = interaction.options.get("text", true).value as string;
    console.log("Say:", text);

    // Type guard to ensure member is GuildMember
    if (!interaction.member || !(interaction.member instanceof GuildMember)) {
        await interaction.reply(VOICE_CHANNEL_REQUIRED_MESSAGE);
        return;
    }

    try {
        await interaction.deferReply();

        const audioFileName = await createAudioFileFromText(text);
        await playAudioText(interaction, audioFileName, text);
    } catch (error) {
        console.error(error);
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply(AUDIO_GENERATION_ERROR_MESSAGE);
        } else {
            await interaction.reply(AUDIO_GENERATION_ERROR_MESSAGE);
        }
    }
}

/**
 * Handle /play command
 */
async function handlePlayCommand(interaction: CommandInteraction): Promise<void> {
    let url = interaction.options.get("url", true)?.value as string;

    console.log("Play YouTube - Input received:", url);

    // If it's a video ID (11 chars and not a URL), convert to full URL
    if (url && url.length === 11 && !url.includes("http")) {
        url = `https://www.youtube.com/watch?v=${url}`;
    }

    // Validate URL is not undefined or empty
    if (!url || typeof url !== "string") {
        await interaction.reply("Please provide a valid YouTube URL or search query.");
        return;
    }

    // Type guard to ensure member is GuildMember
    if (!interaction.member || !(interaction.member instanceof GuildMember)) {
        await interaction.reply(VOICE_CHANNEL_REQUIRED_MESSAGE);
        return;
    }

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
        await interaction.reply(VOICE_CHANNEL_REQUIRED_MESSAGE);
        return;
    }

    const guildId = interaction.guildId!;
    const requestedBy = interaction.user.username;

    try {
        await interaction.reply("Loading...");

        // Check if already playing
        if (QueueService.isPlaying(guildId)) {
            // Fetch title first to show in queue response
            const title = await getVideoTitle(url);

            // Add to queue
            const { position } = QueueService.addToQueue(guildId, {
                url,
                title: title,
                requestedBy,
            });

            await interaction.editReply(
                `Added to queue at position **${position}**: **[${title}](${url})** 🎵`
            );
        } else {
            // Nothing playing, start immediately
            const result = await playYoutubeAudio(voiceChannel, url, () => {
                // When finished, play next in queue
                playNextInQueue(guildId);
            });

            QueueService.setCurrentSong(guildId, {
                url,
                title: result.title,
                requestedBy,
            });
            QueueService.setPlayerInfo(guildId, result.player, result.connection, result.voiceChannel, interaction.channel as any);

            await interaction.editReply(
                `Now playing: **[${result.title}](${url})** 🎵`
            );
        }
    } catch (error) {
        console.error("Error playing YouTube audio:", error);
        const errorMessage = error instanceof Error && error.message === "Invalid YouTube URL"
            ? "Invalid YouTube URL. Please provide a valid YouTube link."
            : "An error occurred while playing the YouTube audio.";

        if (interaction.replied) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
}

/**
 * Handle /queue command
 */
async function handleQueueCommand(interaction: CommandInteraction): Promise<void> {
    const guildId = interaction.guildId!;

    const currentSong = QueueService.getCurrentSong(guildId);
    const queueItems = QueueService.getQueueItems(guildId);

    if (!currentSong && queueItems.length === 0) {
        await interaction.reply("The queue is empty. Use `/play` to add songs!");
        return;
    }

    let message = "🎵 **Music Queue**\n\n";

    if (currentSong) {
        message += `**Now Playing:**\n[${currentSong.title}](${currentSong.url}) - Requested by ${currentSong.requestedBy}\n\n`;
    }

    if (queueItems.length > 0) {
        message += "**Queue:**\n";
        queueItems.forEach((item, index) => {
            message += `${index + 1}. [${item.title}](${item.url}) - Requested by ${item.requestedBy}\n`;
        });
        message += `\n**Total:** ${queueItems.length} song(s) in queue`;
    } else {
        message += "_No songs in queue_";
    }

    await interaction.reply(message);
}

/**
 * Handle /skip command
 */
async function handleSkipCommand(interaction: CommandInteraction): Promise<void> {
    const guildId = interaction.guildId!;

    if (!QueueService.isPlaying(guildId)) {
        await interaction.reply("Nothing is currently playing!");
        return;
    }

    const currentSong = QueueService.getCurrentSong(guildId);
    QueueService.skipCurrent(guildId);

    await interaction.reply(
        `Skipped: **${currentSong?.title || "current song"}** ⏭️`
    );
}

/**
 * Handle /remove command
 */
async function handleRemoveCommand(interaction: CommandInteraction): Promise<void> {
    const guildId = interaction.guildId!;
    const index = interaction.options.get("index", true).value as number;

    const removed = QueueService.removeAt(guildId, index);

    if (!removed) {
        await interaction.reply(
            `Invalid index! Use \`/queue\` to see valid positions.`
        );
        return;
    }

    await interaction.reply(
        `Removed from queue: **${removed.title}** ❌`
    );
}

/**
 * Handle /stop command
 */
async function handleStopCommand(interaction: CommandInteraction): Promise<void> {
    const guildId = interaction.guildId!;

    if (!QueueService.isPlaying(guildId)) {
        await interaction.reply("Nothing is currently playing!");
        return;
    }

    QueueService.clearQueue(guildId);
    await interaction.reply("Stopped playback and cleared the queue 🛑");
}

/**
 * Handle /connect command
 */
async function handleConnectCommand(
    interaction: CommandInteraction,
): Promise<void> {
    await connectToVoiceChannel(interaction);
}

/**
 * Handle /dc command
 */
async function handleDisconnectCommand(
    interaction: CommandInteraction,
): Promise<void> {
    await disconnectFromVoiceChannel(interaction);
}

/**
 * Handle autocomplete for /play command
 */
async function handleAutocomplete(interaction: any): Promise<void> {
    const focusedValue = interaction.options.getFocused();

    if (!focusedValue || focusedValue.length < 2) {
        await interaction.respond([]);
        return;
    }

    try {
        const results = await searchVideos(focusedValue);
        await interaction.respond(
            results.map(choice => ({
                name: choice.title.length > 100 ? choice.title.substring(0, 97) + "..." : choice.title,
                value: choice.id,
            }))
        );
    } catch (error) {
        console.error("Autocomplete error:", error);
        await interaction.respond([]);
    }
}

/**
 * Setup interaction handlers for slash commands
 */
export function setupCommandHandlers(client: Client): void {
    client.on("interactionCreate", async (interaction) => {
        // Handle autocomplete
        if (interaction.isAutocomplete()) {
            if (interaction.commandName === 'play') {
                await handleAutocomplete(interaction);
            }
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        switch (interaction.commandName) {
            case "say":
                await handleSayCommand(interaction);
                break;
            case "play":
                await handlePlayCommand(interaction);
                break;
            case "queue":
                await handleQueueCommand(interaction);
                break;
            case "skip":
                await handleSkipCommand(interaction);
                break;
            case "remove":
                await handleRemoveCommand(interaction);
                break;
            case "stop":
                await handleStopCommand(interaction);
                break;
            case "connect":
                await handleConnectCommand(interaction);
                break;
            case "dc":
                await handleDisconnectCommand(interaction);
                break;
        }
    });
}

import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    VoiceConnectionStatus,
    getVoiceConnection,
    entersState,
    NoSubscriberBehavior,
} from "@discordjs/voice";
import { CommandInteraction, Message, GuildMember } from "discord.js";
import { AudioSource } from "../types";
import {
    getVoiceChannelFromSource,
    VOICE_CHANNEL_REQUIRED_MESSAGE,
} from "../utils/validation.utils";
import { existsSync } from "fs";
import { cleanupTTSFile } from "./tts.service";

/**
 * Play audio text in voice channel
 */
export async function playAudioText(
    source: AudioSource,
    audioFileName: string,
    text: string,
): Promise<void> {
    const voiceChannel = getVoiceChannelFromSource(source);

    if (!voiceChannel) {
        const reply =
            source instanceof Message
                ? source.reply.bind(source)
                : source.editReply.bind(source);

        await reply(VOICE_CHANNEL_REQUIRED_MESSAGE);
        return;
    }

    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    // Create a player with autopause disabled
    const player = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Play,
        },
    });

    // Explicitly disable autopause if supported or just handle it via state
    // In discord.js/voice, autopaused happens if connection is not ready.

    const filePath = audioFileName;
    console.log(`[Voice] Checking if file exists: ${filePath}`);

    if (!existsSync(filePath)) {
        console.error(`[Voice] Audio file NOT found at: ${filePath}`);
        throw new Error("Generated audio file is missing.");
    }

    const resource = createAudioResource(filePath, {
        inlineVolume: true,
    });

    // Set up event listeners
    player.on("stateChange", (oldState, newState) => {
        console.log(`[Voice] TTS Player: ${oldState.status} -> ${newState.status}`);

        // Cleanup file when finished or error
        if (newState.status === "idle") {
            console.log("[Voice] Playback finished or failed (Idle).");
            cleanupTTSFile(filePath);
        }
    });

    player.on("error", (error) => {
        console.error("[Voice] Audio player error:", error.message);
        cleanupTTSFile(filePath);
    });

    connection.subscribe(player);

    try {
        // Wait for the connection to be ready
        console.log("[Voice] Waiting for voice connection to be ready...");
        await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
        console.log("[Voice] Voice connection is READY. Starting playback.");

        player.play(resource);
    } catch (error) {
        console.error("[Voice] Voice connection failed to become ready:", error);
        cleanupTTSFile(filePath);
        if (source instanceof Message) {
            await source.reply("Failed to connect to voice channel.");
        } else {
            await source.editReply("Failed to connect to voice channel.");
        }
        return;
    }

    // Send reply
    if (source instanceof Message) {
        await source.reply("Speaking... 🗣️");
    } else {
        await source.editReply("Speaking... 🗣️");
    }
}

/**
 * Connect to voice channel
 */
export async function connectToVoiceChannel(
    interaction: CommandInteraction,
): Promise<void> {
    if (!interaction.member || !(interaction.member instanceof GuildMember)) {
        await interaction.reply(VOICE_CHANNEL_REQUIRED_MESSAGE);
        return;
    }

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel || !interaction.guildId) {
        await interaction.reply(VOICE_CHANNEL_REQUIRED_MESSAGE);
        return;
    }

    await interaction.reply("Connecting to voice channel...");

    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guildId,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    connection.on(VoiceConnectionStatus.Ready, () => {
        console.log("The bot has connected to the channel!");
    });

    connection.on(VoiceConnectionStatus.Disconnected, () => {
        console.log("The bot has disconnected from the channel.");
    });
}

/**
 * Disconnect from voice channel
 */
export async function disconnectFromVoiceChannel(
    interaction: CommandInteraction,
): Promise<void> {
    if (!interaction.guildId || !interaction.guild) {
        await interaction.reply("This command can only be used in server");
        return;
    }

    const connection = getVoiceConnection(interaction.guildId);
    if (connection) {
        connection.destroy();
        await interaction.reply("Disconnected from the voice channel");
    } else {
        await interaction.reply("Not connected to a voice channel");
    }
}

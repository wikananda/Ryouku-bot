import { Client, CommandInteraction, GuildMember } from "discord.js";
import { createAudioFileFromText } from "../services/tts.service";
import {
    playAudioText,
    connectToVoiceChannel,
    disconnectFromVoiceChannel,
} from "../services/voice.service";
import { playYoutubeAudio } from "../services/youtube.service";
import { AUDIO_GENERATION_ERROR_MESSAGE, VOICE_CHANNEL_REQUIRED_MESSAGE } from "../utils/validation.utils";

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
    const url = interaction.options.get("url", true)?.value as string;

    console.log("Play YouTube - URL received:", url);
    console.log("URL type:", typeof url);

    // Validate URL is not undefined or empty
    if (!url || typeof url !== "string") {
        await interaction.reply("Please provide a valid YouTube URL.");
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

    try {
        await interaction.reply("Loading and playing YouTube audio...");
        const title = await playYoutubeAudio(voiceChannel, url);

        // Edit the reply to show the clickable link
        await interaction.editReply(`Now playing: **[${title}](${url})** 🎵`);
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
 * Setup interaction handlers for slash commands
 */
export function setupCommandHandlers(client: Client): void {
    client.on("interactionCreate", async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        switch (interaction.commandName) {
            case "say":
                await handleSayCommand(interaction);
                break;
            case "play":
                await handlePlayCommand(interaction);
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

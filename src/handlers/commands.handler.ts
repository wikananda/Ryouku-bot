import { Client, CommandInteraction, GuildMember } from "discord.js";
import { createAudioFileFromText } from "../services/tts.service";
import {
    playAudioText,
    connectToVoiceChannel,
    disconnectFromVoiceChannel,
} from "../services/voice.service";
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
            case "connect":
                await handleConnectCommand(interaction);
                break;
            case "dc":
                await handleDisconnectCommand(interaction);
                break;
        }
    });
}

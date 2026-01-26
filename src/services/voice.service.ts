import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    VoiceConnectionStatus,
    getVoiceConnection,
} from "@discordjs/voice";
import { CommandInteraction, Message, GuildMember } from "discord.js";
import { AudioSource } from "../types";
import {
    getVoiceChannelFromSource,
    VOICE_CHANNEL_REQUIRED_MESSAGE,
} from "../utils/validation.utils";

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

    const player = createAudioPlayer();
    const resource = createAudioResource(audioFileName, {
        inlineVolume: true,
    });

    // Set up event listeners
    connection.on(VoiceConnectionStatus.Ready, () => {
        console.log("Connection ready, playing audio...");
        player.play(resource);
    });

    player.on("stateChange", (oldState, newState) => {
        console.log(
            `Audio player transitioned from ${oldState.status} to ${newState.status}`,
        );
    });

    player.on("error", (error) => {
        console.error("Audio player error:", error.message, error);
    });

    connection.subscribe(player);

    // Fallback play if connection is already ready
    if (connection.state.status === VoiceConnectionStatus.Ready) {
        player.play(resource);
    }

    // Send reply
    if (source instanceof Message) {
        await source.reply("Speaking...");
    } else {
        await source.editReply("Speaking...");
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

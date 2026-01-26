import { GuildMember, VoiceBasedChannel } from "discord.js";
import { AudioSource } from "../types";

/**
 * Type guard to check if a member is a GuildMember
 */
export function isGuildMember(member: unknown): member is GuildMember {
    return member instanceof GuildMember;
}

/**
 * Get voice channel from member with validation
 */
export function getVoiceChannelFromSource(
    source: AudioSource,
): VoiceBasedChannel | null {
    const member = source.member;

    if (!member || !isGuildMember(member)) {
        return null;
    }

    return member.voice.channel;
}

/**
 * Get error message for missing voice channel
 */
export const VOICE_CHANNEL_REQUIRED_MESSAGE =
    "You need to be in a voice channel to use this command.";

/**
 * Get error message for audio generation failure
 */
export const AUDIO_GENERATION_ERROR_MESSAGE =
    "An error occurred while generating or playing the audio.";

import { Client, GuildMember } from "discord.js";
import { generateAIChatText } from "../services/ai-chat.service";
import { createAudioFileFromText } from "../services/tts.service";
import { playAudioText } from "../services/voice.service";
import { removeMentionFromMessage } from "../utils/string.utils";

/**
 * Setup message handlers for bot mentions and chat
 */
export function setupMessageHandlers(client: Client): void {
    client.on("messageCreate", async (message) => {
        if (!client.user?.id || message.author.bot) return;

        // Check if bot is mentioned
        if (message.mentions.has(client.user.id)) {
            console.log(`[Message] Bot mentioned by ${message.author.username}`);

            if (!message.content) return;

            const userMessage = removeMentionFromMessage(
                message.content,
                client.user.id,
            );

            try {
                // Generate AI response
                const response = await generateAIChatText(
                    userMessage,
                    message.channel.id,
                    client,
                );

                // Send text response
                await message.reply(response);

                // If user is in a voice channel, speak the response too
                if (message.member instanceof GuildMember && message.member.voice.channel) {
                    try {
                        console.log(`[Message] Attempting voice response for ${message.author.username}`);
                        const audioFileName = await createAudioFileFromText(response);
                        await playAudioText(message, audioFileName, response);
                    } catch (voiceError) {
                        console.error("[Message] Error in voice response:", voiceError);
                    }
                }
            } catch (error) {
                console.error("[Message] Error generating AI chat response:", error);
                await message.reply("Maaf, ada masalah pas Ryouku mau jawab... 😔");
            }
        }
    });
}

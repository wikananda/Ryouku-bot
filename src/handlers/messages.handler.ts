import { Client } from "discord.js";
import { generateAIChatText } from "../services/ai-chat.service";
import { removeMentionFromMessage } from "../utils/string.utils";

/**
 * Setup message handlers for bot mentions and chat
 */
export function setupMessageHandlers(client: Client): void {
    client.on("messageCreate", async (message) => {
        if (!client.user?.id) return;

        console.log("Message received:", message.content);

        // Check if bot is mentioned
        if (message.mentions.has(client.user.id)) {
            console.log("Bot mentioned!");

            if (!message.content) return;

            const userMessage = removeMentionFromMessage(
                message.content,
                client.user.id,
            );

            try {
                const response = await generateAIChatText(
                    userMessage,
                    message.channel.id,
                    client,
                );
                await message.channel.send(response);
            } catch (error) {
                console.error("Error generating AI chat response:", error);
            }
        }
    });
}

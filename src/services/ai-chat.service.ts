import Groq from "groq-sdk";
import { Client } from "discord.js";
import {
    GROQ_API_KEY,
    GROQ_MODEL,
    GROQ_TEMPERATURE,
    GROQ_MAX_TOKENS,
    GROQ_TOP_P,
    MAX_HISTORY_LENGTH,
    RYOUKU_PERSONALITY,
} from "../config/constants";
import { ChatMessage } from "../types";
import { cleanAIResponse, removeMentionFromMessage } from "../utils/string.utils";

// Initialize Groq client
const aichat = new Groq({ apiKey: GROQ_API_KEY });

// Conversation history storage
const conversationHistory = new Map<string, ChatMessage[]>();

/**
 * Fetch message history from Discord channel
 */
async function fetchChannelHistory(
    client: Client,
    channelId: string,
    currentMessage: string,
): Promise<ChatMessage[]> {
    const history: ChatMessage[] = [
        {
            role: "system",
            content: RYOUKU_PERSONALITY,
        },
    ];

    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) {
            return history;
        }

        const messages = await channel.messages.fetch({
            limit: MAX_HISTORY_LENGTH,
        });

        messages.reverse().forEach((msg) => {
            // Skip the current message
            if (msg.content.trim() === currentMessage.trim()) {
                return;
            }

            if (msg.author.id === client.user?.id) {
                history.push({
                    role: "assistant",
                    content: msg.content,
                });
            } else {
                history.push({
                    role: "user",
                    content: removeMentionFromMessage(
                        msg.content,
                        client.user?.id || "",
                    ),
                });
            }
        });
    } catch (error) {
        console.error("Error fetching message history:", error);
    }

    return history;
}

/**
 * Trim conversation history to maintain max length
 */
function trimHistory(history: ChatMessage[]): void {
    if (history.length <= MAX_HISTORY_LENGTH) {
        return;
    }

    const systemMessage = history[0];
    history.splice(1, history.length - MAX_HISTORY_LENGTH);
    history.unshift(systemMessage);
}

/**
 * Generate AI chat response using Groq
 */
export async function generateAIChatText(
    text: string,
    channelId: string,
    client: Client,
): Promise<string> {
    // Initialize conversation history if needed
    if (!conversationHistory.has(channelId)) {
        const initialHistory = await fetchChannelHistory(
            client,
            channelId,
            text,
        );
        conversationHistory.set(channelId, initialHistory);
    }

    const history = conversationHistory.get(channelId)!;

    // Add user message to history
    history.push({
        role: "user",
        content: text,
    });

    // Trim history if needed
    trimHistory(history);

    // Generate AI response
    const response = await aichat.chat.completions.create({
        messages: history,
        model: GROQ_MODEL,
        temperature: GROQ_TEMPERATURE,
        max_tokens: GROQ_MAX_TOKENS,
        top_p: GROQ_TOP_P,
        stop: null,
    });

    console.log("Conversation history:", history);

    let cleanedContent: string | null = null;

    // Process and add AI's response to history
    if (response.choices[0]?.message?.content) {
        const rawContent = response.choices[0].message.content;
        console.log("Raw AI response:", rawContent);

        cleanedContent = cleanAIResponse(rawContent);

        history.push({
            role: "assistant",
            content: cleanedContent,
        });
    }

    return cleanedContent || "Unable to generate response";
}

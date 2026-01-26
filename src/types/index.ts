import { CommandInteraction, Message } from "discord.js";

export type ChatMessage = {
    role: "system" | "user" | "assistant";
    content: string;
};

export type AudioSource = CommandInteraction | Message;

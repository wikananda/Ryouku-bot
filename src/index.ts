import { Client, GatewayIntentBits } from "discord.js";
import { DISCORD_TOKEN } from "./config/constants";
import { setupCommandHandlers } from "./handlers/commands.handler";
import { setupMessageHandlers } from "./handlers/messages.handler";
import { commands } from "./commands";

// Initialize Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Setup event handlers
setupCommandHandlers(client);
setupMessageHandlers(client);

// Register commands when client is ready
client.once("ready", async (c) => {
    console.log(`[Bot] Logged in as ${c.user.tag}!`);

    if (!client.application) {
        console.error("[Bot] Client application is not available");
        return;
    }

    try {
        console.log("[Bot] Registering slash commands...");
        await client.application.commands.set(commands);
        console.log("[Bot] Successfully registered slash commands");
    } catch (error) {
        console.error("[Bot] Error registering commands:", error);
    }
});

// Login to Discord
client.login(DISCORD_TOKEN).catch((err) => {
    console.error("[Bot] Login failed:", err);
});

// Export client for use in services if needed
export { client };

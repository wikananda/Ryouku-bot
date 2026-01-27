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
client.once("clientReady", async () => {
    if (!client.application) {
        console.error("Client application is not available");
        return;
    }

    try {
        await client.application.commands.fetch();
        await client.application.commands.set(commands);
        console.log("Successfully registered guild commands");
    } catch (error) {
        console.error("Error registering commands:", error);
    }
});

// Login to Discord
client.login(DISCORD_TOKEN);

// Export client for use in services if needed
export { client };

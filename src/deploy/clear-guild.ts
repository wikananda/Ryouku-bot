import { REST, Routes } from "discord.js";
import { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } from "../config/constants";

if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID) {
    throw new Error("Missing env vars (DISCORD_TOKEN, CLIENT_ID, or GUILD_ID)");
}

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

(async () => {
    try {
        console.log(`🧹 Clearing GUILD commands for guild: ${GUILD_ID}...`);

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: [] }
        );

        console.log("✅ Guild commands cleared");
    } catch (err) {
        console.error("❌ Failed to clear guild commands", err);
    }
})();

import { REST, Routes } from "discord.js";
import { DISCORD_TOKEN, CLIENT_ID } from "../config/constants";

if (!DISCORD_TOKEN || !CLIENT_ID) {
    throw new Error("Missing env vars");
}

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

(async () => {
    try {
        console.log("🧹 Clearing GLOBAL commands...");

        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: [] }
        );

        console.log("✅ Global commands cleared");
    } catch (err) {
        console.error("❌ Failed to clear global commands", err);
    }
})();

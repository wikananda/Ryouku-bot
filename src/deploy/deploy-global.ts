import { REST, Routes } from "discord.js";
import { commands } from "../commands/index";
import { DISCORD_TOKEN, CLIENT_ID } from "../config/constants";

if (!DISCORD_TOKEN || !CLIENT_ID) {
    throw new Error("Missing env vars");
}

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

(async () => {
    try {
        console.log("🚀 Deploying GLOBAL commands...");
        console.log("⚠️ This may take up to 1 hour to propagate");

        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );

        console.log("✅ Global commands deployed");
    } catch (err) {
        console.error("❌ Failed to deploy global commands", err);
    }
})();

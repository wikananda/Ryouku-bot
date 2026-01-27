import { REST, Routes } from "discord.js";
import { commands } from "../commands/index";
import { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } from "../config/constants";

if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID) {
    throw new Error("Missing env vars");
}

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

(async () => {
    try {
        console.log("🔁 Deploying GUILD commands...");

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );

        console.log("✅ Guild commands deployed");
    } catch (err) {
        console.error("❌ Failed to deploy guild commands", err);
    }
})();

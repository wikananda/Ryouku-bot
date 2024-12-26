import { REST, Routes, ApplicationCommandData } from 'discord.js';
import * as dotenv from 'dotenv';

dotenv.config();

// Add token validation
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!DISCORD_TOKEN) {
    throw new Error('DISCORD_TOKEN is missing in environment variables');
}

if (!CLIENT_ID) {
    throw new Error('CLIENT_ID is missing in environment variables');
}

if (!GUILD_ID) {
    throw new Error('GUILD_ID is missing in environment variables');
}

export const commands: ApplicationCommandData[] = [
    {
        name: 'say',
        description: 'Convert text to speech and play it in voice channel',
        options: [{
            name: 'text',
            type: 3, // STRING type
            description: 'The text to convert to speech',
            required: true
        }]
    },
    {
        name: 'connect',
        description: 'Connect to a voice channel',
    },
    {
        name: 'dc',
        description: 'Disconnect from a voice channel',
    }
];

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

async function deployCommands() {
    try {
        console.log('Started refreshing application (/) commands.');

        // await rest.put(
        //     Routes.applicationCommands(CLIENT_ID!),
        //     { body: commands },
        // )

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID!, GUILD_ID!),
            { body: commands },
        )

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
}

deployCommands();

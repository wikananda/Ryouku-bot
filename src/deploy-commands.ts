import { REST, Routes, ApplicationCommandData } from 'discord.js';
import { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } from './config/constants';

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

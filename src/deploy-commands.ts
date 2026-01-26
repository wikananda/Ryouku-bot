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
        name: 'play',
        description: 'Play audio from YouTube in voice channel',
        options: [{
            name: 'url',
            type: 3, // STRING type
            description: 'YouTube URL to play',
            required: true
        }]
    },
    {
        name: 'queue',
        description: 'Show the current music queue',
    },
    {
        name: 'skip',
        description: 'Skip the current song',
    },
    {
        name: 'remove',
        description: 'Remove a song from the queue',
        options: [{
            name: 'index',
            type: 4, // INTEGER type
            description: 'Position of the song to remove (1, 2, 3...)',
            required: true
        }]
    },
    {
        name: 'stop',
        description: 'Stop playback and clear the queue',
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

if (!DISCORD_TOKEN) {
    console.error('DISCORD_TOKEN is not set in environment variables');
    process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

async function deployCommands() {
    try {
        console.log('Started refreshing application (/) commands.');

        // await rest.put(
        //     Routes.applicationCommands(CLIENT_ID!),
        //     { body: commands },
        // )

        if (!GUILD_ID) {
            console.error('GUILD_ID is not set in environment variables');
            return;
        }

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID!, GUILD_ID),
            { body: commands },
        )

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
}

deployCommands();

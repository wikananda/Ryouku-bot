import { 
    Client,
    GatewayIntentBits,
    CommandInteraction,
    Message, 
    GuildMember, 
} from 'discord.js';

import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    VoiceConnectionStatus,
    getVoiceConnection
} from '@discordjs/voice';

import { v4 as uuid } from "uuid";
import * as dotenv from 'dotenv';
import { ElevenLabsClient } from "elevenlabs";
import { createWriteStream } from 'fs';
import Groq from "groq-sdk";
import { commands } from "./deploy-commands";

// CONFIGS
dotenv.config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!ELEVENLABS_API_KEY)
{
    throw new Error("Missing ELEVENLABS_API_KEY in environment variables");
}
else if (!DISCORD_TOKEN)
{
    throw new Error("Missing DISCORD_TOKEN in environment variables");
}

const ttsClient = new ElevenLabsClient({
    apiKey: ELEVENLABS_API_KEY,
});

// GROQ SETUP
const aichat = new Groq({ apiKey: process.env.GROQ_API_KEY });

// DISCORD SETUP
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
});

// GET INTERACTION
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'say') {
        const text = interaction.options.getString('text', true);
        
        // Type guard to ensure member is GuildMember
        if (!interaction.member || !(interaction.member instanceof GuildMember)) {
            await interaction.reply("You need to be in a voice channel to use this command.");
            return;
        }

        try {
            await interaction.deferReply();
            
            // Removed timeout, just get the audio file directly
            const audioFileName = await createAudioFileFromText(text);
            playAudioText(interaction, audioFileName, text);

        } catch (error) {
            console.error(error);
            await interaction.reply("An error occurred while generating or playing the audio.");
        }
    } else if (interaction.commandName === 'connect') {
        await connectToVoiceChannel(interaction);
    } else if (interaction.commandName === 'dc') {
        await disconnectFromVoiceChannel(interaction);
    }
});

client.on('messageCreate', async (message) => {
    if (!client.user?.id) return;

    console.log('Message received:', message.content);

    if (message.mentions.has(client.user?.id)) {
        console.log("Bot mentioned!");

        if (!message.content) return;
        const userMessage = message.content.replace(`<@${client.user?.id}>`, '').trim();

        try {
            const response = await generateAIChatText(userMessage);
            const audioFileName = await createAudioFileFromText(response);
            playAudioText(message, audioFileName, response);
            await message.channel.send(response);
        } catch (error) {
            console.error('Error generating AI chat response:', error);
        }
    }
});

// Wait for client to be ready before registering commands
client.once('ready', async () => {
    if (!client.application) {
        console.error('Client application is not available');
        return;
    }

    try {
        await client.application.commands.fetch();
        await client.application.commands.set(commands);
        console.log('Successfully registered guild command');
    } catch (error) {
        console.error('Error registering command:', error);
    }
});

client.login(DISCORD_TOKEN);


// COMMANDS FUNCTIONS
export const createAudioFileFromText = async (
    text: string
): Promise<string> => {
    return new Promise<string>(async (resolve, reject) => {
        try {
            const audio = await ttsClient.generate({
                voice: "Kira",
                model_id: "eleven_flash_v2_5",
                text,
            });
            const fileName = `audio.mp3`;
            const fileStream = createWriteStream(fileName);

            audio.pipe(fileStream);
            fileStream.on("finish", () => resolve(fileName));
            fileStream.on("error", reject);
        } catch (error) {
            reject(error);
        }
    });
};

async function playAudioText(
    source: CommandInteraction | Message, 
    audioFileName: string,
    text: string
) {
    // Get the member differently based on the source type
    const member = source instanceof Message ? source.member : source.member;
    
    if (!member || !(member instanceof GuildMember)) {
        const reply = source instanceof Message ? 
            source.reply.bind(source) : 
            source.editReply.bind(source);
            
        await reply('You need to be in a voice channel to use this command.');
        return;
    }

    const voiceChannel = member.voice.channel;
    
    if (!voiceChannel) {
        const reply = source instanceof Message ? 
            source.reply.bind(source) : 
            source.editReply.bind(source);
            
        await reply("You need to be in a voice channel to use this command.");
        return;
    }

    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator
    });

    const player = createAudioPlayer();
    const resource = createAudioResource(audioFileName);

    player.on('error', error => {
        console.error('Error:', error.message);
    });

    connection.subscribe(player);
    
    // Handle the reply differently based on source type
    if (source instanceof Message) {
        await source.reply('Speaking...');
    } else {
        await source.editReply('Speaking...');
    }
    
    player.play(resource);
}

async function connectToVoiceChannel(interaction: CommandInteraction) {
    // Type guard to ensure member is GuildMember
    if (!interaction.member || !(interaction.member instanceof GuildMember)) {
        await interaction.reply('You need to be in a voice channel to use this command.');
        return;
    }

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel || !interaction.guildId) {
        await interaction.reply('You need to be in a voice channel to use this command.');
        return;
    }
    
    // First, send a reply
    await interaction.reply('Connecting to voice channel...');

    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guildId,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    connection.on(VoiceConnectionStatus.Ready, () => {
        console.log('The bot has connected to the channel!');
    });

    connection.on(VoiceConnectionStatus.Disconnected, () => {
        console.log('The bot has disconnected from the channel.');
    })

    // await interaction.deleteReply();
}

async function disconnectFromVoiceChannel(interaction: CommandInteraction) {
    if (!interaction.guildId || !interaction.guild) {
        await interaction.reply('This command can only be used in server')
        return;
    }

    const connection = getVoiceConnection(interaction.guildId);
    if (connection) {
        connection.destroy();
        await interaction.reply('Disconnected from the voice channel');
    } else {
        await interaction.reply('Not connected to a voice channel');
    }
}

const ryoukuPersonality = `Answer questions clearly and concisely without expressing emotions or using role-playing text like "*smile*."
You don't speak formally, more chill and casual.
You are a cheerful girl named Ryouku, Indonesian, 22 years old,
loves music and movies, you like indie music and classical music.
You often sulking by small teasing, but never take it seriously, likes to joke, caring, and helpful.`;

export const generateAIChatText = async (text: string) =>  {
    const response = await aichat.chat.completions.create({
        messages: [
            {
                role: "system",
                content: ryoukuPersonality,
            },
            {
                role: "user",
                content: text,
            },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 1.5,
        max_tokens: 1024,
        top_p: 1,
        stop: null,
    });
    return response.choices[0]?.message?.content || "Unable to generate response";
};
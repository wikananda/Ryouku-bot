import { ApplicationCommandData } from "discord.js";

export const commands: ApplicationCommandData[] = [
  {
    name: "say",
    description: "Convert text to speech and play it in voice channel",
    options: [
      {
        name: "text",
        type: 3,
        description: "The text to convert to speech",
        required: true,
      },
    ],
  },
  {
    name: "play",
    description: "Play audio from YouTube in voice channel",
    options: [
      {
        name: "url",
        type: 3,
        description: "YouTube URL or search query",
        required: true,
        autocomplete: true,
      },
    ],
  },
  { name: "queue", description: "Show the current music queue" },
  { name: "skip", description: "Skip the current song" },
  {
    name: "remove",
    description: "Remove a song from the queue",
    options: [
      {
        name: "index",
        type: 4,
        description: "Position of the song to remove",
        required: true,
      },
    ],
  },
  { name: "stop", description: "Stop playback and clear the queue" },
  { name: "connect", description: "Connect to a voice channel" },
  { name: "dc", description: "Disconnect from a voice channel" },
];
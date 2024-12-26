import { createAudioFileFromText } from "./index";

const testAudioFile = async(text: string) => {
    try {
        const audioBuffer = await createAudioFileFromText(text);
        console.log(`Audio stream generated successfully for text: ${text}`, audioBuffer);
    } catch (error) {
        console.error(`Error generating audio file for text: ${text}`, error);
    }
};

testAudioFile(process.argv[2] || "Hello world, this is a text-to-speech test")
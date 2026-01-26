/**
 * Decode HTML entities in text
 */
export function decodeHTMLEntities(text: string): string {
    return text.replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

/**
 * Clean AI response by removing think tags and decoding HTML entities
 */
export function cleanAIResponse(rawContent: string): string {
    const decodedContent = decodeHTMLEntities(rawContent);
    return decodedContent
        .replace(/\s*<think[^>]*>[\s\S]*?<\/think>\s*/gi, "")
        .trim();
}

/**
 * Remove bot mention from Discord message
 */
export function removeMentionFromMessage(
    message: string,
    botUserId: string,
): string {
    return message.replace(`<@${botUserId}>`, "").trim();
}

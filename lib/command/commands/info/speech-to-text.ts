import {proto, WASocket} from "@adiwajshing/baileys";
import {Configuration, OpenAIApi} from "openai";
import {BlockedReason} from "../../../blockable";
import {Chat, ChatLevel} from "../../../chats";
import {messagingService} from "../../../constants/services";
import Message from "../../../message/message";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";
import {spawn} from "child_process";

/**
 * DEVELOPER NOTE:
 * In order for this command to work you must have SpeechRecognition and pydub installed from pip as global packages!
 */
export default class SpeechToTextCommand extends Command {
    constructor() {
        super({
            triggers: ["speech to text", "stt", "תמלול"].map((e) => new CommandTrigger(e)),
            usage: "{prefix}{command}",
            category: "Info",
            description: "Speech to text",
            extendedDescription: "תמלול הודעה קולית",
            cooldowns: new Map([
                [ChatLevel.Free, 30 * 1000],
                [ChatLevel.Premium, 20 * 1000],
                [ChatLevel.Sponser, 10 * 1000],
            ]),
        });
    }

    async execute(client: WASocket, chat: Chat, message: Message, body?: string) {
        const quoted = await message.getQuoted();
        if (!quoted) {
            return await messagingService.reply(message, "Please reply to a message you want to speech to text", true);
        }

        const mediaType = quoted.mediaType;
        if (mediaType !== "audio") {
            return await messagingService.reply(message, "Please reply to an audio message", true);
        }

        const audioPath = quoted.mediaPath;
        if (!audioPath) {
            return await messagingService.reply(
                message,
                "Please reply to an audio message\nMaybe try sending the audio again.",
                true,
            );
        }

        await messagingService.reply(message, "Processing...", true);
        const pythonProcess = spawn("python", [
            "./src/command/commands/info/speech-to-text.py",
            audioPath,
            message.raw?.key.remoteJid ?? "jid",
            message.sender ?? "sender",
        ]);

        pythonProcess.stdout.on("data", async (data) => {
            const text = data.toString();
            await messagingService.reply(message, `*SPEECH-TO-TEXT:*\n${text}`, true);
            pythonProcess.disconnect()
        });
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}

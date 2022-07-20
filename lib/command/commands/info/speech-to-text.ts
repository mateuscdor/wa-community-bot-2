import {proto, WASocket} from "@adiwajshing/baileys";
import {Configuration, OpenAIApi} from "openai";
import {BlockedReason} from "../../../blockable";
import {Chat, ChatLevel} from "../../../chats";
import {messagingService} from "../../../constants/services";
import Message from "../../../message/message";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";
import {spawn} from "child_process";
import path from "path";
import {TextDecoder} from "util";
import languages from "../../../constants/language.json";

/**
 * DEVELOPER NOTE:
 * In order for this command to work you must have SpeechRecognition and pydub installed from pip as global packages!
 */
export default class SpeechToTextCommand extends Command {
    private language: typeof languages.commands.speech_to_text[Language];

    constructor(language: Language) {
        const langs = languages.commands.speech_to_text;
        const lang = langs[language];
        super({
            triggers: langs.triggers.map((e) => new CommandTrigger(e)),
            announcedAliases: lang.triggers,
            usage: lang.usage,
            category: lang.category,
            description: lang.description,
            extendedDescription: lang.extended_description,
        });

        this.language = lang;
    }

    async execute(client: WASocket, chat: Chat, message: Message, body?: string) {
        const quoted = await message.getQuoted();
        if (!quoted) {
            return await messagingService.reply(message, this.language.execution.no_reply, true);
        }

        const mediaType = quoted.mediaType;
        if (mediaType !== "audio") {
            return await messagingService.reply(message, this.language.execution.no_audio, true);
        }

        const audioPath = quoted.mediaPath;
        if (!audioPath) {
            return await messagingService.reply(message, this.language.execution.no_audio_in_storage, true);
        }

        await messagingService.reply(message, this.language.execution.started, true);
        const pythonProcess = spawn("python", [
            path.resolve(__dirname, "../../../../lib/scripts/speech-to-text.py"),
            path.resolve(audioPath),
            message.raw?.key.remoteJid ?? "jid",
            message.id,
            body?.trim()?.split(" ")[0] || "he",
        ]);

        pythonProcess.stdout.on("data", async (data) => {
            const text = new TextDecoder("utf-8").decode(data);
            await messagingService.reply(message, this.language.execution.success_message, true, {
                placeholder: {
                    custom: new Map([["text", text]]),
                },
            });
        });
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}

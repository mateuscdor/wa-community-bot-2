import {WASocket} from "@adiwajshing/baileys";
import {BlockedReason} from "../../../../blockable";
import {Chat} from "../../../../chats";
import {chatRepository, messagingService} from "../../../../constants/services";
import {Message} from "../../../../message";
import {GroupLevel} from "../../../../models";
import CommandTrigger from "../../../command_trigger";
import InteractableCommand from "../../../interactable_command";
import languages from "../../../../constants/language.json";

export default class LanguageCommand extends InteractableCommand {
    constructor() {
        super({
            triggers: ["language", "שפה"].map((e) => new CommandTrigger(e)),
            usage: "{prefix}{command}",
            category: "Language",
            groupLevel: GroupLevel.Admin,
            description: "Change language. החלפת שפה.",
        });
    }

    async execute(client: WASocket, chat: Chat, message: Message, body?: string) {
        const availableLanguages = languages.languages;

        if (!body || !availableLanguages.some((e) => body.trim().startsWith(e))) {
            return await messagingService.reply(
                message,
                availableLanguages.map((e) => `{prefix}{command} ${e}`).join("\n"),
                true,
                {
                    placeholderData: {command: this, chat, message},
                },
            );
        }

        const language = body.trim().split(" ")[0];
        await chatRepository.update(chat.model.jid, {$set: {language}});
        const newChat = await chatRepository.get(chat.model.jid, true);
        const lang = languages.language_changed[newChat?.model.language ?? "english"];
        return await messagingService.reply(message, lang, true);
    }

    async onBlocked(data: Message, blockedReason: BlockedReason) {
        if (blockedReason === BlockedReason.InsufficientGroupLevel) {
            await messagingService.reply(
                data,
                "Ask an admin to change the language for ths chat.\nתבקש מאדמין לשנות את השפה בקבוצה הזו.",
                true,
            );
        }
        return "";
    }
}

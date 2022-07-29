import {jidDecode, WASocket} from "@adiwajshing/baileys";
import Sticker, {StickerTypes} from "wa-sticker-formatter/dist";
import moment from "moment";
import {Command, CommandTrigger} from "../../..";
import languages from "../../../../constants/language.json";
import {Message} from "../../../../message";
import {Chat} from "../../../../chats";
import {BlockedReason} from "../../../../blockable";

export default class StickerCommand extends Command {
    private language: typeof languages.commands.sticker[Language];

    constructor(language: Language) {
        const langs = languages.commands.sticker;
        const lang = langs[language];
        super({
            triggers: langs.triggers.map((e) => new CommandTrigger(e)),
            announcedAliases: lang.triggers,
            usage: lang.usage,
            category: lang.category,
            description: lang.description,
        });

        this.language = lang;
    }

    async execute(client: WASocket, chat: Chat, message: Message, body?: string) {
        
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}

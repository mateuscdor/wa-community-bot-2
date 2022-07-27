import EconomyCommand from "../../economy_command";
import languages from "../../../constants/language.json";
import {BlockedReason} from "../../../blockable";
import {Message} from "../../../message";
import {WASocket} from "@adiwajshing/baileys";
import CommandTrigger from "../../command_trigger";
import {Chat, ChatLevel} from "../../../chats";

export default class StealCommand extends EconomyCommand {
    private language: typeof languages.commands.steal[Language];
    private langCode: Language;

    constructor(language: Language) {
        const langs = languages.commands.steal;
        const lang = langs[language];
        super({
            triggers: langs.triggers.map((e) => new CommandTrigger(e)),
            announcedAliases: lang.triggers,
            category: lang.category,
            description: lang.description,
            usage: lang.usage,
            cooldowns: new Map([
                [ChatLevel.Free, 20 * 60 * 1000],
                [ChatLevel.Premium, 15 * 60 * 1000],
                [ChatLevel.Sponsor, 10 * 60 * 1000],
            ]),
        });

        this.language = lang;
        this.langCode = language;
    }

    async execute(client: WASocket, chat: Chat, message: Message, body: string, ...args: string[]) {}

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}

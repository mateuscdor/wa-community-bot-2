import {jidDecode, WASocket} from "@adiwajshing/baileys";
import {CommandTrigger, EconomyCommand} from "../..";
import {BlockedReason} from "../../../blockable";
import {Chat} from "../../../chats";
import {messagingService, userRepository} from "../../../constants/services";
import {Message} from "../../../message";
import {commas, formatNumberCommas} from "../../../utils/utils";
import languages from "../../../constants/language.json";

export default class BalanceCommand extends EconomyCommand {
    private language: typeof languages.commands.balance[Language];
    private langCode: Language;

    constructor(language: Language) {
        const langs = languages.commands.balance;
        const lang = langs[language];
        super({
            triggers: langs.triggers.map((e) => new CommandTrigger(e)),
            announcedAliases: lang.triggers,
            category: lang.category,
            description: lang.description,
            usage: lang.usage,
        });

        this.language = lang;
        this.langCode = language;
    }

    async execute(client: WASocket, chat: Chat, message: Message, body: string, ...args: string[]) {
        const mentions = message.mentions;
        const userJid = mentions.length > 0 ? mentions[0] : message.sender;
        if (!userJid) {
            return await messagingService.reply(message, this.language.execution.no_balance, true);
        }

        const balance = await this.getBalance(userJid);
        const user = await userRepository.get(userJid);
        if (!balance || !user) {
            return await messagingService.reply(message, this.language.execution.no_balance, true);
        }

        const walletText = `${commas(balance.wallet)}`;
        const bankText = `${commas(balance.bank)} / ${commas(user.model.bankCapacity)} (${(
            (balance.bank / user.model.bankCapacity) *
            100
        ).toFixed(1)}%)`;
        const netText = `${commas(await user.calculateNetBalance())}`;

        const reply = `${this.language.execution.title}\n\n*${
            languages.economy.wallet[this.langCode]
        }:* ${walletText}\n*${languages.economy.bank[this.langCode]}:* ${bankText}\n*${
            languages.economy.net[this.langCode]
        }:* ${netText}`;
        return await messagingService.replyAdvanced(message, {text: reply, mentions: [userJid]}, true, {
            placeholder: {
                custom: new Map([["tag", `@${jidDecode(userJid)?.user}`]]),
            },
        });
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}

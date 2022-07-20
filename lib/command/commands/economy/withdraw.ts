import {jidDecode, WASocket} from "@adiwajshing/baileys";
import {EconomyCommand} from "../..";
import {BlockedReason} from "../../../blockable";
import {Chat} from "../../../chats";
import {messagingService, userRepository} from "../../../constants/services";
import {DeveloperLevel} from "../../../database/models";
import {Balance} from "../../../economy";
import {Message} from "../../../message";
import {commas} from "../../../utils/utils";
import CommandTrigger from "../../command_trigger";
import {buildBalanceChangeMessage, extractNumbers} from "./utils";
import languages from "../../../constants/language.json";

export default class WithdrawCommand extends EconomyCommand {
    private language: typeof languages.commands.withdraw[Language];
    private langCode: Language;

    constructor(language: Language) {
        const langs = languages.commands.withdraw;
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
        // get number to deposit from first body argument\
        const userJid = message.sender;
        const user = await userRepository.get(userJid ?? "");
        if (!user || !userJid) {
            return await messagingService.reply(message, this.language.execution.no_balance, true);
        }

        const bankCapacity = user.model.bankCapacity;
        const balance = await this.getBalance(userJid);
        const net = (await user.calculateNetBalance()) ?? 0;
        if (!balance) {
            return await messagingService.reply(message, this.language.execution.no_balance, true);
        }

        const bankTotal = balance.bank;
        // if body starts with 'all' or 'max' then deposit max
        const withdrawAmount = ["all", "max"].some((e) => body.startsWith(e))
            ? bankTotal
            : Number(extractNumbers(body)[0] ?? "");
        if (withdrawAmount == 0) {
            return await messagingService.reply(message, this.language.execution.cant_withdraw, true);
        }
        if (!withdrawAmount) {
            return await messagingService.reply(message, this.language.execution.no_body, true, {
                placeholder: {
                    chat,
                },
            });
        }

        if (withdrawAmount > bankTotal || withdrawAmount < 0) {
            return await messagingService.reply(message, this.language.execution.too_much, true, {
                placeholder: {
                    chat,
                    custom: {
                        max: bankTotal.toString(),
                    },
                },
            });
        }

        const addBalance = new Balance(withdrawAmount, -withdrawAmount);
        const success = await this.addBalance(userJid, addBalance);
        if (!success) {
            return await messagingService.reply(message, this.language.execution.error, true, {
                placeholder: {
                    chat,
                },
            });
        }

        const currentBalance = (await this.getBalance(userJid))!;
        const currentNet = (await user.calculateNetBalance())!;
        const balChangeMessage = buildBalanceChangeMessage(
            balance,
            currentBalance,
            net,
            currentNet,
            this.langCode,
            user.model.bankCapacity,
        );
        const reply = `${languages.commands.balance[this.langCode].execution.title}\n\n${balChangeMessage}`;
        return await messagingService.replyAdvanced(message, {text: reply, mentions: [userJid]}, true, {
            placeholder: {
                custom: {
                    tag: `@${jidDecode(userJid).user}`,
                },
            },
        });
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}

import {jidDecode, WASocket} from "@adiwajshing/baileys";
import moment from "moment";
import {CommandTrigger, EconomyCommand} from "../..";
import {BlockedReason} from "../../../blockable";
import {Chat, ChatLevel} from "../../../chats";
import {messagingService, userRepository} from "../../../constants/services";
import {Balance} from "../../../economy";
import {Message} from "../../../message";
import {commas, formatNumberCommas} from "../../../utils/utils";
import languages from "../../../constants/language.json";

export default class HighlowCommand extends EconomyCommand {
    private language: typeof languages.commands.highlow[Language];

    constructor(language: Language) {
        const langs = languages.commands.highlow;
        const lang = langs[language];
        super({
            triggers: langs.triggers.map((e) => new CommandTrigger(e)),
            announcedAliases: lang.triggers,
            category: lang.category,
            description: lang.description,
            usage: lang.usage,
            cooldowns: new Map([
                [ChatLevel.Free, 30000],
                [ChatLevel.Premium, 15000],
                [ChatLevel.Sponser, 10000],
            ]),
        });

        this.language = lang;
    }

    async execute(client: WASocket, chat: Chat, message: Message, body: string, ...args: string[]) {
        const userJid = message.sender ?? "";
        const user = await userRepository.get(userJid);
        if (!user || !userJid) {
            return await messagingService.reply(message, this.language.execution.no_balance, true);
        }

        const rand = user.random;
        const secretNumber = rand.intBetween(1, 100);
        const higherLowerNumber = rand.intBetween(1, 100);
        const isHigher = secretNumber > higherLowerNumber;

        const optionsText = this.language.execution.options;
        const highlowMessage = `${this.language.execution.game_text}\n\n${optionsText}`;
        await messagingService.replyAdvanced(message, {text: highlowMessage, mentions: [userJid]}, true, {
            placeholder: {
                custom: {
                    number: higherLowerNumber.toString(),
                    tag: `@${jidDecode(userJid)?.user}`,
                },
            },
        });
        const highlowResult = await this.validatedWaitForInteractionWith(
            message,
            () => messagingService.reply(message, optionsText, true),
            "1",
            "2",
            "3",
        );

        const guess = highlowResult.content ?? "1";
        const isExact = secretNumber == higherLowerNumber;
        const correctGuessPrize = rand.intBetween(1000, 3000);
        const footer = this.language.execution.footer;
        const winText = `${this.language.execution.win_text}\n${footer}`;
        // TODO: add weighted random ranges

        const placeholder = {
            placeholder: {
                custom: {
                    number: higherLowerNumber.toString(),
                    secretNumber: secretNumber.toString(),
                    tag: `@${jidDecode(userJid)?.user}`,
                    prize: commas(correctGuessPrize),
                },
            },
        };
        if ((guess === "1" && isHigher) || (guess === "2" && !isHigher)) {
            await this.addBalance(userJid, new Balance(correctGuessPrize, 0));
            await messagingService.replyAdvanced(message, {text: winText, mentions: [userJid]}, true, placeholder);
            return;
        } else if (guess === "3" && isExact) {
            const jackpotPrize = rand.intBetween(150000, 300000);
            const reply = `${this.language.execution.jackpot_text}\n${footer}`;
            await this.addBalance(userJid, new Balance(jackpotPrize, 0));
            placeholder.placeholder.custom.prize = commas(jackpotPrize);
            await messagingService.replyAdvanced(message, {text: reply, mentions: [userJid]}, true, placeholder);
            return;
        }

        const lossText = `${this.language.execution.lose_text}\n${footer}`;
        await messagingService.replyAdvanced(message, {text: lossText, mentions: [userJid]}, true, placeholder);
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}

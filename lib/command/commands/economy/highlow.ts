import {WASocket} from "@adiwajshing/baileys";
import moment from "moment";
import {CommandTrigger, EconomyCommand} from "../..";
import {BlockedReason} from "../../../blockable";
import {Chat, ChatLevel} from "../../../chats";
import {messagingService, userRepository} from "../../../constants/services";
import {Balance} from "../../../economy";
import {Message} from "../../../message";
import {formatNumberCommas} from "../../../utils/utils";

export default class HighlowCommand extends EconomyCommand {
    constructor() {
        super({
            triggers: ["highlow", "hl", "גבוהה נמוך"].map((trigger) => new CommandTrigger(trigger)),
            category: "Economy",
            description: "Guess if the number is higher or lower, if you're right you get money!",
            extendedDescription: "תנחש אם המספר גבוהה או נמוך יותר, אם אתה צודק אתה מקבל כסף!",
            usage: "{prefix}{command}",
            cooldowns: new Map([
                [ChatLevel.Free, 30000],
                [ChatLevel.Premium, 15000],
                [ChatLevel.Sponser, 10000],
            ]),
        });
    }

    async execute(client: WASocket, chat: Chat, message: Message, body: string, ...args: string[]) {
        const userJid = message.sender ?? "";
        const user = await userRepository.get(userJid);
        if (!user || !userJid) {
            return await messagingService.reply(message, "You do not have a balance.", true);
        }

        const rand = user.random;
        const secretNumber = rand.intBetween(1, 100);
        const higherLowerNumber = rand.intBetween(1, 100);
        const isHigher = secretNumber > higherLowerNumber;

        const optionsText = `*1.* Higher (גבוהה יותר)\n*2.* Lower (נמוך יותר)\n*3.* JACKPOT! (בול פגיעה!)`;
        const highlowMessage = `*@${
            userJid.split("@")[0]
        }'s high-low game*\n\nI just chose a secret number between 1 and 100.\nIs the secret number higher or lower than ${higherLowerNumber}?\n\n${optionsText}`;
        await messagingService.replyAdvanced(message, {text: highlowMessage, mentions: [userJid]}, true);
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
        const footer = `Your hint was *${higherLowerNumber}*. The hidden number was *${secretNumber}*`;
        const winText = `*@${userJid.split("@")[0]} won high-low game*\n\n*You won ${formatNumberCommas(
            correctGuessPrize,
        )}*!\n${footer}`;

        if ((guess === "1" && isHigher) || (guess === "2" && !isHigher)) {
            await this.addBalance(userJid, new Balance(correctGuessPrize, 0));
            await messagingService.replyAdvanced(message, {text: winText, mentions: [userJid]}, true);
            return;
        } else if (guess === "3" && isExact) {
            const jackpotPrize = rand.intBetween(150000, 300000);
            const reply = `*@${userJid.split("@")[0]} WON HIGH-LOW GAME JACKPOT!*\n\n*You won ${formatNumberCommas(
                jackpotPrize,
            )}*!\n${footer}`;
            await this.addBalance(userJid, new Balance(jackpotPrize, 0));
            await messagingService.replyAdvanced(message, {text: reply, mentions: [userJid]}, true);
            return;
        }

        const lossText = `*@${userJid.split("@")[0]} lost high-low game*\n\n*You lost!*\n${footer}`;
        await messagingService.replyAdvanced(message, {text: lossText, mentions: [userJid]}, true);
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}

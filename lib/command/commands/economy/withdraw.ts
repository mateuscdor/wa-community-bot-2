import {WASocket} from "@adiwajshing/baileys";
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

export default class WithdrawCommand extends EconomyCommand {
    constructor() {
        super({
            triggers: ["withdraw", "משיכה"].map((trigger) => new CommandTrigger(trigger)),
            category: "Economy",
            description: "Withdraw money from the bank into your wallet.",
            extendedDescription: "משיכת כסף מהבנק לארנק",
            usage: "{prefix}{command} @mention",
        });
    }

    async execute(client: WASocket, chat: Chat, message: Message, body: string, ...args: string[]) {
        // get number to deposit from first body argument\
        const userJid = message.sender;
        const user = await userRepository.get(userJid ?? "");
        if (!user || !userJid) {
            return await messagingService.reply(message, "User does not have a balance.", true);
        }

        const bankCapacity = user.model.bankCapacity;
        const balance = await this.getBalance(userJid);
        const net = (await user.calculateNetBalance()) ?? 0;
        if (!balance) {
            return await messagingService.reply(message, "User does not have a balance.", true);
        }

        const bankTotal = balance.bank;
        // if body starts with 'all' or 'max' then deposit max
        const withdrawAmount = ["all", "max"].some((e) => body.startsWith(e))
            ? bankTotal
            : Number(extractNumbers(body)[0] ?? "");
        if (withdrawAmount == 0) {
            return await messagingService.reply(message, "You can't withdraw any coins\nאתה לא יכול למשוך אפילו אגורה חבר", true);
        }
        if (!withdrawAmount) {
            return await messagingService.reply(
                message,
                `How much do you want to withdraw?\nTry ${chat.commandHandler?.prefix}deposit <amount>`,
                true,
            );
        }

        if (withdrawAmount > bankTotal || withdrawAmount < 0) {
            const english = `You only have ${commas(
                bankTotal,
            )} in your bank right now. Can't withdraw more than that.`;
            const hebrew = `יש לך רק ${commas(bankTotal)} בבנק כרגע. אי אפשר למשוך יותר מזה.`;
            return await messagingService.reply(message, `${english}\n${hebrew}`, true);
        }

        const addBalance = new Balance(withdrawAmount, -withdrawAmount);
        const success = await this.addBalance(userJid, addBalance);
        if (!success) {
            return await messagingService.reply(
                message,
                `Failed to withdraw.\nIf this error persists please contact an admin using ${chat.commandHandler?.prefix}feature`,
                true,
            );
        }

        const currentBalance = (await this.getBalance(userJid))!;
        const currentNet = (await user.calculateNetBalance())!;
        const balChangeMessage = buildBalanceChangeMessage(
            balance,
            currentBalance,
            net,
            currentNet,
            user.model.bankCapacity,
        );
        const reply = `*@${userJid.split("@")[0]}'s balance*\n\n${balChangeMessage}`;
        return await messagingService.replyAdvanced(message, {text: reply, mentions: [userJid]}, true);
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}

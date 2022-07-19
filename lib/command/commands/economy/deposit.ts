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

export default class DepositCommand extends EconomyCommand {
    constructor() {
        super({
            triggers: ["deposit", "dep", "הפקד"].map((trigger) => new CommandTrigger(trigger)),
            category: "Economy",
            description: "Give balance to a user",
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

        const allowedDeposit = bankCapacity - balance.bank;
        console.log(`nums: ${extractNumbers(body)}`)
        // if body starts with 'all' or 'max' then deposit max
        const depositAmount = ["all", "max"].some((e) => body.startsWith(e))
            ? Math.min(allowedDeposit, balance.wallet)
            : Number(extractNumbers(body)[0] ?? "");
        if (!depositAmount) {
            return await messagingService.reply(
                message,
                `How much do you want to deposit?\nTry ${chat.commandHandler?.prefix}deposit <amount>`,
                true,
            );
        }

        if (depositAmount > allowedDeposit) {
            const english = `You can only hold ${commas(
                bankCapacity,
            )} in your bank right now. To hold more, buy more bank space!`;
            const hebrew = `כרגע אתה רק יכול להחזיק ${commas(bankCapacity)} כדי להחזיק יותר, תקנה עוד מקום!`;
            return await messagingService.reply(message, `${english}\n${hebrew}`, true);
        }

        const addBalance = new Balance(-depositAmount, depositAmount);
        const success = await this.addBalance(userJid, addBalance);
        if (!success) {
            return await messagingService.reply(
                message,
                `Failed to deposit.\nIf this error persists please contact an admin using ${chat.commandHandler?.prefix}feature`,
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

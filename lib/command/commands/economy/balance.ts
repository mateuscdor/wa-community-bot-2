import {WASocket} from "@adiwajshing/baileys";
import {CommandTrigger, EconomyCommand} from "../..";
import {BlockedReason} from "../../../blockable";
import {Chat} from "../../../chats";
import {messagingService, userRepository} from "../../../constants/services";
import {Message} from "../../../message";

export default class BalanceCommand extends EconomyCommand {
    constructor() {
        super({
            triggers: ["balance", "bal", "יתרה"].map((trigger) => new CommandTrigger(trigger)),
            category: "Economy",
            description: "Check your or someone elses balance.",
            extendedDescription: "מראה את היתרה שלך או של מישהו אחר.",
            usage: "{prefix}{command} @mention",
        });
    }

    async execute(client: WASocket, chat: Chat, message: Message, body: string, ...args: string[]) {
        const mentions = message.mentions;
        const userJid = mentions.length > 0 ? mentions[0] : message.sender;
        if (!userJid) {
            return await messagingService.reply(message, "Must provide a user to check their balance.", true);
        }

        const balance = await this.getBalance(userJid);
        const user = await userRepository.get(userJid);
        if (!balance || !user) {
            return await messagingService.reply(message, "User does not have a balance.", true);
        }

        const reply = `*@${userJid.split("@")[0]}'s balance*\n\n*Wallet:* ${balance.wallet}\n*Bank:* ${
            balance.bank
        }\n*Net:* ${await user.calculateNetBalance()}`;
        return await messagingService.reply(message, reply, true);
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}

import {WASocket} from "@adiwajshing/baileys";
import {CommandTrigger, EconomyCommand} from "../../..";
import {BlockedReason} from "../../../../blockable";
import {Chat} from "../../../../chats";
import {messagingService, userRepository} from "../../../../constants/services";
import {Message} from "../../../../message";
import {DeveloperLevel} from "../../../../database/models";
import {Balance} from "../../../../economy";
import {formatNumberCommas} from "../../../../utils/utils";

export default class GiveBalanceCommand extends EconomyCommand {
    constructor() {
        super({
            triggers: ["give balance", "give bal"].map((trigger) => new CommandTrigger(trigger)),
            category: "Economy",
            description: "Give balance to a user",
            usage: "{prefix}{command} @mention",
            developerLevel: DeveloperLevel.Operator,
        });
    }

    async execute(client: WASocket, chat: Chat, message: Message, body: string, ...args: string[]) {
        const mentions = message.mentions;
        const userJid = mentions.length > 0 ? mentions[0] : message.sender;
        if (!userJid) {
            return await messagingService.reply(message, "Must provide a user to check their balance.", true);
        }

        // extract number from body using regex
        const number = Number((body.replace("@" + userJid.split("@")[0], "").match(/(-\d+)|\d+/) ?? [])[0] ?? "");
        if (!number) {
            return await messagingService.reply(
                message,
                `Must provide an amount to give.\nTry ${chat.commandHandler?.prefix}give balance @mention <amount>`,
                true,
            );
        }

        const user = await userRepository.get(userJid);
        if (!user) {
            return await messagingService.reply(message, "User does not have a balance.", true);
        }

        const previousBalance = (await this.getBalance(userJid))!;
        const previousNet = await user.calculateNetBalance();
        const bankOrWallet = body.toLowerCase().includes("bank") ? "bank" : "wallet";

        const success = await this.addBalance(
            userJid,
            new Balance(bankOrWallet === "bank" ? 0 : number, bankOrWallet === "bank" ? number : 0),
        );
        if (!success) {
            return await messagingService.reply(message, "Failed to give balance.", true);
        }

        const currentBalance = (await this.getBalance(userJid))!;
        const currentNet = await user.calculateNetBalance();
        const netDiff = currentNet - previousNet;
        const walletDiff = currentBalance.wallet - previousBalance.wallet;
        const bankDiff = currentBalance.bank - previousBalance.bank;

        const walletText =
            "*Wallet:* " +
            (bankOrWallet === "bank"
                ? `${formatNumberCommas(currentBalance.wallet)}`
                : `${formatNumberCommas(previousBalance.wallet)} => ${formatNumberCommas(currentBalance.wallet)} (${
                      walletDiff > 0 ? "+" : ""
                  }${formatNumberCommas(walletDiff)})`);
        const bankText =
            "*Bank:* " +
            (bankOrWallet === "wallet"
                ? `${formatNumberCommas(currentBalance.bank)}`
                : `${formatNumberCommas(previousBalance.bank)} => ${formatNumberCommas(currentBalance.bank)} (${
                      bankDiff > 0 ? "+" : ""
                  }${formatNumberCommas(bankDiff)})`);

        const reply = `*@${userJid.split("@")[0]}'s balance*\n\n${walletText}\n${bankText}\n*Net:* ${formatNumberCommas(
            previousNet,
        )} => ${formatNumberCommas(currentNet)} (${netDiff > 0 ? "+" : ""}${formatNumberCommas(netDiff)})`;
        return await messagingService.replyAdvanced(message, {text: reply, mentions: [userJid]}, true);
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}

import {WASocket} from "@adiwajshing/baileys";
import moment from "moment";
import {CommandTrigger, EconomyCommand} from "../..";
import {BlockedReason} from "../../../blockable";
import {Chat} from "../../../chats";
import {messagingService, userRepository} from "../../../constants/services";
import {Balance} from "../../../economy";
import {Message} from "../../../message";
import {havePluralS} from "../../../utils/message_utils";

export default class DailyCommand extends EconomyCommand {
    constructor() {
        super({
            triggers: ["daily", "יומי"].map((trigger) => new CommandTrigger(trigger)),
            category: "Economy",
            description: "Get coins daily, build a streak and get more coins!",
            extendedDescription: "לקבל כמה מטבעות כל יום, תבנה סטריק ותקבל יותר מטבעות!",
            usage: "{prefix}{command}",
        });
    }

    async execute(client: WASocket, chat: Chat, message: Message, body: string, ...args: string[]) {
        const userJid = message.sender ?? "";
        const user = await userRepository.get(userJid);
        if (!user || !userJid) {
            return await messagingService.reply(message, "You do not have a balance.", true);
        }

        const dailyMeta =
            user.model.metadata.get("daily_meta") ??
            new Map([
                ["streak", 0],
                ["last_daily", 0],
            ]);
        let dailyStreak = dailyMeta.get("streak") as number;
        const lastDaily = moment.unix(dailyMeta.get("last_daily") as number);
        // allow only one daily per day - day resets at UTC midnight
        const timeTillUTCMidnight = moment.utc().startOf("day").diff(moment(), "seconds");
        // format timeTillUTCMidnight to hours minutes and seconds
        const timeTillUTCMidnightFormatted = moment.utc(timeTillUTCMidnight * 1000).format("H:mm:ss");
        if (lastDaily.isSame(moment(), "day")) {
            return await messagingService.reply(
                message,
                `*You've already claimed your daily reward today:*\n\nYour next daily is ready in:\n*${timeTillUTCMidnightFormatted}*`,
                true,
            );
        }

        const isStreakBroken = dailyStreak > 0 && lastDaily.isBefore(moment().subtract(1, "day"));
        const rand = user.random;
        const streakBonus = !isStreakBroken ? dailyStreak * rand.intBetween(500, 1000) : 0;
        const dailyCoins = rand.intBetween(2000, 30000) + streakBonus;
        await this.addBalance(userJid, new Balance(dailyCoins, 0));

        const dailyCoinsWithCommas = dailyCoins.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        const streakCoinsWithCommas = streakBonus.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        dailyStreak++;
        const reply = `@${
            userJid.split("@")[0] ?? "N/A"
        }'s Daily Coins\n\n*${dailyCoinsWithCommas}* was placed in your wallet!\n\nYour next daily is ready in:${timeTillUTCMidnightFormatted}\nStreak: ${dailyStreak} day${havePluralS(
            dailyStreak,
        )} (+${streakCoinsWithCommas})`;

        await userRepository.update(userJid, {
            $set: {"metadata.daily_meta.streak": dailyStreak, "metadata.daily_meta.last_daily": moment().unix()},
        });
        
        return await messagingService.replyAdvanced(message, {text: reply}, true);
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}

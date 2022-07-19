import {WASocket} from "@adiwajshing/baileys";
import moment from "moment";
import {CommandTrigger, EconomyCommand} from "../..";
import {BlockedReason} from "../../../blockable";
import {Chat} from "../../../chats";
import {messagingService, userRepository} from "../../../constants/services";
import {Balance} from "../../../economy";
import {Message} from "../../../message";
import {havePluralS} from "../../../utils/message_utils";
import {formatNumberCommas} from "../../../utils/utils";

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
            // if user is not in the database, we can't check if they have a balance
            return await messagingService.reply(message, "You do not have a balance.", true);
        }

        const dailyMeta = new Map(
            Object.entries(
                user.model.metadata.get("daily_meta") ?? {
                    streak: 0,
                    last_daily: 0,
                },
            ),
        );

        let dailyStreak = dailyMeta.get("streak") as number;
        const lastDaily = moment.unix(dailyMeta.get("last_daily") as number);
        const now = moment().utc(); // moment.utc() is used to make sure the time is in UTC since daily resets at UTC midnight

        // allow only one daily per day - day resets at UTC midnight
        // check the difference between now and the start of the day
        const timeTillUTCMidnight = now.startOf("day").diff(now, "seconds");
        const timeTillUTCMidnightMoment = moment.utc(timeTillUTCMidnight * 1000);
        const hoursTillMidnight = timeTillUTCMidnightMoment.hours();
        const minutesTillMidnight = timeTillUTCMidnightMoment.minutes();
        const secondsTillMidnight = timeTillUTCMidnightMoment.seconds();
        const timeTillUTCMidnightFormatted = `${
            hoursTillMidnight > 0 ? `${hoursTillMidnight} hour${havePluralS(hoursTillMidnight)}, ` : ""
        }${secondsTillMidnight <= 0 ? "and " : ""}${
            minutesTillMidnight > 0 ? `${minutesTillMidnight} minute${havePluralS(minutesTillMidnight)} ` : ""
        }${secondsTillMidnight > 0 ? `and ${secondsTillMidnight} second${havePluralS(secondsTillMidnight)}` : ""}`;

        if (lastDaily.utc().isSame(now, "day")) {
            return await messagingService.reply(
                message,
                `*You've already claimed your daily reward today:*\n\nYour next daily is ready in:\n*${timeTillUTCMidnightFormatted}*`,
                true,
            );
        }

        const isStreakBroken = dailyStreak > 0 && lastDaily.isBefore(moment(now).subtract(1, "day"));
        if (isStreakBroken) dailyStreak = 1;
        else dailyStreak++;

        const rand = user.random;
        const streakBonus = !isStreakBroken ? dailyStreak * rand.intBetween(500, 1000) : 0;
        const dailyCoins = rand.intBetween(2000, 30000) + streakBonus;
        await this.addBalance(userJid, new Balance(dailyCoins, 0));

        const dailyCoinsWithCommas = formatNumberCommas(dailyCoins);
        const streakCoinsWithCommas = formatNumberCommas(streakBonus);

        const reply = `@${
            userJid.split("@")[0] ?? "N/A"
        }'s Daily Coins\n\n*${dailyCoinsWithCommas}* was placed in your wallet!\n\nYour next daily is ready in: ${timeTillUTCMidnightFormatted}\nStreak: ${dailyStreak} day${havePluralS(
            dailyStreak,
        )} (+${streakCoinsWithCommas} coins)`;

        await userRepository.update(userJid, {
            $set: {"metadata.daily_meta.streak": dailyStreak, "metadata.daily_meta.last_daily": moment().unix()},
        });

        return await messagingService.replyAdvanced(message, {text: reply, mentions: [userJid]}, true);
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}

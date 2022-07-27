import {jidDecode, WASocket} from "@adiwajshing/baileys";
import moment from "moment";
import {CommandTrigger, EconomyCommand} from "../..";
import {BlockedReason} from "../../../blockable";
import {Chat} from "../../../chats";
import {messagingService, userRepository} from "../../../constants/services";
import {Balance} from "../../../economy";
import {Message} from "../../../message";
import {havePluralS, pluralForm} from "../../../utils/message_utils";
import {commas, formatNumberCommas} from "../../../utils/utils";
import languages from "../../../constants/language.json";
import {RandomSeed} from "random-seed";
import {weightedReward} from "./utils";

export default class DailyCommand extends EconomyCommand {
    private language: typeof languages.commands.daily[Language];
    private langCode: Language;

    constructor(language: Language) {
        const langs = languages.commands.daily;
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
        const userJid = message.sender ?? "";
        const user = await userRepository.get(userJid);
        if (!user || !userJid) {
            return await messagingService.reply(message, this.language.execution.no_balance, true);
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
        const lastDaily = moment.unix(dailyMeta.get("last_daily") as number).utc();
        // allow only one daily per day - day resets at UTC midnight
        const timeTillUTCMidnight = moment.utc().add(1, 'day').startOf("day").diff(moment().utc(), "seconds");
        // format timeTillUTCMidnight to x hour, x minutes and x seconds and if hour or minute is 0, remove it
        const timeTillUTCMidnightMoment = moment.unix(timeTillUTCMidnight).utc();
        const hours = timeTillUTCMidnightMoment.hours();
        const minutes = timeTillUTCMidnightMoment.minutes();
        const seconds = timeTillUTCMidnightMoment.seconds();
        const timeTillUTCMidnightFormatted = `${
            hours > 0 ? `${hours} ${pluralForm(hours, languages.times[this.langCode].hour)}, ` : ""
        }${seconds <= 0 && hours > 0 ? this.language.execution.and : ""}${
            minutes > 0 ? `${minutes} ${pluralForm(hours, languages.times[this.langCode].minute)} ` : ""
        }${
            seconds > 0
                ? `${minutes > 0 ? this.language.execution.and : ""}${seconds} ${pluralForm(
                      hours,
                      languages.times[this.langCode].second,
                  )}`
                : ""
        }`;

        if (lastDaily.isSame(moment().utc(), "day")) {
            return await messagingService.reply(message, this.language.execution.claimed, true, {
                placeholder: {
                    custom: new Map([["text", timeTillUTCMidnightFormatted]]),
                },
            });
        }

        // if last time daily was done is before start of current day, reset streak
        const isStreakBroken = dailyStreak > 0 && lastDaily.isBefore(moment().utc().startOf('day'));
        if (isStreakBroken) dailyStreak = 1;
        else dailyStreak++;

        const rand = user.random;
        const streakBonus = !isStreakBroken ? dailyStreak * this.getStreakReward(rand, dailyStreak) : 0;
        const dailyCoins = this.getDailyReward(rand) + streakBonus;
        await this.addBalance(userJid, new Balance(dailyCoins, 0));

        const dailyCoinsWithCommas = formatNumberCommas(dailyCoins);
        const streakCoinsWithCommas = formatNumberCommas(streakBonus);

        const reply = this.language.execution.success_title + "\n\n" + this.language.execution.success;
        await userRepository.update(userJid, {
            $set: {"metadata.daily_meta.streak": dailyStreak, "metadata.daily_meta.last_daily": moment().unix()},
        });

        return await messagingService.replyAdvanced(message, {text: reply, mentions: [userJid]}, true, {
            placeholder: {
                custom: {
                    tag: `@${jidDecode(userJid)?.user}`,
                    coins: dailyCoinsWithCommas, // amount placed
                    coin: pluralForm(dailyCoins, languages.economy.coin[this.langCode]), // coin word translation
                    text: timeTillUTCMidnightFormatted, // time till next daily
                    streak: commas(dailyStreak), // days of unbroken streak
                    days: pluralForm(dailyStreak, languages.times[this.langCode].day), // days word translation
                    bonus: streakCoinsWithCommas, // streak bonus
                },
            },
        });
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}

    private getStreakReward(random: RandomSeed, streak: number) {
        return (
            Math.min(streak, 150) *
            weightedReward(random, [
                [[500, 1000], 94], // 94% chance of getting reward between 500 and 1000
                [[1300, 1600], 3],
                [[300, 600], 3], // unlucky
            ])
        );
    }

    private getDailyReward(random: RandomSeed) {
        return weightedReward(random, [
            [[2000, 5000], 10],
            [[5000, 10000], 20],
            [[7500, 15000], 27],
            [[12000, 20000], 35],
            [[20000, 30000], 5],
            [[25000, 30000], 3],
            [[50000, 70000], 0.001],
        ]);
    }
}

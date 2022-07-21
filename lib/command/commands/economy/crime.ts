import {jidDecode, WASocket} from "@adiwajshing/baileys";
import {CommandTrigger, EconomyCommand} from "../..";
import {BlockedReason} from "../../../blockable";
import {Chat, ChatLevel} from "../../../chats";
import {messagingService, userRepository} from "../../../constants/services";
import {Balance} from "../../../economy";
import {Message} from "../../../message";
import {commas, formatNumberCommas} from "../../../utils/utils";
import languages from "../../../constants/language.json";
import {pluralForm} from "../../../utils/message_utils";
import {weightedChoice, weightedReward} from "./utils";
import {RandomSeed} from "random-seed";

type Crime =
    | "vandalism"
    | "shop lifting"
    | "drug distribution"
    | "tax evasion"
    | "arson"
    | "murder"
    | "cyber bullying"
    | "fraud"
    | "identity theft";

export default class CrimeCommand extends EconomyCommand {
    private language: typeof languages.commands.crime[Language];
    private langCode: Language;

    constructor(language: Language) {
        const langs = languages.commands.crime;
        const lang = langs[language];
        super({
            triggers: langs.triggers.map((e) => new CommandTrigger(e)),
            announcedAliases: lang.triggers,
            category: lang.category,
            description: lang.description,
            cooldowns: new Map([
                [ChatLevel.Free, 45 * 1000],
                [ChatLevel.Premium, 20 * 1000],
                [ChatLevel.Sponser, 15 * 1000],
            ]),
        });

        this.language = lang;
        this.langCode = language;
    }

    async execute(client: WASocket, chat: Chat, message: Message, body: string, ...args: string[]) {
        const userJid = message.sender ?? "";
        const user = await userRepository.get(userJid);
        if (!user || !userJid) {
            return await messagingService.reply(
                message,
                "Seems like this user doesn't exist. Please contact an admin.",
                true,
            );
        }
        const getCoinText = (number: number) => pluralForm(number, languages.economy.coin[this.langCode]);
        const placeholder = this.getDefaultPlaceholder({chat, message, user});

        // pick a crime
        const rand = user.random;
        const crimes = [undefined, undefined, undefined].map(
            (e) => this.language.execution.crimes[rand.intBetween(0, this.language.execution.crimes.length - 1)],
        );

        const crimesToPickText = crimes.map((crime, i) => `${i + 1}. ${crime.name}`).join("\n");
        const pickACrimeText = `${this.language.execution.pick_crime}\n\n${crimesToPickText}`;

        await messagingService.reply(message, pickACrimeText, true, {placeholder});
        const crimeChosenMessage = await this.validatedWaitForInteractionWith(
            message,
            (msg) => messagingService.reply(message, pickACrimeText, true, {placeholder}),
            "1",
            "2",
            "3",
            ...crimes.map((e) => e.name),
        );

        const crimeChosenBody = crimeChosenMessage.content?.trim();
        if (!crimeChosenMessage || !crimeChosenBody) return;

        const crimeChosen = parseInt(crimeChosenBody)
            ? parseInt(crimeChosenBody) - 1
            : crimes.findIndex((e) => e.name === crimeChosenBody);
        const crime = crimes[crimeChosen];
        if (!crime) return;

        let crimeResultMessage = this.language.execution.commited + "\n\n";
        const crimeSuccess = weightedChoice([
            [true, crime.success_chance],
            [false, 1 - crime.success_chance],
        ]);
        const crimeDeath = weightedChoice([
            [true, crime.death_chance],
            [false, 1 - crime.death_chance],
        ]);
        const reward = this.getReward(rand);

        if (crimeSuccess) {
            crimeResultMessage += crime.success;
            await this.addBalance(userJid, new Balance(reward, 0));
        } else {
            crimeResultMessage += crime.failed;
        }

        if (crimeDeath) {
            crimeResultMessage += crime.death;
            messagingService.reply(crimeChosenMessage, this.language.execution.death_not_implemented, true, {
                privateReply: true,
                placeholder,
            });
        }

        if (crimeDeath || !crimeSuccess) {
            crimeResultMessage += "\n" + this.language.execution.failed_crime_footer;
        }

        return await messagingService.reply(crimeChosenMessage, crimeResultMessage, true, {
            placeholder: this.addCustomPlaceholders(placeholder, {
                amount: commas(reward),
                crime: crime.name,
                coin: getCoinText(reward),
            }),
        });
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}

    private getReward(random: RandomSeed) {
        return weightedReward(random, [
            [[3000, 3500], 10], // 10% chance of getting reward between 3000 and 3500
            [[2500, 3000], 30], // 30% chance of getting reward between 2500 and 3000
            [[2000, 2500], 50],
            [[1000, 1500], 10],
        ]);
    }
}

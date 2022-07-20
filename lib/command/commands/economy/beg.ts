import {WASocket} from "@adiwajshing/baileys";
import {CommandTrigger, EconomyCommand} from "../..";
import {BlockedReason} from "../../../blockable";
import {Chat, ChatLevel} from "../../../chats";
import {messagingService, userRepository} from "../../../constants/services";
import {Balance} from "../../../economy";
import {Message} from "../../../message";
import {commas, formatNumberCommas} from "../../../utils/utils";
import languages from "../../../constants/language.json";

export default class BegCommand extends EconomyCommand {
    private language: typeof languages.commands.beg[Language];

    constructor(language: Language) {
        const langs = languages.commands.beg;
        const lang = langs[language];
        super({
            triggers: langs.triggers.map((e) => new CommandTrigger(e)),
            announcedAliases: lang.triggers,
            category: lang.category,
            description: lang.description,
            cooldowns: new Map([
                [ChatLevel.Free, 30000],
                [ChatLevel.Premium, 15000],
                [ChatLevel.Sponser, 10000],
            ]),
            usage: lang.usage,
        });

        this.language = lang;
        this.responses = lang.responses;
    }

    private people = [
        "Default Jonesy",
        "Dwight Shrute",
        "Wendy",
        "Lady Gaga",
        "Taylor Swift",
        "Joe",
        "Cardi B",
        "B Simpson",
        "Your mom",
        "Spongebob",
        "Selena Gomez",
        "Stan Lee",
        "That tiktok star that shows a little too much booty",
        "Carole Baskin",
        "Gwyneth Paltrow",
        "NotARSenic",
        "Paula Deen",
        "Toby Turner",
        "That guy you hate",
        "Jesus",
        "A honey badger",
        "Jennifer Lopez",
        "Oprah",
        "Lizzy M",
        "Chungus",
        "The Rock",
    ];

    private responses: string[];

    async execute(client: WASocket, chat: Chat, message: Message, body: string, ...args: string[]) {
        const userJid = message.sender ?? "";
        const user = await userRepository.get(userJid);
        if (!user || !userJid) {
            return await messagingService.reply(message, this.language.execution.no_balance, true);
        }

        const rand = user.random;
        const shouldGive = rand.intBetween(1, 100) <= 70;
        const person = this.people[rand.intBetween(0, this.people.length - 1)];

        if (!shouldGive) {
            const response = this.responses[rand.intBetween(0, this.responses.length - 1)];
            return await messagingService.reply(
                message,
                `*${person}*\n"${response}"\n${this.language.execution.imagine_begging}`,
                true,
            );
        }

        const weight = rand.intBetween(1, 100); // "weighted" random to determine how much to give
        const amountGiven =
            weight <= 10
                ? rand.intBetween(2000, 2700)
                : weight <= 20
                ? rand.intBetween(1000, 2000)
                : weight <= 50
                ? rand.intBetween(500, 1000)
                : rand.intBetween(100, 500);

        await this.addBalance(userJid, new Balance(amountGiven, 0));
        await messagingService.reply(message, `*${person}*\n"${this.language.execution.success_give}"`, true, {
            placeholder: {
                custom: new Map([["amount", commas(amountGiven)]]),
            },
        });
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}

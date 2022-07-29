import {jidDecode, WASocket} from "@adiwajshing/baileys";
import {CommandTrigger, EconomyCommand} from "../..";
import {BlockedReason} from "../../../blockable";
import {Chat, ChatLevel} from "../../../chats";
import {messagingService, userRepository} from "../../../constants/services";
import {Message} from "../../../message";
import {commas, formatNumberCommas} from "../../../utils/utils";
import languages from "../../../constants/language.json";
import {weightedChoice, weightedReward} from "./utils";
import {Balance} from "../../../economy";
import {pluralForm} from "../../../utils/message_utils";
import {RandomSeed} from "random-seed";

type PostMemeResponse = {
    title: string;
    footer: string;
    money_range: [number, number];
};

type PostMemeWeightedResponse = [number, PostMemeResponse];

export default class PostMemesCommand extends EconomyCommand {
    private language: typeof languages.commands.postmemes[Language];
    private langCode: Language;

    constructor(language: Language) {
        const langs = languages.commands.postmemes;
        const lang = langs[language];
        super({
            triggers: langs.triggers.map((e) => new CommandTrigger(e)),
            announcedAliases: lang.triggers,
            category: lang.category,
            description: lang.description,
            cooldowns: new Map([
                [ChatLevel.Free, 45 * 1000],
                [ChatLevel.Premium, 20 * 1000],
                [ChatLevel.Sponsor, 15 * 1000],
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
                "Seems like you as a user don't exist. Please contact an admin.",
                true,
            );
        }
        const getCoinText = (number: number) => pluralForm(number, languages.economy.coin[this.langCode]);

        // pick a meme response
        const responses = this.language.execution.responses as PostMemeWeightedResponse[];
        const memesChoosable = this.language.execution.memes;
        const memesText = memesChoosable.map((memeName, i) => `*${i + 1}.* ${memeName}`).join("\n");
        const memesNumbers = memesChoosable.map((memeName, i) => [memeName, (i + 1).toString()]).flat();
        const meme = weightedChoice(responses.map((e) => [e[1], e[0]]));

        const requestText = `${this.language.execution.request_title}\n\n${this.language.execution.request_body}\n${this.language.execution.request_footer}\n\n${memesText}`;
        await messagingService.replyAdvanced(message, {text: requestText, mentions: [user.model.jid]}, true, {
            placeholder: this.getDefaultPlaceholder({chat, message, user}),
        });
        const memeChosenMsg = await this.validatedWaitForInteractionWith(
            message,
            (msg) => messagingService.reply(msg, memesText, true),
            20 * 1000,
            () => messagingService.reply(message, this.language.execution.too_long, true),
            ...memesNumbers,
        );

        if (!memeChosenMsg) return;

        const num = Number(memeChosenMsg.content?.trim()) - 1;
        const memeChosen =
            !num && num != 0
                ? memesChoosable.findIndex((e) =>
                      memeChosenMsg.content?.trim().toLowerCase().startsWith(e.toLowerCase()),
                  )
                : num;

        if (memeChosen === -1) {
            return await messagingService.reply(message, this.language.execution.invalid_meme, true);
        }

        const memeResponse = memesChoosable[memeChosen];
        const memeResponseText = `${this.language.execution.request_title}\n\n${meme.title}\n${meme.footer}`;
        const coinsAmount = user.random.intBetween(meme.money_range[0], meme.money_range[1]);

        await messagingService.replyAdvanced(message, {text: memeResponseText, mentions: [user.model.jid]}, true, {
            placeholder: this.getDefaultPlaceholder({
                chat,
                message,
                user,
                custom: {
                    coin: getCoinText(coinsAmount),
                    coins: commas(coinsAmount),
                },
            }),
        });
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}

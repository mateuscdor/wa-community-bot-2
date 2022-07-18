import {proto, WASocket} from "@adiwajshing/baileys";
import {Configuration, OpenAIApi} from "openai";
import {BlockedReason} from "../../../blockable";
import {Chat, ChatLevel} from "../../../chats";
import {messagingService} from "../../../constants/services";
import Message from "../../../message/message";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";
export default class GptCommand extends Command {
    constructor() {
        super({
            triggers: ["gpt", "בינה"].map((e) => new CommandTrigger(e)),
            usage: "{prefix}{command}",
            category: "Study",
            description: "Ask an AI a question (This may soon turn into a premium feature)",
            cooldowns: new Map([
                [ChatLevel.Free, 30 * 1000],
                [ChatLevel.Premium, 20 * 1000],
                [ChatLevel.Sponser, 10 * 1000],
            ]),
        });

        this.configuration = new Configuration({
            apiKey: process.env.OPENAI_API_KEY,
        });

        this.openai = new OpenAIApi(this.configuration);
    }

    configuration: Configuration;
    openai: OpenAIApi;

    private texts = [
        "Hmmmm, let me think about this one...",
        "Huh.... Interesting...",
        "I mean... I'll give it my best try.",
        "No clue. Well I mean... Hmmmmm....",
    ];

    async execute(client: WASocket, chat: Chat, message: Message, body?: string) {
        if (!body) {
            return await messagingService.reply(message, "You must ask something.");
        }

        // body can only contain english and special characters
        if (!/^[a-zA-Z0-9\s\.,;:!?\(\)\[\]\{\}'"-]+$/.test(body)) {
            return await messagingService.reply(message, "You must ask something in english!\nהשאלה חייבת להיות מנוסחת באנגלית בלבד.", true);
        }

        messagingService.reply(message, this.texts[Math.floor(Math.random() * this.texts.length)], true);

        this.openai
            .createCompletion({
                model: "text-davinci-002",
                prompt: body,
                temperature: 0.7,
                max_tokens: 1800,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0,
            })
            .then((response) => {
                const blank = "Couldn't think of anything\nI'm blank!";
                const text = response.data.choices ? response.data.choices[0].text ?? blank : blank;
                messagingService.reply(message, text.trim(), true);
            })
            .catch((err) => {
                messagingService.reply(message, "That's way too long for me", true);
            });
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}

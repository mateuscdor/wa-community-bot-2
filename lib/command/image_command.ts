import {AnyMessageContent, WASocket} from "@adiwajshing/baileys";
import axios from "axios";
import {RandomSeed} from "random-seed";
import {whatsappBot} from "..";
import {Chat, ChatLevel} from "../chats";
import {messageRepository, messagingService, userRepository} from "../constants/services";
import {Balance} from "../economy";
import {Message} from "../message";
import CommandTrigger from "./command_trigger";
import InteractableCommand from "./interactable_command";
import languages from "../constants/language.json";
import {BlockedReason} from "../blockable";
import {writeFile} from "fs";

type ImageCommandRequestBody = {
    text: string;
    avatars: string[];
    usernames: string[];
    kwargs?: {[key: string]: any};
};

export type ImageGenCommandData = {
    route: string;
    name: {
        english: string;
        hebrew: string;
    };
    type: "post" | "get";
    required: {
        mentions: 0 | 1 | 2;
        text: boolean;
    };
};

export default class ImageCommand extends InteractableCommand {
    private lang: typeof languages.commands.image[Language];
    private route: string;

    constructor(
        private genData: ImageGenCommandData,
        private language: Language,
        {category, description}: {category?: string; description?: string},
    ) {
        super({
            triggers: Object.values(genData.name)
                .filter((e) => e)
                .map((e) => new CommandTrigger(e)),
            announcedAliases: [genData.name[language] ? genData.name[language] : genData.name["english"]],
            usage:
                "{prefix}{command}" +
                (genData.required.text ? " <text>" : "") +
                (genData.required.mentions
                    ? ` ${Array(genData.required.mentions)
                          .map((e, i) => `@user${i}`)
                          .join(" ")}`
                    : ""),
            category: category,
            description: description,
            cooldowns: new Map([
                [ChatLevel.Free, 15 * 1000],
                [ChatLevel.Premium, 7 * 1000],
                [ChatLevel.Sponsor, 4 * 1000],
            ]),
        });

        this.route = `http://localhost:8080/api/${genData.route}`;
        this.lang = languages.commands.image[language];
    }

    async execute(client: WASocket, chat: Chat, message: Message, body: string, ...args: string[]) {
        const requestBody: ImageCommandRequestBody = {
            text: body,
            avatars: [],
            usernames: [],
            kwargs: {},
        };

        const msgMentions = message.mentions;

        const botPfp = (await whatsappBot.profilePicture)!;
        const mentions: string[] = [msgMentions[0] ?? message.sender, msgMentions[1]];
        const users = await Promise.all(mentions.map((e) => (e ? userRepository.get(e) : undefined)));
        const avatarUrls = await Promise.all(mentions.map((e) => (e ? client.profilePictureUrl(e) : undefined)));

        if (this.genData.required.mentions === 2) {
            requestBody.avatars = [avatarUrls[0]!, avatarUrls[1] ?? botPfp];
        } else if (this.genData.required.mentions === 1) {
            requestBody.avatars = [avatarUrls[0] ?? avatarUrls[1] ?? botPfp];
        }

        requestBody.usernames = users
            .map((e) => (e ? e.getFullDefaultingName(this.lang.execution.default_name) : undefined))
            .filter((e) => e !== undefined) as string[];

        if (this.genData.required.text) {
            if (!body || body.length === 0) {
                return messagingService.reply(message, this.lang.execution.body_required, true);
            }

            requestBody.text = body;
        }

        if (this.genData.type == "post") {
            console.log(this.genData.route)
            console.log(requestBody)
            const response = await axios.post(this.route, requestBody, {responseType: "arraybuffer"});
            const data = response.data;
            if (data.error) {
                return messagingService.reply(
                    message,
                    "An error occurred, if this error persists please contact the developer.",
                    true,
                );
            }

            // check if image response
            const mimetype = response.headers["content-type"];
            const isImage = mimetype.startsWith("image");
            const content = Buffer.from(data, "binary");

            const responseContent = {mimetype, [isImage ? "image" : "video"]: content};
            return messagingService.replyAdvanced(message, responseContent as any as AnyMessageContent, true);
        } else if (this.genData.type == "get") {
            const response = await axios.get(this.route, {
                params: {
                    text: requestBody.text,
                    usernames: requestBody.usernames.join(","),
                },
                responseType: "arraybuffer",
            });

            const data = response.data;
            if (data.error) {
                return messagingService.reply(
                    message,
                    "An error occurred, if this error persists please contact the developer.",
                    true,
                );
            }

            // check if image response
            const mimetype = response.headers["content-type"];
            const isImage = mimetype.startsWith("image");
            const content = Buffer.from(data, "binary");

            const responseContent = {mimetype, [isImage ? "image" : "video"]: content};
            return messagingService.replyAdvanced(message, responseContent as any as AnyMessageContent, true);
        }
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}

import {
    OrderDetails,
    Product,
    CatalogCollection,
    ProductCreate,
    ProductUpdate,
    BinaryNode,
    proto,
    MessageRelayOptions,
    MessageReceiptType,
    MediaConnInfo,
    WAMediaUploadFunction,
    AnyMessageContent,
    MiscMessageGenerationOptions,
    GroupMetadata,
    ParticipantAction,
    MessageUpsertType,
    WAPatchCreate,
    WAPresence,
    WAMediaUpload,
    WABusinessProfile,
    InitialReceivedChatsState,
    ChatModification,
    BaileysEventEmitter,
    BaileysEventMap,
    AuthenticationCreds,
    SignalKeyStoreWithTransaction,
    Contact,
    ConnectionState,
    WASocket,
} from "@adiwajshing/baileys";
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

type ImageCommandRequestBody = {
    text: string;
    avatars: Buffer[];
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

    constructor(
        private genData: ImageGenCommandData,
        private language: Language,
        {category, description}: {category?: string; description?: string},
    ) {
        super({
            triggers: Object.values(genData.name).map((e) => new CommandTrigger(e)),
            announcedAliases: [genData.name[language]],
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
        const mentions: string[] = [msgMentions[0], msgMentions[1] ?? message.sender];
        const users = await Promise.all(mentions.map((e) => (e ? userRepository.get(e) : undefined)));
        const avatarUrls = await Promise.all(mentions.map((e) => (e ? client.profilePictureUrl(e) : undefined)));
        const avatars = await Promise.all(
            avatarUrls.map((e) =>
                e ? axios.get(e, {responseType: "arraybuffer"}).then((e) => Buffer.from(e.data, "utf-8")) : undefined,
            ),
        );

        if (this.genData.required.mentions === 2) {
            requestBody.avatars = [avatars[0] ?? botPfp, avatars[1]!];
        } else if (this.genData.required.mentions === 1) {
            requestBody.avatars = [avatars[0] ?? avatars[1] ?? botPfp];
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
            const response = await axios.post(this.genData.route, requestBody, {responseType: "arraybuffer"});
            const data = response.data;
            if (data.error) {
                return messagingService.reply(
                    message,
                    "An error occurred, if this error persists please contact the developer.",
                    true,
                );
            }

            // check if image response
            const isImage = response.headers["content-type"].startsWith("image");
            const content = Buffer.from(data, "utf-8");

            const responseContent: AnyMessageContent = {text: ""};
            responseContent[isImage ? "image" : "video"] = content;
            return messagingService.replyAdvanced(message, responseContent, true);
        } else if (this.genData.type == "get") {
            const response = await axios.get(this.genData.route, {
                params: {
                    text: requestBody.text,
                    usernames: requestBody.usernames,
                },
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
            const isImage = response.headers["content-type"].startsWith("image");
            const content = Buffer.from(data, "utf-8");

            const responseContent: AnyMessageContent = {text: ""};
            responseContent[isImage ? "image" : "video"] = content;
            return messagingService.replyAdvanced(message, responseContent, true);
        }
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}

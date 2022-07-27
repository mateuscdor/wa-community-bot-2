import {jidDecode, WASocket} from "@adiwajshing/baileys";
import Sticker, {StickerTypes} from "wa-sticker-formatter/dist";
import {BlockedReason} from "../../../blockable";
import {Chat} from "../../../chats";
import {messagingService, userRepository} from "../../../constants/services";
import {MessageMetadata} from "../../../message";
import Message from "../../../message/message";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";
import languages from "../../../constants/language.json";
import {createCanvas} from "canvas";
import {DeveloperLevel} from "../../../database/models";
import {choice, weightedChoice} from "../economy/utils";

export default class StickerCommand extends Command {
    private language: typeof languages.commands.sticker[Language];

    constructor(language: Language) {
        const langs = languages.commands.sticker;
        const lang = langs[language];
        super({
            triggers: langs.triggers.map((e) => new CommandTrigger(e)),
            announcedAliases: lang.triggers,
            usage: lang.usage,
            category: lang.category,
            description: lang.description,
        });

        this.language = lang;
    }

    async execute(client: WASocket, chat: Chat, message: Message, body?: string) {
        const ogMedia = await message.media;
        const quoted = await message.getQuoted();
        const quotedMedia = await quoted?.media;
        let messageMedia = ogMedia ?? quotedMedia;
        const user = await userRepository.get(message.sender ?? "");

        if (!messageMedia && (user?.model.developerLevel ?? DeveloperLevel.None) > DeveloperLevel.Admin) {
            // draw an image that looks like a whatsapp message
            const bgColor = "#212c33";
            const textColor = "#e9edef";
            const footerColor = "#9fa4a7";
            const numberColors = ["#df64b6", "#f79877", "#d885ea", "#a281f0", "#63baea", "#f7d37c"];
            const numberColor = numberColors[Math.floor(Math.random() * numberColors.length)];
            const messageSize = [100, 100];

            const chosenMessage = body?.length ?? 0 > 0 ? message : quoted!;
            const bodyText = body?.length ?? 0 > 0 ? body : chosenMessage.content;
            const bodyAuthor = formatJidToCleanNumber(chosenMessage.sender) ?? "";

            console.log(`${bodyAuthor} said: ${bodyText} | ${numberColor} with ${textColor}`);
            const canvas = createCanvas(messageSize[0], messageSize[1]);
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, messageSize[0], messageSize[1]);
            ctx.fillStyle = numberColor;
            ctx.font = "12.8px Segoe UI";
            ctx.fillText(bodyAuthor ?? "", 6, 7 + 12.8);
            let numberSize = ctx.measureText(bodyAuthor ?? "");
            ctx.font = "14.2px Segoe UI";
            ctx.fillStyle = textColor;
            // ctx.fillText(bodyText ?? "", 6, 7 + 14.2 + numberSize.actualBoundingBoxDescent + 7);
            messageMedia = canvas.toBuffer();
        }

        if (!messageMedia) {
            return await messagingService.reply(message, this.language.execution.no_media, true);
        }

        const stickerBuffer = await this.createSticker(messageMedia).toBuffer();
        if (stickerBuffer.length < 50) {
            return await messagingService.reply(message, this.language.execution.no_media, true);
        } else if (stickerBuffer.length > 2 * 1000000) {
            // if bigger than 2mb error.
            return await messagingService.reply(message, this.language.execution.too_big, true);
        }

        await messagingService.replyAdvanced(message, {sticker: stickerBuffer}, true, {
            metadata: new MessageMetadata(new Map([["media", false]])),
        });
    }

    private createSticker(buffer: Buffer, author: string = "bot", pack: string = "bot") {
        return new Sticker(buffer, {
            pack: pack,
            author: author,
            type: StickerTypes.FULL,
            quality: 40,
        });
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}

function formatJidToCleanNumber(jid?: string) {
    const num = jidDecode(jid)?.user;
    if (!num) return;

    const match = num.match(/^(\d{3})(\d{2})(\d{3})(\d{4})$/);
    if (match) {
        return `+${match[1]} ${match[2]}-${match[3]}-${match[4]}`;
    }
}

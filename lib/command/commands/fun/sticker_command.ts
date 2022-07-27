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
import moment from "moment";

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

        if (!messageMedia && quoted) {
            // draw an image that looks like a whatsapp message
            const font = "Segoe UI";
            const getFontText = (size: number) => `${size}px ${font}`;
            const maxWidth = 350;
            let isEnglish = /[a-zA-Z0-9\s\.,;:!?\(\)\[\]\{\}'"-<>״]+/.test(quoted.content![0]);

            const bgColor = "#212c33";
            const textColor = "#e9edef";
            const footerColor = "#9fa4a7";
            const pushNameColor = "#5d666c";
            const numberColor = choice(["#df64b6", "#f79877", "#d885ea", "#a281f0", "#63baea", "#f7d37c"]);

            const titleFont = getFontText(12.8);
            const bodyFont = getFontText(14.2);
            const footerFont = getFontText(11);

            const userSender = await userRepository.get(quoted.sender ?? "");
            const bodyAuthor = formatJidToCleanNumber(quoted.sender) ?? "";
            let pushName = quoted.raw?.pushName || userSender?.model.name || undefined;
            const timeText = moment.unix(quoted.timestamp!).format("HH:mm");
            if (pushName) pushName = "~" + pushName;
            let bodyText = quoted.content;
            if (!bodyText) return;

            const authorTextSize = getTextSize(bodyAuthor, titleFont);
            const pushNameTextSize = getTextSize(pushName, titleFont);
            const bodyTextLines = getTextLines(bodyText, bodyFont, maxWidth);
            bodyText = bodyTextLines.join("\n").trim();
            const bodyTextSize = getTextSize(bodyText, bodyFont);
            const footerTextSize = getTextSize(timeText, footerFont);

            const messageSize = [
                Math.max(
                    72,
                    Math.max(
                        bodyTextSize.width + 16,
                        authorTextSize.width + pushNameTextSize.width + (pushNameTextSize.width ? 30 : 0) + 16,
                    ),
                ),
                Math.max(
                    72,
                    bodyTextSize.height.ascent +
                        bodyTextSize.height.descent +
                        authorTextSize.height.ascent +
                        authorTextSize.height.descent +
                        pushNameTextSize.height.ascent +
                        pushNameTextSize.height.descent +
                        footerTextSize.height.ascent +
                        footerTextSize.height.descent +
                        10,
                ),
            ];

            const canvas = createCanvas(messageSize[0], messageSize[1]);
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, messageSize[0], messageSize[1]);
            ctx.fillStyle = numberColor;
            ctx.font = "12.8px Segoe UI";
            ctx.fillText(bodyAuthor ?? "", 7, 7 + 12.8);
            if (pushName) {
                ctx.fillStyle = pushNameColor;
                ctx.fillText(pushName, messageSize[0] - 7 - pushNameTextSize.width, 7 + 12.8);
            }

            let numberSize = ctx.measureText(bodyAuthor ?? "");
            ctx.font = "14.2px Segoe UI";
            ctx.fillStyle = textColor;
            ctx.fillText(
                bodyText ?? "",
                isEnglish ? 6 : messageSize[0] - 6 - bodyTextSize.width,
                7 + 14.2 + numberSize["emHeightAscent"] + numberSize["emHeightDescent"],
            );
            ctx.fillStyle = footerColor;
            ctx.font = "11px Segoe UI";
            ctx.fillText(timeText, messageSize[0] - 6 - footerTextSize.width, messageSize[1] - 4);

            messageMedia = canvas.toBuffer();
        } else if (!messageMedia && body) {
            // draw an image that with body text in the center
            const canvas = createCanvas(512, 512);
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, 512, 512);
            ctx.fillStyle = "#000000";
            ctx.font = "bold 48px Segoe UI";
            const text = getTextLines(body, "48px Segoe UI", 512 - 8 * 2).join("\n").trim();
            const size = getTextSize(text ?? "", ctx.font);
            ctx.fillText(text, 512 / 2 - size.width / 2 + 8, 512 / 2 - (size.height.ascent + size.height.descent) / 2);

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
            quality: 100,
        });
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}

function getTextSize(text: string | undefined, font: string) {
    if (text === undefined) return {width: 0, height: {ascent: 0, descent: 0}};

    const canvas = createCanvas(1, 1);
    const ctx = canvas.getContext("2d");
    ctx.font = font;
    const size = ctx.measureText(text);
    return {width: size.width, height: {ascent: size["emHeightAscent"], descent: size["emHeightDescent"]}};
}

function formatJidToCleanNumber(jid?: string) {
    const num = jidDecode(jid)?.user;
    if (!num) return;

    const match = num.match(/^(\d{3})(\d{2})(\d{3})(\d{4})$/);
    if (match) {
        return `+${match[1]} ${match[2]}-${match[3]}-${match[4]}`;
    }
}
function getTextLines(bodyText: string, bodyFont: string, maxWidth: number) {
    const lines: string[] = [];
    let currentLine = "";
    const words = bodyText.split("");
    for (const word of words) {
        const wordSize = getTextSize(word, bodyFont);
        if (wordSize.width + getTextSize(currentLine, bodyFont).width > maxWidth) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine += `${word}`;
        }
    }

    lines.push(currentLine);
    return lines;
}

import {DownloadableMessage, downloadContentFromMessage, generateWAMessageFromContent, proto, WASocket} from "@adiwajshing/baileys";
import Sticker, {StickerTypes} from "wa-sticker-formatter/dist";
import {BlockedReason} from "../../../blockable";
import {Chat} from "../../../chats";
import {messagingService} from "../../../constants/services";
import {MessageMetadata} from "../../../message";
import Message from "../../../message/message";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";

export default class StickerCommand extends Command {
    constructor() {
        super({
            triggers: ["sticker", "סטיקר"].map(e => new CommandTrigger(e)),
            usage: "{prefix}{command}",
            category: "Fun",
            description: "Send along with an image or video to create a sticker",
        });
    }

    async execute(client: WASocket, chat: Chat, message: Message, body?: string) {
        const ogMedia = await message.media;
        const quotedMedia = await (await message.getQuoted())?.media;
        let messageMedia = ogMedia ?? quotedMedia;
        if (!messageMedia) {
            return await messagingService.reply(message, "You must send a video, image, sticker or quote one along with the command.", true);
        }

        const stickerBuffer = await this.createSticker(messageMedia).toBuffer();
        if (stickerBuffer.length < 50) {
            return await messagingService.reply(message, "You must send a video, image, sticker or quote one along with the command.", true);
        } else if (stickerBuffer.length > 2 * 1000000) {
            // if bigger than 2mb error.
            return await messagingService.reply(message, "The sticker you are trying to create is too large.", true);
        }

        await messagingService.replyAdvanced(message, {sticker: stickerBuffer}, true, false, new MessageMetadata(new Map([["media", false]])));
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

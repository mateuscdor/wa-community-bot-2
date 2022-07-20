import {WASocket} from "@adiwajshing/baileys";
import Sticker, {StickerTypes} from "wa-sticker-formatter/dist";
import {BlockedReason} from "../../../blockable";
import {Chat} from "../../../chats";
import {messagingService} from "../../../constants/services";
import {MessageMetadata} from "../../../message";
import Message from "../../../message/message";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";
import languages from "../../../constants/language.json";

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
        const quotedMedia = await (await message.getQuoted())?.media;
        let messageMedia = ogMedia ?? quotedMedia;
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

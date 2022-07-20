import {AnyMessageContent, jidDecode, WASocket} from "@adiwajshing/baileys";
import VCard from "vcard-creator";
import {BlockedReason} from "../../../blockable";
import {Chat} from "../../../chats";
import {messagingService} from "../../../constants/services";
import Message from "../../../message/message";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";
import dotenv from 'dotenv';
dotenv.config();

export default class CreatorCommand extends Command {
    constructor() {
        super({
            triggers: ["feature", "רעיון"].map(e => new CommandTrigger(e)),
            usage: "{prefix}{command}",
            category: "Info",
            description: "Have an idea or a feature suggestion?",
            extendedDescription: "This command will forward your message to the creator of the bot.\nUse it to report bugs or suggest new features.",
        });
    }

    async execute(client: WASocket, chat: Chat, message: Message, body?: string) {
        if (!message.media && !body) {
            return await messagingService.reply(message, "You must have some content you want to send in the message.", true);
        }

        await messagingService.sendMessage(process.env["CREATOR_JID"]!, {text: `You received a message from:`});
        const vcard = new VCard();
        vcard.addName(undefined, message.raw?.pushName ?? "Bot User");
        vcard.setProperty("TEL", `TEL;type=CELL;waid=${jidDecode(message.from).user}`, `+${jidDecode(message.from).user}`);
        await messagingService.sendMessage(process.env["CREATOR_JID"]!, {
            contacts: {
                contacts: [{vcard: vcard.toString(), displayName: message.raw?.pushName ?? "Bot User"}],
            },
        });

        const media = await message.media
        const msg: AnyMessageContent = media ? {caption: body ?? "", image: media} : {text: body ?? ""};
        await messagingService.sendMessage(process.env["CREATOR_JID"]!, msg);
        await messagingService.reply(message, "Forwarded your message to the creator of the bot!");
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}

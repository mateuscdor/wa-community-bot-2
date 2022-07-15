import {AnyMessageContent, WASocket} from "@adiwajshing/baileys";
import {Chat, ChatLevel} from "../../../chats";
import {messagingService} from "../../../constants/services";
import Message from "../../../message/message";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";
import {BlockedReason} from "../../../blockable";

export default class AnonymousCommand extends Command {
    constructor() {
        super({
            triggers: [new CommandTrigger("anonymous")],
            chatLevel: ChatLevel.Premium,
            usage: "{prefix}{command}",
            category: 'Fun',
            description: "Anonymously message someone through the bot",
        });
    }

    async execute(client: WASocket, chat: Chat, message: Message, body?: string) {
        if (!message.media && !body) {
            return await messagingService.reply(message, "You must have some content you want to send in the message.", true);
        }

        const splitData = body?.split(" ") ?? [];
        let number = splitData.shift();
        if (number?.startsWith("0")) number = "972" + number.substring(1);
        if (number) number += "@s.whatsapp.net";
        if (!number) {
            return await messagingService.reply(message, "You must give a phone number. '>>anonymous {phone} {content}'", true);
        }

        let content = splitData.join(" ");
        if (!message.media && content.length === 0) {
            return await messagingService.reply(message, "You must have some content you want to send in the message.", true);
        }

        if (!(await client.onWhatsApp(number))[0].exists) {
            return await messagingService.reply(message, "This number isn't on WhatsApp", true);
        }

        content = "*ANONYMOUS MESSAGE:*\n" + content;
        const msg: AnyMessageContent = message.media ? {caption: content, image: message.media} : {text: content};
        await messagingService.sendMessage(number, msg);
        await messagingService.reply(message, "Sent! 🤫", true);
    }

    async onBlocked(msg: Message, blockedReason: BlockedReason) {
        // if chat level is not high enough, say that a membership is required
        if (blockedReason == BlockedReason.InsufficientChatLevel) {
            return await messagingService.reply(msg, "A membership is needed to use this command. Sorry!", true);
        }
    }
}

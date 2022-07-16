import { WASocket } from "@adiwajshing/baileys";
import { Chat } from "../../../chats";
import { messagingService } from "../../../constants/services";
import Message from "../../../message/message";
import CommandTrigger from "../../command_trigger";
import { BlockedReason } from "../../../blockable";
import Command from "../../command";

export default class SpoofCommand extends Command {
    constructor() {
        super({
            triggers: ["spoof", "זייף"].map(e => new CommandTrigger(e)),
            usage: "{prefix}{command}",
            category: "Fun",
            description: 'An exploit to spoof a friend\'s message. >>spoof @mention "spoofed message" "bot message"',
        });
    }

    async execute(client: WASocket, chat: Chat, message: Message, body?: string) {
        if (!body) {
            return await this.error(message);
        }

        body = body.replace(/״/gmi, '"')
        const splitBody = body?.split(' ');
        const mentioned = splitBody?.shift()?.slice(1);
        const quotedPart = splitBody?.join(' ');
        if (!mentioned || !quotedPart) {
            return this.error(message);
        }

        const quotes = [...(quotedPart.matchAll(RegExp(/"(.*?)"/, "g")))];
        if (!body || quotes?.length != 2) {
            return await this.error(message);
        }

        const rawMessage = message.raw;
        if (!rawMessage) {
            return messagingService.reply(message, 'There seems to have been an error. Please try again.', true);
        }

        rawMessage.key.participant = mentioned + '@s.whatsapp.net'
        if (rawMessage.message!.extendedTextMessage) rawMessage.message!.extendedTextMessage!.text = quotes[0][1];
        rawMessage.message!.conversation = quotes[0][1];

        await messagingService.sendMessage(rawMessage.key.remoteJid!, {text: quotes[1][1]}, {quoted: rawMessage})
    }

    private async error(message: Message) {
        return await messagingService.reply(message, 'Must follow >>spoof @mention "spoofed message" "bot message"', true);
    }
    
    onBlocked(data: Message, blockedReason: BlockedReason) {
        
    }
}
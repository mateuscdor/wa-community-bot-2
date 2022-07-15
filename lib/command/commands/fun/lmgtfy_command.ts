import {
    proto,
    WASocket,
} from "@adiwajshing/baileys";
import url from 'node:url';
import { Chat } from "../../../chats";
import { messagingService } from "../../../constants/services";
import Message from "../../../message/message";
import { DeveloperLevel } from "../../../database/models/user/developer_level";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";
import { BlockedReason } from "../../../blockable";

export default class LmgtfyCommand extends Command {
    constructor() {
        super({
            triggers: [new CommandTrigger("Lmgtfy")],
            usage: "{prefix}{command}",
            category: "Fun",
            description: "Help someone in the most condescending way possible",
        });
    }

    private readonly base_link = 'https://lmgtfy.app/?q='

    async execute(client: WASocket, chat: Chat, message: Message, body?: string) {
        if (!body) {
            return await messagingService.reply(message, "You must provide some text to Google");
        }

        const link = url.format(this.base_link + body + '&iie=1')
        await messagingService.reply(message, "You couldn't Google that yourself huh?\n" + link, true)
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {
        
    }
}

import {WASocket} from "@adiwajshing/baileys";
import {BlockedReason} from "../../../blockable/blocked_reason";
import {Chat} from "../../../chats";
import {messagingService} from "../../../constants/services";
import Message from "../../../message/message";
import {DeveloperLevel} from "../../../database/models/user/developer_level";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";

export default class RawCommand extends Command {
    constructor() {
        super({
            triggers: [new CommandTrigger("raw")],
            developerLevel: DeveloperLevel.Operator,
            usage: "{prefix}{command}",
            category: "Bot Operator",
            description: "Sends a raw message",
        });
    }

    async onBlocked(msg: Message, blockedReason: BlockedReason) {
        switch (blockedReason) {
            case BlockedReason.InsufficientDeveloperLevel:
                await messagingService.reply(msg, "You must be a system admin to use this command.", true);
            default:
                return;
        }
    }

    async execute(client: WASocket, chat: Chat, msg: Message, body: string) {
        client.sendMessage(msg.raw?.key.remoteJid!, {text: body ?? "ahhhhhhh"});
        client.sendMessage(msg.raw?.key.remoteJid!, {text: body ?? "ahhhhhhh"}, {quoted: msg.raw});
        await client.sendMessage(msg.raw?.key.remoteJid!, {text: body ?? "ahhhhhhh"}, {quoted: msg.raw});
    }
}

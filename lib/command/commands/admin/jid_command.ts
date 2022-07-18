import {WASocket} from "@adiwajshing/baileys";
import {BlockedReason} from "../../../blockable/blocked_reason";
import {Chat} from "../../../chats";
import {messagingService} from "../../../constants/services";
import Message from "../../../message/message";
import {DeveloperLevel} from "../../../database/models/user/developer_level";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";

export default class JIDCommand extends Command {
    constructor() {
        super({
            triggers: [new CommandTrigger("jid")],
            developerLevel: DeveloperLevel.Moderator,
            usage: "{prefix}{command}",
            category: "Bot Operator",
            description: "Gives you the JID of the chat the command was sent in.",
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
        const quoted = await msg.getQuoted();
        if (quoted) {
            return await messagingService.reply(
                msg,
                `CHAT JID: ${msg.raw?.key.remoteJid ?? "N/A"}\nQUOTED MESSAGE ID: ${quoted.raw?.key.id ?? "N/A"}`,
                true,
            );
        }

        await messagingService.reply(msg, `JID: ${msg.raw?.key.remoteJid ?? "N/A"}`, true);
    }
}

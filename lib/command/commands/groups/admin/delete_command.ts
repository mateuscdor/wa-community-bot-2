import { isJidGroup, WASocket } from "@adiwajshing/baileys";
import {Chat} from "../../../../chats";
import {messagingService} from "../../../../constants/services";
import Message from "../../../../message/message";
import Command from "../../../command";
import CommandTrigger from "../../../command_trigger";
import {GroupLevel} from "../../../../models";
import {getGroupPrivilegeMap} from "../../../../utils/group_utils";
import {BotClient} from "../../../../whatsapp_bot";
import {BlockedReason} from "../../../../blockable";
export default class DeleteCommand extends Command {
    constructor() {
        super({
            triggers: ["delete", "מחק"].map(e => new CommandTrigger(e)),
            usage: "{prefix}{command}",
            category: "Group Admin",
            groupLevel: GroupLevel.Admin,
            description: "Delete a message by the bot.\nDon't abuse, have fun.",
        });
    }

    async execute(client: WASocket, chat: Chat, message: Message, body: string) {
        const raw = message.raw!;
        const quoted = await message.getQuoted();
        if (!quoted) {
            return messagingService.reply(message, 'Please quote the message you want to delete.', true);
        }

        if (quoted?.from != BotClient.currentClientId) {
            return messagingService.reply(message, 'That message isn\'t from me 🧐🤦‍♂️', true);
        }

        try {
            await client.sendMessage(raw.key.remoteJid!, { delete: quoted.raw?.key! })
        } catch (err) {
            return messagingService.reply(message, 'An error occurred. Try again.', true);
        }
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {
        switch (blockedReason) {
            case BlockedReason.InsufficientGroupLevel:
                return messagingService.reply(data, "You must be a group admin to use this command.", true);
            default:
                return;
        }
    }
}
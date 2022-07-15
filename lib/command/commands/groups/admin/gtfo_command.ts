import {isJidGroup, WASocket} from "@adiwajshing/baileys";
import {Chat} from "../../../../chats";
import {messagingService} from "../../../../constants/services";
import Message from "../../../../message/message";
import Command from "../../../command";
import CommandTrigger from "../../../command_trigger";
import {GroupLevel} from "../../../../models";
import {BlockedReason} from "../../../../blockable";

export default class GtfoCommand extends Command {
    constructor() {
        super({
            triggers: [new CommandTrigger("gtfo")],
            usage: "{prefix}{command}",
            category: "Group Admin",
            groupLevel: GroupLevel.Admin,
            blockedChats: ["dm"],
            description: "Kick me out using this command.",
        });
    }

    async execute(client: WASocket, chat: Chat, message: Message, body: string) {
        if (!isJidGroup(message.to)) {
        }

        await messagingService.reply(message, "Leaving the group chat...\nPeace out ✌️");
        return await client.groupLeave(message.to);
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {
        switch (blockedReason) {
            case BlockedReason.InsufficientGroupLevel:
                return messagingService.reply(data, "You must be a group admin to use this command.", true);
            case BlockedReason.BlockedChat:
                return messagingService.reply(data, "There seems to be an error.\nYou can only use this command in a group chat.");
            default:
                return;
        }
    }
}

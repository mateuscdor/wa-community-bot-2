import {WASocket} from "@adiwajshing/baileys";
import {Chat} from "../../../../chats";
import {messagingService} from "../../../../constants/services";
import Message from "../../../../message/message";
import Command from "../../../command";
import CommandTrigger from "../../../command_trigger";
import {GroupLevel} from "../../../../models";
import {BlockedReason} from "../../../../blockable";

export default class EveryoneCommand extends Command {
    constructor() {
        super({
            triggers: ["everyone", "כולם"].map(e => new CommandTrigger(e)),
            usage: "{prefix}{command}",
            category: "Group Admin",
            groupLevel: GroupLevel.Admin,
            blockedChats: ["dm"],
            description: "Tag everyone in the group",
        });
    }

    async execute(client: WASocket, chat: Chat, message: Message, body?: string) {
        const group = await client.groupMetadata(message.to);

        const mentions = group.participants.map((participant) => participant.id);
        const quoted = (await message.getQuoted()) ? (await message.getQuoted())?.raw ?? message.raw : message.raw;

        messagingService.sendMessage(
            message.to,
            {
                text: `${group.subject}\nEveryone!\n${mentions.map((mention) => `@${mention.split("@")[0]}`).join(" ")}`,
                mentions: mentions,
            },
            {quoted: quoted ?? undefined},
        );
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

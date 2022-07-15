import {WASocket} from "@adiwajshing/baileys";
import {Chat} from "../../../../chats";
import {messagingService} from "../../../../constants/services";
import Message from "../../../../message/message";
import Command from "../../../command";
import CommandTrigger from "../../../command_trigger";
import {GroupLevel} from "../../../../models";
import {getGroupPrivilegeMap} from "../../../../utils/group_utils";
import {BotClient} from "../../../../whatsapp_bot";
import {BlockedReason} from "../../../../blockable";

export default class JoinCommand extends Command {
    constructor() {
        super({
            triggers: [new CommandTrigger("join")],
            usage: "{prefix}{command}",
            category: "Groups",
            description: "Want me in another group? Use this command! (You can send me DMs too)",
        });
    }

    private groupInviteRegex: RegExp = RegExp(/(https?:\/\/)?chat\.whatsapp\.com\/(?:invite\/)?([a-zA-Z0-9_-]{22})/g);

    async execute(client: WASocket, chat: Chat, message: Message, body: string) {
        let matches = this.groupInviteRegex.exec(body ?? "");
        const quoted = await message.getQuoted();
        if ((!matches || (matches && matches.length == 0)) && quoted) matches = this.groupInviteRegex.exec(quoted.content ?? "");

        if (!matches || (matches && matches.length == 0)) {
            return await messagingService.reply(message, "You must quote or send along with the command a invite link", true);
        }

        const code = matches[2];
        try {
            client.groupAcceptInvite(code).then(async (res) => {
                const meta = await client.groupMetadata(res);
                await messagingService.reply(message, `Joined ${meta.subject}!`, true);
            });
            await messagingService.reply(message, "Joining the group...", true);
        } catch (e) {
            await messagingService.reply(message, "Failed to join group.\nI might've been kicked from it.", true);
        }
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}

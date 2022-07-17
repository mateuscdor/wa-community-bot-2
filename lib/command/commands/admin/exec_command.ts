import {WASocket} from "@adiwajshing/baileys";
import {BlockedReason} from "../../../blockable/blocked_reason";
import {Chat} from "../../../chats";
import {messagingService} from "../../../constants/services";
import Message from "../../../message/message";
import {DeveloperLevel} from "../../../database/models/user/developer_level";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";

export default class ExecCommand extends Command {
    constructor() {
        super({
            triggers: [new CommandTrigger("exec")],
            developerLevel: DeveloperLevel.Operator,
            usage: "{prefix}{command}",
            category: "Bot Operator",
            description: "Gotta test stuff live action style",
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
        await messagingService.reply(msg, "*Result*:\n\n" + eval(body), true);
    }
}

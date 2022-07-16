import {WASocket} from "@adiwajshing/baileys";
import {BlockedReason} from "../../../blockable/blocked_reason";
import {Chat} from "../../../chats";
import {messagingService} from "../../../constants/services";
import Message from "../../../message/message";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";

export default class CodeCommand extends Command {
    constructor() {
        super({
            triggers: ["code", "קוד"].map(e => new CommandTrigger(e)),
            usage: "{prefix}{command}",
            category: 'Info',
            description: "Get the code to the bot",
        });
    }

    async onBlocked(msg: Message, blockedReason: BlockedReason) {}

    async execute(client: WASocket, chat: Chat, msg: Message, body: string) {
        await messagingService.reply(msg, `https://github.com/Heknon/wa-community-bot-2`, true);
    }
}

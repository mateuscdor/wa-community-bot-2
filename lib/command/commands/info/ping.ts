import {WASocket} from "@adiwajshing/baileys";
import moment from "moment";
import {BlockedReason} from "../../../blockable/blocked_reason";
import {Chat} from "../../../chats";
import {messagingService} from "../../../constants/services";
import Message from "../../../message/message";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";

export default class PingCommand extends Command {
    constructor() {
        super({
            triggers: [new CommandTrigger("ping")],
            usage: "{prefix}{command}",
            category: 'Info',
            description: "Ping the bot",
        });
    }

    async onBlocked(msg: Message, blockedReason: BlockedReason) {}

    async execute(client: WASocket, chat: Chat, msg: Message, body: string) {
        const time = Math.abs(Date.now() - Number(msg.raw!.messageTimestamp!) * 1000);
        await messagingService.reply(msg, `Pong! ${time}ms`, true);
    }
}

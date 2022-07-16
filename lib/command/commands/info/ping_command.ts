import {WASocket} from "@adiwajshing/baileys";
import {BlockedReason} from "../../../blockable/blocked_reason";
import {Chat, ChatLevel} from "../../../chats";
import {messagingService} from "../../../constants/services";
import Message from "../../../message/message";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";

export default class PingCommand extends Command {
    constructor() {
        super({
            triggers: ["ping", "bot", "פינג", "בוט"].map((e) => new CommandTrigger(e)),
            usage: "{prefix}{command}",
            category: "Info",
            description: "Ping the bot",
            cooldowns: new Map([
                [ChatLevel.Free, 500],
                [ChatLevel.Premium, 200],
                [ChatLevel.Sponser, 0],
            ]),
        });
    }

    async onBlocked(msg: Message, blockedReason: BlockedReason) {}

    async execute(client: WASocket, chat: Chat, msg: Message, body: string) {
        const time = Math.abs(Date.now() - Number(msg.raw!.messageTimestamp!) * 1000);
        await messagingService.reply(msg, `Pong! ${time}ms`, true);
    }
}

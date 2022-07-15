import {jidDecode, WASocket} from "@adiwajshing/baileys";
import {BlockedReason} from "../../../blockable/blocked_reason";
import {Chat} from "../../../chats";
import {messagingService, userRepository} from "../../../constants/services";
import Message from "../../../message/message";
import {buildVCardFromJID, extractNumberFromString, formatNumberToJID} from "../../../utils/utils";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";

export default class VCardCommand extends Command {
    constructor() {
        super({
            triggers: [new CommandTrigger("vcard")],
            usage: "{prefix}{command}",
            description: "Sends VCard of a number",
        });
    }

    async onBlocked(msg: Message, blockedReason: BlockedReason) {}

    async execute(client: WASocket, chat: Chat, msg: Message, body: string) {
        const jid = formatNumberToJID(extractNumberFromString(body));
        const vcard = await buildVCardFromJID(jid);
        const user = await userRepository.get(jid);
        if (!vcard) {
            return await messagingService.reply(msg, "הזן מספר טלפון לאחר הפקודה", true);
        }

        const name = user?.getFullDefaultingName() || jidDecode(jid)!.user;
        await messagingService.sendMessage(msg.raw?.key.remoteJid!, {
            contacts: {
                contacts: [
                    {
                        vcard: vcard.toString(),
                        displayName: name,
                    },
                ],
            },
        });
    }
}

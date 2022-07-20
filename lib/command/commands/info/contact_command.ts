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
            triggers: ["contact", "vcard", "איש קשר"].map(e => new CommandTrigger(e)),
            usage: "{prefix}{command}",
            category: "Info",
            description: "Sends VCard (Contact card) of a number",
        });
    }

    async onBlocked(msg: Message, blockedReason: BlockedReason) {}

    async execute(client: WASocket, chat: Chat, msg: Message, body: string) {
        let jid = body
            .replace(" ", "")
            .split(" ")
            .shift()
            ?.replace("+", "")
            .replace(/-/g, "")
            .replace(/(?<=\d\d\d) /g, "");
        if (jid?.startsWith("0")) {
            jid = "972" + jid.slice(1);
        }
        if (jid && !jid.endsWith("@s.whatsapp.net")) jid += "@s.whatsapp.net";
        const vcard = jid ? await buildVCardFromJID(jid) : undefined;
        const user = jid ? await userRepository.get(jid) : undefined;
        if (!vcard || !jid) {
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

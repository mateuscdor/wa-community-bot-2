import {isJidGroup, isJidUser, WASocket} from "@adiwajshing/baileys";
import {Chat} from "../../../../chats";
import {messagingService} from "../../../../constants/services";
import Message from "../../../../message/message";
import Command from "../../../command";
import CommandTrigger from "../../../command_trigger";
import vCard from "vcard-parser";
import {GroupLevel} from "../../../../models";
import {getGroupPrivilegeMap} from "../../../../utils/group_utils";
import {BotClient} from "../../../../whatsapp_bot";
import {BlockedReason} from "../../../../blockable";

export default class AddCommand extends Command {
    constructor() {
        super({
            triggers: [new CommandTrigger("add")],
            usage: "{prefix}{command}",
            category: "Group Admin",
            groupLevel: GroupLevel.Admin,
            blockedChats: ["dm"],
            description: "Add a user to the group using a phone number or vcard (>>add 05XXXXXXXX)",
        });
    }

    async execute(client: WASocket, chat: Chat, message: Message, body?: string) {
        const adminMap = await getGroupPrivilegeMap(client, message.to);
        const iAmAdmin: boolean = adminMap[BotClient.currentClientId!] > 0;

        if (!iAmAdmin) {
            return await messagingService.reply(message, "Give the bot admin access in order to use this command.", true);
        } else if (!message.raw) {
            return await messagingService.reply(message, "There seems to have been an error. Please try again.", true);
        }

        let vcards =
            message.raw.message?.extendedTextMessage?.contextInfo?.quotedMessage?.contactMessage?.vcard ||
            message.raw.message?.extendedTextMessage?.contextInfo?.quotedMessage?.contactsArrayMessage?.contacts!.map((contact) => contact.vcard) ||
            [];

        if (vcards.length > 0) {
            const allNumbers = new Set<string>();
            if (vcards && typeof vcards == typeof "") {
                vcards = [vcards as string];
            }

            (vcards as string[]).forEach(async (vcard) => {
                const vc = vCard.parse(vcard);
                const numbers = vc.tel.map((telObject) => {
                    return telObject.meta["waid"] + "@s.whatsapp.net";
                });

                numbers.forEach((n) => allNumbers.add(n));
            });

            let failedList: Array<string> = [];
            for (const number of allNumbers) {
                try {
                    await client.groupParticipantsUpdate(message.to, [number], "add");
                } catch (error) {
                    console.error(error);
                    failedList.push(number);
                }
            }
            if (failedList.length > 0) {
                return messagingService.reply(message, `Failed 😢\nFailed to add: ${failedList.join(", ")}`, true);
            }

            return messagingService.reply(message, "Success 🎊", true);
        }

        if (!body) {
            return messagingService.reply(message, "You must either provide a body with phone numbers or contact vcards", true);
        }

        const numbers = [...body.matchAll(/\d+/gim)]
            .map((num) => {
                let number = parseInt(num[0]).toString();
                if (number.startsWith("5")) {
                    number = "972" + number;
                }
                if (!number.endsWith("@s.whatsapp.net")) number += "@s.whatsapp.net";
                return number;
            })
            .filter((num) => isJidUser(num));

        let failedList: Array<string> = [];
        for (const number of numbers) {
            try {
                await client.groupParticipantsUpdate(message.to, [number], "add");
            } catch (error) {
                console.error(error);
                failedList.push(number);
            }
        }
        if (failedList.length > 0) {
            return messagingService.reply(message, `Failed 😢\nFailed to add: ${failedList.join(", ")}`, true);
        }

        return messagingService.reply(message, "Success 🎊", true);
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}

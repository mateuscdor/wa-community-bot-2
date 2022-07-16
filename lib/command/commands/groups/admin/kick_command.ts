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

export default class KickCommand extends Command {
    constructor() {
        super({
            triggers: ["kick", "תעיף"].map(e => new CommandTrigger(e)),
            usage: "{prefix}{command}",
            category: "Group Admin",
            groupLevel: GroupLevel.Admin,
            blockedChats: ["dm"],
            description: "Kick someone from the group (>>kick @tag)",
        });
    }

    async execute(client: WASocket, chat: Chat, message: Message, body?: string) {
        const adminMap = await getGroupPrivilegeMap(client, message.to);
        const senderPrivilegeLevel = adminMap[message.from];
        const iAmAdmin: boolean = adminMap[BotClient.currentClientId!] > 0;

        if (!iAmAdmin) {
            return await messagingService.reply(message, "Give the bot admin access in order to use this command.", true);
        } else if (!message.raw) {
            return await messagingService.reply(message, "There seems to have been an error. Please try again.", true);
        }

        const kickListSet = new Set<string>();
        const kickList: string[] = [];
        (message.raw.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? []).forEach((kick: string) => kickListSet.add(kick));
        if (!kickListSet) {
            return await messagingService.reply(message, "In order to kick someone you must tag them in this command.", true);
        }

        let attemptedSameLevelKick = false;
        const kickIncludesBot = kickList.includes(BotClient.currentClientId!);
        for (const kick of kickListSet) {
            if (adminMap[kick] >= senderPrivilegeLevel) {
                attemptedSameLevelKick = true;
                continue;
            }

            kickList.push(kick);
        }

        let errorMessage = "";
        if (kickIncludesBot) errorMessage += "I can't kick myself 😕\nTry using >>gtfo";
        if (attemptedSameLevelKick)
            errorMessage += kickIncludesBot
                ? "\nIt also seems like you tried to kick an admin when you are an admin 🤦‍♂️"
                : "You cannot kick an admin if you are an admin";

        if (kickIncludesBot || attemptedSameLevelKick) {
            return await messagingService.reply(message, errorMessage, true);
        }

        let failedList: Array<string> = [];
        for (const number of kickList) {
            try {
                await client.groupParticipantsUpdate(message.to, [number], "remove");
            } catch (error) {
                console.error(error);
                failedList.push(number);
            }
        }

        if (failedList.length > 0) {
            return messagingService.reply(message, `Failed 😢\nFailed to kick: ${failedList.join(", ")}`, true);
        }

        await messagingService.reply(message, "Success 🎉🥳🥳", true);
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

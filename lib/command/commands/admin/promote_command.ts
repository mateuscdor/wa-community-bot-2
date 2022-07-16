import {isJidUser, WASocket} from "@adiwajshing/baileys";
import {BlockedReason} from "../../../blockable";
import {Chat} from "../../../chats";
import {messagingService, userRepository} from "../../../constants/services";
import {DeveloperLevel} from "../../../database/models";
import {Message} from "../../../message";
import {fullEnumSearch} from "../../../utils/enum_utils";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";

export default class PromoteCommand extends Command {
    constructor() {
        super({
            triggers: [new CommandTrigger("promote")],
            developerLevel: DeveloperLevel.Operator,
            usage: "{prefix}{command}",
            category: "Bot Operator",
            description: "Give a user a certain privilege level",
        });
    }

    async execute(client: WASocket, chat: Chat, message: Message, body?: string) {
        const splitBody = body?.split(" ");
        const level = fullEnumSearch(DeveloperLevel, splitBody?.shift() ?? "") ?? 0;

        if (!level) {
            let enumKeys = Object.keys(DeveloperLevel);
            enumKeys = enumKeys.slice(enumKeys.length / 2);

            const privilegesText = Array.from(Array(enumKeys.length).keys())
                .map((key) => `*${key}*. ${enumKeys[key]}`)
                .join("\n");
            return messagingService.reply(message, `Please provide the privilege level the users should be promoted to.\n\n${privilegesText}`, true);
        }

        const mentionedSet = new Set<string>();
        (message.raw?.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? []).forEach((mention: string) => mentionedSet.add(mention));
        if (mentionedSet.size === 0) {
            return messagingService.reply(message, "Please tag those you want to promote.");
        }

        for (const mention of mentionedSet) {
            if (!isJidUser(mention)) continue;

            await userRepository.update(mention, {$set: {developer_level: level}});
        }

        await messagingService.reply(message, `Updated the privilege level of all users tagged to ${DeveloperLevel[level]} (${level})`);
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}

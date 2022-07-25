import {isJidUser, WASocket} from "@adiwajshing/baileys";
import {BlockedReason} from "../../../blockable";
import {Chat} from "../../../chats";
import {chatRepository, messagingService, userRepository} from "../../../constants/services";
import {ChatLevel, DeveloperLevel} from "../../../database/models";
import {Message} from "../../../message";
import User from "../../../user/user";
import {fullEnumSearch} from "../../../utils/enum_utils";
import {extractNumberFromString, formatNumberToJID} from "../../../utils/utils";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";
import InteractableCommand from "../../interactable_command";
import languages from "../../../constants/language.json";

export default class GiveDonorCommand extends InteractableCommand {
    private language: typeof languages.commands["give donor"][Language];

    constructor(language: Language) {
        const langs = languages.commands["give donor"];
        const lang = langs[language];

        super({
            triggers: ["give donor"].map((e) => new CommandTrigger(e)),
            developerLevel: DeveloperLevel.Operator,
            usage: "{prefix}{command}",
            category: "Bot Operator",
            description: "Give a user a certain chat level",
            cooldowns: new Map(),
        });

        this.language = lang;
    }

    async execute(client: WASocket, chat: Chat, message: Message, body?: string) {
        const donorNumberQuestion =
            "*What is the phone number of the donator?*\n_(Please mention or enter the phone number)_";

        let donorJid: string | undefined;
        let donor: User | undefined;
        const donorNumberMsg = await this.waitForInteractionWith(
            message,
            async (msg) => {
                const body = msg.content;
                if (!body) return false;

                if (body.toLowerCase().trim().startsWith("cancel")) return true;

                const mentions = msg.raw?.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
                const phoneNumber = extractNumberFromString(body);

                if (mentions && mentions.length > 0) {
                    donorJid = mentions[0];
                } else if (phoneNumber) {
                    donorJid = formatNumberToJID(phoneNumber);
                }

                if (!donorJid) return false;

                if (!donor) {
                    return false;
                }

                return true;
            },
            (msg) => messagingService.reply(message, donorNumberQuestion, true),
            20 * 1000,
            () => messagingService.reply(message, "You took too long to respond. Please try again."),
        );

        if (!donorJid) {
            return await messagingService.reply(message, "You didn't enter a phone number.");
        }
        if (!donor) {
            return await messagingService.reply(message, "That user doesn't exist.");
        }

        let donorChatLevel: ChatLevel | undefined;
        const donorLevelMsg = await this.validatedWaitForInteractionWith(
            message,
            async (msg) => {
                const body = msg.content;
                if (!body) return false;

                const chatLevel = fullEnumSearch(ChatLevel, body.replace(/\D*/g, ""));
                if (!chatLevel) return false;

                donor = await userRepository.get(donorJid!, true);
                if (!donor) return true;
                if (donor.model.chatLevel === chatLevel) return true;

                if (chatLevel == donor!.model.chatLevel) donorChatLevel = chatLevel;
                return true;
            },
            20 * 1000,
            async () => {
                return messagingService.reply(message, "You took too long to respond. Please try again.");
            },
            "0 - Free",
            "1 - Premium",
            "2 - Sponsor",
        );

        if (!donor) {
            return await messagingService.reply(message, "That user doesn't exist.");
        } else if (donor!.model.chatLevel == donorChatLevel) {
            return await messagingService.reply(message, "That user already has that chat level.");
        }

        await userRepository.update(donorJid!, {$set: {chatLevel: donorChatLevel}});
        await messagingService.reply(message, `${donor.model.name} has been given the chat level ${donorChatLevel}!`);

        const donorChat = await chatRepository.get(donorJid!, true);
        let lang: typeof languages.commands["give donor"][Language] | undefined;
        if (!donorChat || !donorChat.model.language) {
            lang = languages.commands["give donor"]["hebrew"];
        } else if (donorChat.model.language) {
            lang = languages.commands["give donor"][donorChat.model.language];
        }

        if (!lang) {
            lang = languages.commands["give donor"]["hebrew"];
        }

        await messagingService.sendMessage(donorJid!, {text: lang.execution.thanks});
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}

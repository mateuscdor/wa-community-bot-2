import { isJidGroup, isJidUser } from "@adiwajshing/baileys";
import { whatsappBot } from "..";
import Blockable from "../blockable/blockable";
import { BlockedReason } from "../blockable/blocked_reason";
import Triggerable from "../blockable/triggerable";
import { Command } from "../command";
import { chatRepository, userRepository } from "../constants/services";
import Message from "../message/message";
import { getUserPrivilegeLevel } from "../utils/group_utils";
import BlockableHandler from "./blockable_handler";

export default class CommandHandler extends BlockableHandler<Message> {
    public prefix: string;
    public override blockables: Command[];
    protected callFailed: boolean = true;

    constructor(prefix: string) {
        super();
        this.prefix = prefix;
        this.blockables = [];
    }

    find(data: Message): [Triggerable<any>, Command][] | Promise<[Triggerable<any>, Command][]> {
        return this.findByContent(data.content ?? '', data);
    }

    findByContent(content: string, data?: Message): [Triggerable<any>, Command][] | Promise<[Triggerable<any>, Command][]> {
        const result: [Triggerable<any>, Command][] = []

        for (const blockable of this.blockables) {
            let foundTrigger: Triggerable<any> | undefined = undefined;

            for (const trigger of blockable.triggers) {
                const checkedData = content?.slice(this.prefix.length) ?? '';

                if (!trigger.isTriggered(checkedData)) continue;
                foundTrigger = trigger;
                break;
            }

            if (!foundTrigger) continue;
            result.push([foundTrigger, blockable]);
        }

        return result;
    }

    appliable(data: Message): boolean | Promise<boolean> {
        return data.content?.startsWith(this.prefix) ?? false;
    }

    async isBlocked(message: Message, blockable: Blockable<Message>): Promise<BlockedReason | undefined> {
        if (blockable.blockedChats.includes('group') && isJidGroup(message.raw?.key.remoteJid!)) {
            return BlockedReason.BlockedChat;
        }

        if (blockable.blockedChats.includes('dm') && isJidUser(message.raw?.key.remoteJid!)) {
            return BlockedReason.BlockedChat;
        }

        if (blockable.blacklistedJids.length > 0) {
            if (blockable.blacklistedJids.includes(message.from)) {
                return BlockedReason.Blacklisted;
            }

            if (isJidGroup(message.to) && blockable.blacklistedJids.includes(message.to)) {
                return BlockedReason.Blacklisted;

            }
        }

        if (isJidGroup(message.to) && blockable.groupLevel > 0) {
            const level = await getUserPrivilegeLevel(whatsappBot.client!, message.to, message.from);
            if (level < blockable.groupLevel) {
                return BlockedReason.InsufficientGroupLevel;
            }
        }

        const user = await userRepository.get(message.sender ?? '');
        if (!user) {
            return BlockedReason.InvalidUser;
        }

        if (blockable.developerLevel > 0 && (user?.model.developerLevel ?? 0) < blockable.developerLevel) {
            return BlockedReason.InsufficientDeveloperLevel;
        }


        // const chat = await chatRepository.get(message.to);
        if (blockable.chatLevel > 0 && (user?.model.chatLevel ?? 0) < blockable.chatLevel) {
            return BlockedReason.InsufficientChatLevel;
        }
    }

    add(...blockable: Command[]): void {
        super.add(...blockable);
    }

}

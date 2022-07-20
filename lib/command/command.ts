import {WASocket} from "@adiwajshing/baileys";
import Blockable from "../blockable/blockable";
import {BlockedReason} from "../blockable/blocked_reason";
import {Chat} from "../chats";
import {ChatLevel} from "../database/models/user/chat_level";
import Message from "../message/message";
import {DeveloperLevel} from "../database/models/user/developer_level";
import {GroupLevel} from "../models/group_level";
import CommandTrigger from "./command_trigger";

export default abstract class Command implements Blockable<Message> {
    triggers: CommandTrigger[];

    announcedAliases: string[];

    blockedChats: Array<"group" | "dm">;

    chatLevel: ChatLevel;

    developerLevel: DeveloperLevel;

    blacklistedJids: string[];

    whitelistedJids: string[];

    minArgs: number;

    usage: string;

    name: string;

    category: string | undefined;

    description: string;

    extendedDescription: string;

    cooldowns: Map<ChatLevel, number>;

    groupLevel: GroupLevel;

    constructor({
        triggers,
        blockedChats = [],
        chatLevel: allowedChatLevel = ChatLevel.Free,
        developerLevel = DeveloperLevel.None,
        blacklistedJids = [],
        whitelistedJids = [],
        minArgs = 0,
        usage = "{prefix}{command}",
        description = "",
        name,
        cooldowns = new Map([
            [ChatLevel.Free, 2000],
            [ChatLevel.Premium, 1000],
            [ChatLevel.Sponser, 500],
        ]),
        groupLevel = GroupLevel.None,
        category = undefined,
        extendedDescription = "",
        announcedAliases,
    }: {
        triggers: CommandTrigger[];
        blockedChats?: ("group" | "dm")[];
        chatLevel?: ChatLevel;
        developerLevel?: DeveloperLevel;
        blacklistedJids?: string[];
        whitelistedJids?: string[];
        minArgs?: number;
        name?: string;
        usage?: string;
        description?: string;
        cooldowns?: Map<ChatLevel, number>;
        groupLevel?: GroupLevel;
        category?: string;
        extendedDescription?: string;
        announcedAliases?: string[];
    }) {
        this.triggers = triggers;
        this.blockedChats = blockedChats;
        this.chatLevel = allowedChatLevel;
        this.developerLevel = developerLevel;
        this.blacklistedJids = blacklistedJids;
        this.whitelistedJids = whitelistedJids;
        this.minArgs = minArgs;
        this.usage = usage;
        this.description = description;
        this.cooldowns = cooldowns;
        this.groupLevel = groupLevel;
        this.category = category;
        this.extendedDescription = extendedDescription;
        this.announcedAliases = announcedAliases ?? this.triggers.map((e) => e.command);
        this.name = name ?? this.announcedAliases[0] ?? this.mainTrigger.command;
    }

    abstract execute(client: WASocket, chat: Chat, data: Message, body: string, ...args: string[]): Promise<any> | any;

    abstract onBlocked(data: Message, blockedReason: BlockedReason): Promise<any> | any;

    public get mainTrigger() {
        return this.triggers[0];
    }
}

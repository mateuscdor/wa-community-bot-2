import {proto, WASocket} from "@adiwajshing/baileys";
import {BlockedReason} from "../../../blockable";
import {Chat} from "../../../chats";
import {messagingService} from "../../../constants/services";
import {ChatLevel, DeveloperLevel} from "../../../database/models";
import CommandHandler from "../../../handlers/command_handler";
import Message from "../../../message/message";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";

export default class HelpCommand extends Command {
    command: string = "help";
    help: string = "This message";
    help_category: string = "Info";

    private commandHandler: CommandHandler;

    constructor(commandHandler: CommandHandler) {
        super({
            triggers: ["help", "עזרה"].map((e) => new CommandTrigger(e)),
            usage: "{prefix}{command}",
            category: "Info",
            description: "This message",
        });
        this.commandHandler = commandHandler;
    }

    async execute(client: WASocket, chat: Chat, message: Message, body?: string) {
        const allCommands = this.commandHandler.blockables;
        const filteredCommands: Array<Command> = [];
        let sendInGroup = true;

        for (const command of allCommands) {
            if (!command.mainTrigger.command) continue;
            if (command.mainTrigger.command == this.command) continue;

            if ((await this.commandHandler.isBlocked(message, command, false)) != undefined) continue;

            if (command.developerLevel >= DeveloperLevel.Moderator) sendInGroup = false;
            filteredCommands.push(command);
        }

        const prefix = chat.model.commandPrefix;
        let helpMessage = "*----- HELP ME I'M RETARDED ----*\n";
        const sections: Map<string, proto.ISection> = new Map();
        let id = 0;
        for (const command of filteredCommands) {
            const sectionKey = command.category?.toLowerCase() ?? "misc";
            if (!sections.has(sectionKey)) {
                sections.set(sectionKey, {title: command.category?.toUpperCase() ?? "MISC", rows: new Array<proto.IRow>()});
            }

            const section = sections.get(sectionKey);
            const formattedDescription = `*Description:*\n${command.description}\n\n*Aliases:*\n${command.triggers
                .map((e) => e.command)
                .join(", ")}\n\n*Cooldowns:*\n${Array.from(command.cooldowns.entries())
                .map((e) => `${ChatLevel[e[0]]}: ${e[1] / 1000}s`)
                .join("\n")}`;
            section?.rows?.push({
                title: command.usage.replace(/{prefix}/gi, prefix).replace(/{command}/gi, command.mainTrigger.command),
                description: command.description,
                rowId: `HELP_COMMAND-${id}\n${command.triggers.map((e) => prefix + e.command).join("\n")}\n\r${formattedDescription}`,
            });

            id++;
        }

        // helpMessage += "@ everyone - Will tag everyone in a group chat. (Do not include the space after @) (Only available to admins)\n\n"
        if (!sections.has("misc")) {
            sections.set("misc", {title: "MISC", rows: new Array<proto.IRow>()});
        }

        sections.get("misc")?.rows?.push({title: "@everyone", description: "Tag everyone in the group", rowId: "HELP_COMMAND-" + id});
        helpMessage += "מקווה שעזרתי ✌\n";
        helpMessage += "~bot";
        const footer =
            "Please consider supporting the bot by donating to the Patreon!\n\nIn the future, donators will receive special perks!\nhttps://www.patreon.com/wailcommunitybot";

        if (sendInGroup || message.content?.toLowerCase()?.includes("here"))
            await messagingService.sendMessage(
                message.raw?.key.remoteJid!,
                {
                    text: helpMessage,
                    buttonText: "Click me for help!",
                    sections: Array.from(sections.entries()).map((arr) => arr[1] as proto.ISection),
                    footer,
                },
                {quoted: message.raw!},
            );
        else {
            messagingService.replyAdvanced(message, {text: "Check your DMs!"}, true);
            messagingService.sendMessage(
                message.sender!,
                {
                    text: helpMessage,
                    buttonText: "Click me for help!",
                    sections: Array.from(sections.entries()).map((arr) => arr[1] as proto.ISection),
                    footer,
                },
                {quoted: message.raw!},
            );
        }
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}

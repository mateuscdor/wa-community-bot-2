import {isJidGroup, proto, WASocket} from "@adiwajshing/baileys";
import {BlockedReason} from "../../../blockable";
import {Chat} from "../../../chats";
import {messagingService, userRepository} from "../../../constants/services";
import {ChatLevel, DeveloperLevel} from "../../../database/models";
import CommandHandler from "../../../handlers/command_handler";
import Message from "../../../message/message";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";
import languages from "../../../constants/language.json";
import {applyPlaceholders} from "../../../utils/message_utils";

export default class HelpCommand extends Command {
    private commandHandler: CommandHandler;
    private language: typeof languages.commands.help[Language];
    private langCode: Language;

    constructor(language: Language, commandHandler: CommandHandler) {
        const langs = languages.commands.help;
        const lang = langs[language];
        super({
            triggers: langs.triggers.map((e) => new CommandTrigger(e)),
            announcedAliases: lang.triggers,
            usage: lang.usage,
            category: lang.category,
            description: lang.description,
        });

        this.language = lang;
        this.langCode = language;
        this.commandHandler = commandHandler;
    }

    async execute(client: WASocket, chat: Chat, message: Message, body?: string) {
        const prefix = chat.model.commandPrefix;

        const user = await userRepository.get(message.sender ?? "");
        const cmdArg = body?.trim().startsWith(prefix) ? body.trim() : prefix + body?.trim();
        const cmdArgRes = await chat.getCommandByTrigger(cmdArg);
        const isBlocked = cmdArgRes ? await this.commandHandler.isBlocked(message, cmdArgRes, false) : undefined;
        if (
            cmdArgRes &&
            (isBlocked == undefined ||
                ![BlockedReason.InsufficientDeveloperLevel, BlockedReason.NotWhitelisted].includes(isBlocked))
        ) {
            let id = 0;
            const desc =
                `*${prefix}${cmdArgRes.name}*\n\n` +
                (await applyPlaceholders(this.getCommandExtendedDescription(cmdArgRes), {
                    message,
                    command: cmdArgRes,
                    chat: chat,
                    user,
                }));
            const buttons: proto.IButton[] = cmdArgRes.announcedAliases.map((alias) => {
                return {buttonId: (id++).toString(), buttonText: {displayText: prefix + alias}};
            });
            return messagingService.replyAdvanced(
                message,
                {text: desc, buttons: buttons, footer: `(${prefix}help ${cmdArgRes.name})`},
                true,
            );
        }

        const allCommands = this.commandHandler.blockables;
        const filteredCommands: Array<Command> = [];
        let sendInGroup = true;

        for (const command of allCommands) {
            if (!command.mainTrigger.command) continue;
            if (command.mainTrigger.command == this.mainTrigger.command) continue;

            if ((await this.commandHandler.isBlocked(message, command, false)) != undefined) continue;

            if (command.developerLevel >= DeveloperLevel.Moderator) sendInGroup = false;
            filteredCommands.push(command);
        }

        let helpMessage = `${this.language.execution.prefix}\n\n`;
        const sections: Map<string, proto.ISection> = new Map();
        let id = 0;
        for (const command of filteredCommands) {
            const sectionKey = command.category?.toLowerCase() ?? this.language.execution.misc.toLowerCase();
            if (!sections.has(sectionKey)) {
                sections.set(sectionKey, {
                    title: command.category?.toUpperCase() ?? this.language.execution.misc.toUpperCase(),
                    rows: new Array<proto.IRow>(),
                });
            }

            const section = sections.get(sectionKey);
            const formattedDescription = await applyPlaceholders(this.getCommandExtendedDescription(command), {
                message,
                command,
                chat,
                user,
            });
            section?.rows?.push({
                title: prefix + command.name,
                description: command.description,
                rowId: `HELP_COMMAND-${id}\n${command.announcedAliases
                    .map((e) => `{prefix}${e}`)
                    .join("\n")}\n\r${formattedDescription}`,
            });

            id++;
        }

        for (const section of sections.values()) {
            helpMessage += `*${section.title}*\n`;
            for (const row of section.rows ?? []) {
                helpMessage += `● ${row.title}\n${row.description}\n\n`;
            }

            // remove last newline
            helpMessage = helpMessage.slice(0, -1);
            helpMessage += "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=\n";
        }

        helpMessage += `${this.language.execution.suffix}`;

        if (sendInGroup || ["here", "כאן"].some((e) => message.content?.trim().toLowerCase().includes(e))) {
            await messagingService.replyAdvanced(
                message,
                {
                    text: helpMessage,
                    // buttonText: this.language.execution.button,
                    // sections: Array.from(sections.entries()).map((arr) => arr[1] as proto.ISection),
                    // footer: this.language.execution.footer,
                },
                true,
                {placeholder: this.getDefaultPlaceholder({chat, message, user})},
            );
        } else {
            if (isJidGroup(message.to))
                messagingService.replyAdvanced(message, {text: this.language.execution.dms}, true);
            await messagingService.replyAdvanced(
                message,
                {
                    text: helpMessage,
                    // buttonText: this.language.execution.button,
                    // sections: Array.from(sections.entries()).map((arr) => arr[1] as proto.ISection),
                    // footer: this.language.execution.footer,
                },
                true,
                {privateReply: true, placeholder: this.getDefaultPlaceholder({chat, message, user})},
            );
        }
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}

    private getCommandExtendedDescription(command: Command) {
        return `*${this.language.execution.description}:*\n${command.description}${
            command.extendedDescription ? "\n\n" : ""
        }${command.extendedDescription}\n\n*${this.language.execution.aliases}:*\n${command.triggers
            .map((e) => e.command)
            .join(", ")}\n\n*${this.language.execution.cooldowns}:*\n${Array.from(command.cooldowns.entries())
            .map((e) => `${languages.ranks[this.langCode][ChatLevel[e[0]].toLowerCase()]}: ${e[1] / 1000}s`)
            .join("\n")}`;
    }
}

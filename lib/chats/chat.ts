import {AnyMessageContent, MiscMessageGenerationOptions} from "@adiwajshing/baileys";
import {ChildProcess} from "child_process";
import {whatsappBot} from "..";
import Blockable from "../blockable/blockable";
import Triggerable from "../blockable/triggerable";
import {Command, CommandTrigger} from "../command";
import {
    PromoteCommand,
    AnonymousCommand,
    LmgtfyCommand,
    MP3Command,
    SpoofCommand,
    StickerCommand,
    AddCommand,
    DeleteCommand,
    GtfoCommand,
    KickCommand,
    EveryoneCommand,
    JoinCommand,
    CreatorCommand,
    GptCommand,
    HelpCommand,
    VCardCommand,
    PingCommand,
    RawCommand,
    CodeCommand,
    JIDCommand,
    ExecCommand,
    ShutdownCommand,
    ReminderCommand,
    ReputationCommand,
    SpeechToTextCommand,
    LanguageCommand,
} from "../command/commands";
import {
    BalanceCommand,
    BegCommand,
    DailyCommand,
    DepositCommand,
    GiveBalanceCommand,
    HighlowCommand,
    WithdrawCommand,
} from "../command/commands/economy";
import {messageRepository, messagingService, userRepository} from "../constants/services";
import ChatModel from "../database/models/chat/chat_model";
import BlockableHandler from "../handlers/blockable_handler";
import CommandHandler from "../handlers/command_handler";
import Message from "../message/message";

export default abstract class Chat {
    public model: ChatModel;
    private registeredHandlers: boolean = false;

    public handlers: Array<BlockableHandler<any>>;
    public routineCommandHandler: CommandHandler = new CommandHandler("");

    constructor(model: ChatModel) {
        this.model = model;
        this.handlers = [];
        this.routineCommandHandler = new CommandHandler("");
    }

    async setupHandlers() {
        if (this.registeredHandlers) return;
        this.handlers.push(new CommandHandler(this.model.commandPrefix));
        this.registeredHandlers = true;

        await this.registerUserCommands();
    }

    async registerUserCommands() {
        const handler = this.commandHandler;
        handler?.clear()

        // bot admin tools
        handler?.add(new JIDCommand());
        handler?.add(new PromoteCommand());
        handler?.add(new RawCommand());
        handler?.add(new ShutdownCommand());
        handler?.add(new ExecCommand());

        // fun commands
        handler?.add(new AnonymousCommand(this.model.language));
        handler?.add(new LmgtfyCommand(this.model.language));
        handler?.add(new MP3Command(this.model.language));
        handler?.add(new SpoofCommand());
        handler?.add(new StickerCommand());
        handler?.add(new ReminderCommand(this.model.language));
        handler?.add(new ReputationCommand());

        // group admin commands
        handler?.add(new AddCommand());
        handler?.add(new DeleteCommand(this.model.language));
        handler?.add(new GtfoCommand());
        handler?.add(new KickCommand());
        handler?.add(new EveryoneCommand());

        // bot outreach commands
        handler?.add(new JoinCommand());

        // bot info commands
        handler?.add(new CreatorCommand());
        handler?.add(new GptCommand());
        handler?.add(new HelpCommand(this.commandHandler!));
        handler?.add(new VCardCommand());
        handler?.add(new PingCommand());
        handler?.add(new CodeCommand());
        handler?.add(new SpeechToTextCommand());

        // bot eco commands
        handler?.add(new BalanceCommand());
        handler?.add(new GiveBalanceCommand());
        handler?.add(new DailyCommand());
        handler?.add(new HighlowCommand());
        handler?.add(new DepositCommand());
        handler?.add(new BegCommand());
        handler?.add(new WithdrawCommand());

        // bot misc commands
        handler?.add(new LanguageCommand());
    }

    async getHandlers<J>(data: J) {
        const filtered: Array<BlockableHandler<any>> = [];

        for (const handler of this.handlers) {
            if (await handler.appliable(data)) {
                filtered.push(handler);
            }
        }

        return filtered;
    }

    async handleMessage(message: Message) {
        await this.registerMessageToDB(message);

        // dont execute blockable if message is from bot
        if (message.fromMe) return;
        const handlers = (await this.getHandlers(message)) ?? [];
        for (const handler of handlers) {
            const res = await handler.find(message);

            for (const [trigger, blockable] of res) {
                const isBlocked = await handler.isBlocked(message, blockable, true, trigger);

                if (isBlocked != undefined) {
                    return await blockable.onBlocked(message, isBlocked);
                }

                await this.executeBlockable(message, message.content ?? "", trigger, blockable, handler);
            }
        }
    }

    async isExecutableCommand(message: Message): Promise<[boolean, Command[] | undefined]> {
        const handler = this.commandHandler;
        if (!handler) return [false, undefined];

        const res = await handler.find(message);
        const executables: Command[] = [];

        for (const [trigger, blockable] of res) {
            const isBlocked = await handler.isBlockedCheck(message, blockable, true, trigger);

            if (isBlocked != undefined) {
                return [false, undefined];
            }

            if (blockable instanceof Command) {
                executables.push(blockable);
            }
        }

        return [true, executables];
    }

    async getCommandByTrigger(trigger: string): Promise<Command | undefined> {
        const handler = this.commandHandler;
        if (!handler) return undefined;

        const res = await handler.findByContent(trigger);
        for (const [, blockable] of res) {
            if (blockable instanceof Command) {
                return blockable;
            }
        }
    }

    public async executeBlockable(
        message: Message,
        command: string,
        trigger: Triggerable<any> | undefined,
        blockable: Blockable<any>,
        handler: BlockableHandler<any>,
    ): Promise<any> {
        if (handler instanceof CommandHandler && blockable instanceof Command && trigger instanceof CommandTrigger) {
            const body = command.slice(handler.prefix.length + trigger.command.length + 1) ?? "";
            const user = await userRepository.get(message.from);
            // add command cooldown to user
            await user?.addCooldown(message.raw?.key.remoteJid!, blockable);
            blockable.execute(whatsappBot.client!, this, message, body, body, ...body.split(" "));
        }
    }

    private async registerMessageToDB(message: Message) {
        const model = message.model;
        try {
            await messageRepository.create(model);
        } catch (err) {
            console.error(`MESSAGE ${message.id} ALREADY LOGGED TO DATABASE`);
            console.error(err);
        }
    }

    public get commandHandler(): CommandHandler | undefined {
        return this.handlers.find((handler) => handler instanceof CommandHandler) as CommandHandler;
    }

    public getCommandByClass(clazz: any) {
        return this.commandHandler?.blockables.filter((e) => e instanceof clazz)[0];
    }  
}

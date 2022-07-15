import {whatsappBot} from "..";
import Blockable from "../blockable/blockable";
import Triggerable from "../blockable/triggerable";
import {Command, CommandTrigger, JIDCommand} from "../command";
import {chatRepository, messageRepository} from "../constants/services";
import ChatModel from "../database/models/chat/chat_model";
import BlockableHandler from "../handlers/blockable_handler";
import CommandHandler from "../handlers/command_handler";
import Message from "../message/message";
import {TimestampedData} from "../models";
import VCardCommand from "../command/commands/info/vcard_command";
import PromoteCommand from "../command/commands/admin/promote_command";
import AnonymousCommand from "../command/commands/fun/anonymous_command";
import LmgtfyCommand from "../command/commands/fun/lmgtfy_command";
import MP3Command from "../command/commands/fun/mp3_command";
import SpoofCommand from "../command/commands/fun/spoof_command";
import StickerCommand from "../command/commands/fun/sticker_command";
import AddCommand from "../command/commands/groups/admin/add_command";
import DeleteCommand from "../command/commands/groups/admin/delete_command";
import GtfoCommand from "../command/commands/groups/admin/gtfo_command";
import KickCommand from "../command/commands/groups/admin/kick_command";
import JoinCommand from "../command/commands/groups/outreach/join_command";
import CreatorCommand from "../command/commands/info/creator_command";
import GptCommand from "../command/commands/info/gpt_command";
import HelpCommand from "../command/commands/info/help_command";

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

        // bot admin tools
        handler?.add(new JIDCommand());
        handler?.add(new PromoteCommand());

        // fun commands
        handler?.add(new AnonymousCommand());
        handler?.add(new LmgtfyCommand());
        handler?.add(new MP3Command());
        handler?.add(new SpoofCommand());
        handler?.add(new StickerCommand());

        // group admin commands
        handler?.add(new AddCommand());
        handler?.add(new DeleteCommand());
        handler?.add(new GtfoCommand());
        handler?.add(new KickCommand());

        // bot outreach commands
        handler?.add(new JoinCommand());

        // bot info commands
        handler?.add(new CreatorCommand());
        handler?.add(new GptCommand());
        handler?.add(new HelpCommand(this.commandHandler!));
        handler?.add(new VCardCommand());
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

        const handlers = (await this.getHandlers(message)) ?? [];
        for (const handler of handlers) {
            const res = await handler.find(message);

            for (const [trigger, blockable] of res) {
                const isBlocked = await handler.isBlocked(message, blockable);

                if (isBlocked) {
                    return await blockable.onBlocked(message, isBlocked);
                }

                await this.executeBlockable(message, message.content ?? "", trigger, blockable, handler);
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
            await blockable.execute(whatsappBot.client!, this, message, body, body, ...body.split(" "));
        }
    }

    private async registerMessageToDB(message: Message) {
        const model = message.model;
        try {
            await messageRepository.create(model);
        } catch (err) {
            console.error(`MESSAGE ${model.id} ALREADY LOGGED TO DATABASE`);
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

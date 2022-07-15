import { AnyMessageContent, isJidGroup, MiscMessageGenerationOptions, WAMessage, WASocket } from "@adiwajshing/baileys";
import { assert } from "console";
import { ObjectId } from "mongodb";
import Message from "./message/message";
import MessageMetadata from "./message/message_metadata";

export default class MessagingService {
    private client: WASocket | undefined;
    private metadataEnabled: boolean;
    private metadataAssignment: Map<string, MessageMetadata>;
    private messageCallbacks: [callbackId: ObjectId, filter: (message: Message) => Promise<boolean> | boolean, callback: (message: Message) => Promise<any> | any][]

    private _shouldIgnore: boolean = false;

    constructor(client?: WASocket, metadataEnabled: boolean = true) {
        this.client = client;
        this.metadataAssignment = new Map();
        this.messageCallbacks = [];
        this.metadataEnabled = metadataEnabled;
    }

    /**
     * must be ran in order to have messaging services enabled
     * @param message raw message from socket
     * @returns message model with metadata
     */
    public async messageInterceptor(message: WAMessage): Promise<Message> {
        let metadata: MessageMetadata | undefined;
        if (this.metadataEnabled) {
            metadata = this.metadataAssignment.get(message.key.id!);
            this.metadataAssignment.delete(message.key.id!);
        }

        const msg = await Message.fromWAMessage(message, metadata);
        for (const callbackData of this.messageCallbacks) {
            const [callbackId, filter, callback] = callbackData;
            if (await filter(msg)) {
                await callback(msg);
                this.removeMessageCallback(callbackId);
            }
        }
        

        return msg;
    }

    public async reply(
        message: Message,
        content: string,
        quote: boolean = false,
        privateReply: boolean = false,
        metadata?: MessageMetadata
    ) {
        await this.replyAdvanced(message, { text: content }, quote, privateReply, metadata);
    }

    public async replyAdvanced(
        message: Message,
        content: AnyMessageContent,
        quote: boolean = false,
        privateReply: boolean = false,
        metadata?: MessageMetadata
    ) {
        if (quote) {
            message.raw!.key.fromMe = false;
        }

        let recipient: string;
        if (isJidGroup(message.to)) {
            recipient = privateReply ? message.from : message.to;
        } else {
            recipient = message.fromMe ? message.to : message.from
        }

        return this._internalSendMessage(recipient, content, { "quoted": quote ? message.raw ?? undefined : undefined }, metadata);
    }

    public async sendMessage(recipient: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions, metadata?: MessageMetadata) {
        return this._internalSendMessage(recipient, content, options, metadata);
    }

    private async _internalSendMessage(
        recipient: string,
        content: AnyMessageContent,
        options?: MiscMessageGenerationOptions,
        metadata?: MessageMetadata
    ): Promise<Message> {
        try {
            assert(this.client, "Client must be set using setClient() method!");

            if (metadata) {
                metadata.meta.set("ignore", this._shouldIgnore)
            } else {
                metadata = new MessageMetadata(new Map<string, any>([["ignore", this._shouldIgnore]]))
            }


            const response = await this.client!.sendMessage(recipient, content, options);

            if (this.metadataEnabled && metadata) {
                this.metadataAssignment.set(response?.key.id!, metadata);
            }

            return Message.fromWAMessage(response!, metadata);
        } catch (error) {
            console.error("FAILED TO SEND MESSAGE");
            console.error(content);
            console.error(options);
            console.error(error);
            const response = await this.client!.sendMessage(recipient, { 'text': "Failed to send this message." }, options);
            return Message.fromWAMessage(response!, metadata);
        }
    }

    public addMessageCallback(filter: (message: Message) => boolean | Promise<boolean>, callback: (message: Message) => Promise<any> | any) {
        const id = new ObjectId();
        this.messageCallbacks.push([id, filter, callback]);
        return id;
    }

    public removeMessageCallback(id: ObjectId) {
        this.messageCallbacks = this.messageCallbacks.filter((e) => e[0] != id);
    }

    public setClient(client: WASocket) {
        this.client = client;
    }

    public setIgnoreMode(flag: boolean) {
        this._shouldIgnore = flag;
    }
}
import {isJidGroup, isJidUser} from "@adiwajshing/baileys";
import {ReturnDocument, UpdateFilter, WithId} from "mongodb";
import {Chat, GroupChat, DMChat} from ".";
import {chatsCollection} from "../database";
import {ChatModel, ChatType} from "../database/models";
import {normalizeJid} from "../utils/group_utils";

export default class ChatRepository {
    private repository: Map<string, Chat> = new Map<string, Chat>();

    public async get(jid: string | undefined, update: boolean = false): Promise<Chat | undefined> {
        if (!jid) return;
        jid = normalizeJid(jid);

        if (!jid || (!isJidUser(jid) && !isJidGroup(jid))) return;

        let chat: Chat | undefined = this.repository[jid];

        if (update || !chat) {
            chat = await this.fetch(jid);
        }

        if (chat) this.updateLocal(chat);

        chat?.setupHandlers();
        return chat;
    }

    public async update(jid: string | undefined, update: UpdateFilter<any>): Promise<Chat | undefined> {
        if (!jid) return;
        console.log(`entered: ${jid}`)
        jid = normalizeJid(jid);
        console.log(`exit: ${jid}`)

        if (!jid || (!isJidUser(jid) && !isJidGroup(jid))) return;

        if (!this.repository.has(jid)) {
            const chat = await this.fetch(jid);
            if (chat) this.updateLocal(chat);
        }

        let chat = this.repository.get(jid);
        if (!chat) return;
        if (!update || update.size === 0) return chat;

        const updateRes = await chatsCollection.updateOne({jid}, update);
        const res = await chatsCollection.findOne({jid}) || undefined;
        if (updateRes.acknowledged && res) {
            console.log("updated model: ");
            const model = res ? ChatModel.fromMap(res.value as WithId<Map<string, object>>) ?? undefined : undefined;
            console.log(model);
            if (model) {
                chat.model = model;
            }

            return chat;
        }

        const model = (await this.fetch(jid)) ?? undefined;
        if (model) chat.model = model.model;
        return chat;
    }

    public async fetch(jid: string | undefined): Promise<Chat | undefined> {
        let doc = await this.fetchDoc(jid);
        if (!doc) return;

        const model = ChatModel.fromMap(doc);
        let chat = this.repository.get(jid!);
        if (!chat) chat = this.initializeChatInstance(model);
        else chat.model = model;

        if (chat) this.updateLocal(chat);
        return chat;
    }

    public async fetchDoc(jid: string | undefined): Promise<Map<string, object> | undefined> {
        if (!jid) return;
        jid = normalizeJid(jid);
        if (!jid) return;

        let doc = await chatsCollection.findOne<Map<string, object>>({jid});
        return doc ?? undefined;
    }

    public async create(jid: string): Promise<Chat | undefined> {
        let model: ChatModel | undefined;
        if (isJidGroup(jid)) {
            model = new ChatModel(jid, ChatType.Group, ">>", false);
        } else if (isJidUser(jid)) {
            model = new ChatModel(jid, ChatType.DM, ">>", false);
        }
        if (!model) return;

        const chat = model ? this.initializeChatInstance(model) : undefined;
        if (!chat) return;
        chatsCollection.insertOne(model.toMap());

        if (chat) this.updateLocal(chat);
        await chat.setupHandlers();
        return chat;
    }

    private initializeChatInstance(model: ChatModel) {
        let chat: Chat | undefined;
        if (model.type == ChatType.Group) {
            chat = new GroupChat(model);
        } else if (model.type == ChatType.DM) {
            chat = new DMChat(model);
        }

        return chat;
    }

    public updateLocal(chat: Chat): Chat {
        this.repository.set(chat.model.jid, chat);
        return chat;
    }
}

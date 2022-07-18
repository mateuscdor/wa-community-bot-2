import {ObjectId} from "bson";
import {Reputation} from ".";
import {ChatLevel} from "../../../chats";
import {DeveloperLevel} from "./developer_level";

export default class UserModel {
    public _id: ObjectId;
    public jid: string;
    public name: string | undefined;

    public chatLevel: ChatLevel;
    public developerLevel: DeveloperLevel;
    public cooldowns: Map<string, Map<string, number>>;
    public reputation: Reputation;

    constructor(
        _id: ObjectId,
        jid: string,
        name: string | undefined,
        chatLevel: ChatLevel,
        developerLevel: DeveloperLevel,
        cooldowns: Map<string, Map<string, number>>,
        reputation: Reputation,
    ) {
        this._id = _id;
        this.jid = jid;
        this.name = name;
        this.chatLevel = chatLevel;
        this.developerLevel = developerLevel;
        this.cooldowns = cooldowns;
        this.reputation = reputation;
    }

    public toMap() {
        return {
            _id: this._id,
            jid: this.jid,
            name: this.name,
            chat_level: this.chatLevel,
            developer_level: this.developerLevel,
            cooldowns: this.cooldowns,
            reputation: this.reputation.toMap(),
        };
    }

    public static fromMap(map: Map<string, object>) {
        return new UserModel(
            map["_id"],
            map["jid"],
            map["name"],
            map["chat_level"] ?? 0,
            map["developer_level"] ?? 0,
            map["cooldowns"] ?? new Map(),
            map["reputation"] ? Reputation.fromMap(map["reputation"]) : new Reputation(0, []),
        );
    }
}

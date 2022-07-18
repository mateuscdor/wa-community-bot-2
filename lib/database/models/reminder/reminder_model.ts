import {ObjectId} from "mongodb";

export default class ReminderModel {
    public readonly _id: ObjectId;
    public readonly jid: string;
    public readonly reminder: string;
    public readonly remindSetTimestamp: number;
    public readonly remindTimestamp: number;
    public readonly recurring: boolean;

    constructor(id: ObjectId, jid: string, text: string, remindSetTimestamp: number, remindTimestamp: number, recurring: boolean) {
        this._id = id;
        this.jid = jid;
        this.reminder = text;
        this.remindSetTimestamp = remindSetTimestamp;
        this.remindTimestamp = remindTimestamp;
        this.recurring = recurring;
    }

    public toMap(): Map<string, any> {
        return new Map(
            Object.entries({
                _id: this._id,
                jid: this.jid,
                reminder: this.reminder,
                remind_set_timestamp: this.remindSetTimestamp,
                remind_timestamp: this.remindTimestamp,
                recurring: this.recurring,
            }),
        );
    }

    public static fromMap(map: Map<string, any>) {
        return new ReminderModel(map["_id"], map["jid"], map["reminder"], map["remind_set_timestamp"], map["remind_timestamp"], map["recurring"]);
    }
}

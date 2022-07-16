import {ChatType} from "./chat_type";

export default class ChatModel {
    readonly jid: string;
    readonly type: ChatType;
    readonly commandPrefix: string;
    readonly sendDisclaimer: boolean;

    constructor(jid: string, type: ChatType, commandPrefix: string, sendDisclaimer: boolean) {
        this.jid = jid;
        this.commandPrefix = commandPrefix;
        this.type = type;
        this.sendDisclaimer = sendDisclaimer;
    }

    public toMap(): Map<string, any> {
        return new Map(
            Object.entries({
                jid: this.jid,
                command_prefix: this.commandPrefix,
                type: this.type,
                sent_disclaimer: this.sendDisclaimer,
            }),
        );
    }

    public static fromMap(map: Map<string, any>) {
        return new ChatModel(map["jid"], map["type"], map["command_prefix"], map['sent_disclaimer'] ?? false);
    }
}

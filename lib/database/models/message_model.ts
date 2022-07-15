import { MediaType } from "@adiwajshing/baileys/lib/Types/Message";
import MessageMetadata from "../../message/message_metadata";

export default class MessageModel {
    public id: string;
    public timestamp: number;
    public content: string | undefined;
    public media: Buffer | undefined;
    public mediaType: MediaType | undefined;
    public quoted: string | undefined;
    public from: string;
    public to: string;
    public metadata: MessageMetadata | undefined;

    constructor(
        id: string,
        timestamp: number,
        content: string | undefined,
        media: Buffer | undefined,
        mediaType: MediaType | undefined,
        quoted: string | undefined,
        from: string,
        to: string,
        metadata: MessageMetadata | undefined = undefined,
    ) {
        this.id = id;
        this.timestamp = timestamp;
        this.content = content;
        this.media = media;
        this.mediaType = mediaType;
        this.quoted = quoted;
        this.from = from;
        this.to = to;
        this.metadata = metadata;
    }

    public toMap() {
        return {
            "id": this.id,
            "timestamp": this.timestamp,
            "content": this.content,
            "media": this.media,
            'media_type': this.mediaType,
            "quoted": this.quoted,
            "from": this.from,
            "to": this.to,
            'metadata': this.metadata?.toMap()
        }
    }

    public static fromMap(map: Map<String, object>) {
        return new MessageModel(
            map['_id'],
            map['timestamp'],
            map['content'],
            map['media'],
            map['media_type'],
            map['quoted'],
            map['from'],
            map['to'],
            map['metadata'] ? MessageMetadata.fromMap(map['metadata']) : undefined
        );
    }
}
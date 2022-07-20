import {DownloadableMessage, downloadContentFromMessage, proto, MediaType} from "@adiwajshing/baileys";
import fs from "fs";

import axios from "axios";
import {Message} from "../message";

export async function extractMediaToMediaFolders(message: proto.IWebMessageInfo) {}

export async function urlToBuffer(url: string) {
    const response = await axios.get(url, {responseType: "arraybuffer"});
    return Buffer.from(response.data, "utf-8");
}

export async function getMessageMediaBuffer(message: proto.IWebMessageInfo): Promise<Buffer | undefined> {
    const stream = await extractMessageMediaStream(message);
    if (!stream) return;

    let buffer = Buffer.from([]);

    // convert stream to buffer
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }

    return buffer;
}

export async function saveMessageMedia(message: proto.IWebMessageInfo): Promise<string | undefined> {
    const mediaFolderPath = "./wa_media";
    const mediaType = getMessageMediaType(message);
    if (!mediaType) return;
    const mediaBuffer = await getMessageMediaBuffer(message);
    if (!mediaBuffer) return;
    if (!fs.existsSync(mediaFolderPath)) {
        fs.mkdirSync(mediaFolderPath);
    }

    if (!fs.existsSync(`${mediaFolderPath}/` + mediaType)) {
        fs.mkdirSync(`${mediaFolderPath}/` + mediaType);
    }
    const mediaPath = `${mediaFolderPath}/${mediaType}/${Message.calculateSaveId(message)}`;
    await new Promise((res, rej) => {
        fs.writeFile(mediaPath, mediaBuffer, {}, (err) => {
            err ? rej(err) : res(mediaPath);
        });
    });
    return mediaPath;
}

export async function getMessageMedia(message: Message) {
    const mediaPath = message.mediaPath;
    if (!mediaPath) return;
    if (!fs.existsSync(mediaPath)) return;
    return new Promise<Buffer>((res, rej) => fs.readFile(mediaPath, (err, data) => (err ? rej(err) : res(data))));
}

export function getMessageMediaType(message: proto.IWebMessageInfo) {
    if (message.message?.imageMessage) {
        return "image";
    } else if (message.message?.videoMessage) {
        return "video";
    } else if (message.message?.stickerMessage) {
        return "sticker";
    } else if (message.message?.documentMessage) {
        return "document";
    } else if (message.message?.audioMessage) {
        return "audio";
    }
}

export async function extractMessageMediaStream(message: proto.IWebMessageInfo) {
    if (message.message?.imageMessage) {
        return downloadContentFromMessage(message.message?.imageMessage as DownloadableMessage, "image");
    } else if (message.message?.videoMessage) {
        return downloadContentFromMessage(message.message?.videoMessage as DownloadableMessage, "video");
    } else if (message.message?.stickerMessage) {
        return downloadContentFromMessage(message.message?.stickerMessage as DownloadableMessage, "sticker");
    } else if (message.message?.documentMessage) {
        return downloadContentFromMessage(message.message?.documentMessage as DownloadableMessage, "document");
    } else if (message.message?.audioMessage) {
        return downloadContentFromMessage(message.message?.audioMessage as DownloadableMessage, "audio");
    }
}

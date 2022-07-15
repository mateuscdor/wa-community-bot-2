import { DownloadableMessage, downloadContentFromMessage, proto, MediaType } from "@adiwajshing/baileys";

import axios from 'axios';

export async function extractMediaToMediaFolders(message: proto.IWebMessageInfo) {

}

export async function urlToBuffer(url: string) {
  const response = await axios.get(url, { responseType: 'arraybuffer' })
  return Buffer.from(response.data, "utf-8")
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

export function getMessageMediaType(message: proto.IWebMessageInfo) {
  if (message.message?.imageMessage) {
    return 'image';
  } else if (message.message?.videoMessage) {
    return 'video';
  } else if (message.message?.stickerMessage) {
    return 'sticker';
  } else if (message.message?.documentMessage) {
    return 'document';
  } else if (message.message?.audioMessage) {
    return 'audio';
  }
}

export async function extractMessageMediaStream(message: proto.IWebMessageInfo) {
  if (message.message?.imageMessage) {
    return downloadContentFromMessage(
      message.message?.imageMessage as DownloadableMessage,
      "image"
    );
  } else if (message.message?.videoMessage) {
    return downloadContentFromMessage(
      message.message?.videoMessage as DownloadableMessage,
      "video"
    );
  } else if (message.message?.stickerMessage) {
    return downloadContentFromMessage(
      message.message?.stickerMessage as DownloadableMessage,
      "sticker"
    );
  } else if (message.message?.documentMessage) {
    return downloadContentFromMessage(
      message.message?.documentMessage as DownloadableMessage,
      "document"
    );
  } else if (message.message?.audioMessage) {
    return downloadContentFromMessage(
      message.message?.audioMessage as DownloadableMessage,
      "audio"
    );
  }
}
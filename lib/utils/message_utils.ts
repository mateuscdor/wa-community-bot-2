import {extractMessageContent, generateWAMessageFromContent, WAMessage} from "@adiwajshing/baileys";
import {messagingService} from "../constants/services";
import Message from "../message/message";
import {BotClient} from "../whatsapp_bot";
import {sleep} from "./utils";

export function getQuotedMessage(message?: WAMessage) {
    const contextInfo = getContextInfo(message);

    if (!contextInfo) return;

    let quoted = generateWAMessageFromContent(contextInfo?.remoteJid || contextInfo.participant!, contextInfo?.quotedMessage!, {
        messageId: contextInfo?.stanzaId!,
        userJid: contextInfo?.participant!,
    });

    quoted.key = {
        fromMe: contextInfo?.participant! == BotClient.currentClientId,
        id: contextInfo?.stanzaId!,
        participant: contextInfo?.participant!,
        remoteJid: message?.key.remoteJid,
    };

    return quoted;
}

export function havePluralS(number: number) {
    return number != 1 && number != -1 ? "s" : "";
}

export function getContextInfo(message?: WAMessage) {
    const content = extractMessageContent(message?.message);
    if (!content) return;

    return [
        content.extendedTextMessage?.contextInfo,
        content.imageMessage?.contextInfo,
        content.videoMessage?.contextInfo,
        content.stickerMessage?.contextInfo,
        content.audioMessage?.contextInfo,
        content.documentMessage?.contextInfo,
        content.contactMessage?.contextInfo,
        content.contactsArrayMessage?.contextInfo,
        content.buttonsResponseMessage?.contextInfo,
        content.templateButtonReplyMessage?.contextInfo,
        content.listResponseMessage?.contextInfo,
        content.locationMessage?.contextInfo,
        content.liveLocationMessage?.contextInfo,
        content.templateMessage?.contextInfo,
        content.buttonsMessage?.contextInfo,
        content.listMessage?.contextInfo,
    ].filter((e) => e?.quotedMessage)[0];
}

export function getMessageBody(message?: WAMessage) {
    const content = message?.message;
    if (!content) return;

    let result =
        content.conversation ||
        content.extendedTextMessage?.text ||
        content.imageMessage?.caption ||
        content.videoMessage?.caption ||
        content.buttonsResponseMessage?.selectedDisplayText ||
        content.templateButtonReplyMessage?.selectedDisplayText;

    if (!result) {
        if (content.listResponseMessage) {
            result = content.listResponseMessage.title;
            if (content.listResponseMessage.description && content.listResponseMessage.description.length > 0)
                result += "\n" + content.listResponseMessage.description;
        }
    }

    return result ?? undefined;
}

export async function waitForMessage(filter: (message: Message) => boolean | Promise<boolean>, timeout?: number) {
    return new Promise<Message>((res, rej) => {
        const id = messagingService.addMessageCallback(filter, (msg) => res(msg));

        if (timeout)
            sleep(() => {
                messagingService.removeMessageCallback(id);
                rej("timed out");
            }, timeout);
    });
}

import {BotClient} from "./whatsapp_bot";
import {BaileysEventEmitter, isJidUser, proto} from "@adiwajshing/baileys";
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
import ffmpeg from "fluent-ffmpeg";
import dotenv from "dotenv";
import {chatRepository, messagingService, userRepository} from "./constants/services";
import {normalizeJid} from "./utils/group_utils";
import moment from "moment";
ffmpeg.setFfmpegPath(ffmpegPath);
dotenv.config();

export const whatsappBot: BotClient = new BotClient("./session", registerEventHandlers);

whatsappBot.start();

messagingService.setClient(whatsappBot.client!);
registerListeners();
registerCommands();

function registerEventHandlers(eventListener: BaileysEventEmitter, bot: BotClient) {
    eventListener?.on("messages.upsert", async (chats) => {
        for (const rawMsg of chats.messages) {
            // if (rawMsg.messageTimestamp ?? 0 < moment().unix() - 60) return;
            // if not actual message return
            if (rawMsg.message?.protocolMessage) return;

            // mutates rawMsg key to a fixed version. current state of key has bugs.
            messageKeyFix(rawMsg);

            // apply metadata bound to message id in messaging service (this allows bot to send messages with metadata)
            const msg = await messagingService.messageInterceptor(rawMsg);
            const jid = normalizeJid(msg.sender ?? "");
            if (!jid) return; // if JID failed to normalize return

            const pushName = !msg.fromMe ? rawMsg.pushName ?? undefined : undefined; // if message is not from bot save with push name (WA name))
            let user = await fetchOrCreateUserFromJID(jid, pushName);
            if (!user) return; // if user failed to fetch return

            // if pushName exists and current user name does not match pushName, update user name
            if (pushName && user?.model.name != pushName) {
                await userRepository.update(jid, {
                    $set: {name: rawMsg.pushName},
                });
            }

            if (rawMsg.message?.listResponseMessage?.singleSelectReply?.selectedRowId?.startsWith("HELP_COMMAND")) {
                return await messagingService.reply(msg, "Please type the command in yourself.", true);
            }

            // if ignore flag is set, return
            if (msg.metadata?.meta.get("ignore") == true) {
                return;
            }

            let chat = await chatRepository.get(jid);
            if (!chat) {
                try {
                    chat = await chatRepository.create(jid);
                } catch (e) {
                    chat = await chatRepository.get(jid).catch(() => undefined);
                }
            }

            if (!chat) {
                return console.error(`Failed to get a chat for JID(${jid}).`);
            }

            // const [isExecutableCommand, commands] = await chat.isExecutableCommand(msg);
            // if (isExecutableCommand) {
            //     const promises: Promise<any>[] = [];
            //     for (const command of commands ?? []) {
            //         promises.push(user.addCooldown(chat.model.jid, command));
            //     }

            //     await Promise.all(promises);
            // }

            await chat?.handleMessage(msg).catch((e) => console.error(e));
        }
    });
}

process.on("uncaughtException", (err) => {
    console.log("Caught unhandled exception:");
    console.error(err);
});

function registerListeners() {}

function registerCommands() {}

async function fetchOrCreateUserFromJID(jid: string, pushName?: string) {
    let user = await userRepository.get(jid, true);

    if (isJidUser(jid) && !user) {
        try {
            user = await userRepository.simpleCreate(jid, pushName);
        } catch (e) {
            user = await userRepository.get(jid).catch(() => undefined);
        }

        if (!user) {
            return console.error(`Failed to get user with JID(${jid})`);
        }
    }

    return user;
}

/**
 * mutates message key to fixed version, removing colon from participant.
 * having colon in participant results in a mention bug to all iphones.
 * @param msg the message to mutate
 * @returns
 */
function messageKeyFix(msg: proto.IWebMessageInfo) {
    // fix mention bug on iphones where having ":" in participant mentions all iphones
    if (msg?.key?.participant?.includes(":") ?? false) {
        msg.key!.participant = msg?.key!.participant?.split(":")[0] + "@s.whatsapp.net";
    }

    if (msg?.participant?.includes(":") ?? false) {
        msg.participant = msg?.participant?.split(":")[0] + "@s.whatsapp.net";
    }
}

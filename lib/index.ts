import {BotClient} from "./whatsapp_bot";
import {BaileysEventEmitter, isJidUser, proto} from "@adiwajshing/baileys";
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
import ffmpeg from "fluent-ffmpeg";
import dotenv from "dotenv";
import {chatRepository, messagingService, userRepository} from "./constants/services";
import {normalizeJid} from "./utils/group_utils";
import moment from "moment";
import {EveryoneCommand, HelpCommand, PingCommand} from "./command/commands";
import config from "./config.json";
import languages from "./constants/language.json";
import {applyPlaceholders} from "./utils/message_utils";

ffmpeg.setFfmpegPath(ffmpegPath);
dotenv.config({path: "./"});
export const whatsappBot: BotClient = new BotClient("./session", registerEventHandlers);

whatsappBot.start();

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

            // // apply metadata bound to message id in messaging service (this allows bot to send messages with metadata)
            const msg = await messagingService.messageInterceptor(rawMsg);
            const userJid = normalizeJid(msg.sender ?? "");
            // if (!["972557223809"].some((e) => userJid?.startsWith(e))) return;

            const chatJid = normalizeJid(msg.raw?.key.remoteJid ?? "");
            if (!userJid) return; // if JID failed to normalize return
            if (!chatJid) return;

            const pushName = !msg.fromMe ? rawMsg.pushName ?? undefined : undefined; // if message is not from bot save with push name (WA name))
            let user = await fetchOrCreateUserFromJID(userJid, pushName);
            if (!user) return; // if user failed to fetch return

            // if pushName exists and current user name does not match pushName, update user name
            if (pushName && user?.model.name != pushName) {
                await userRepository.update(userJid, {
                    $set: {name: rawMsg.pushName},
                });
            }

            // if ignore flag is set, return
            if (msg.metadata?.meta.get("ignore") == true) {
                return;
            }

            let chat = await chatRepository.get(chatJid, true);
            if (!chat) {
                try {
                    chat = await chatRepository.create(chatJid);
                } catch (e) {
                    console.error(e);
                    chat = (await chatRepository.get(chatJid, true).catch((err) => console.error(err))) || undefined;
                }
            }

            if (!chat) {
                return console.error(`Failed to get a chat for JID(${chatJid}).`);
            }

            const selectedRowId = rawMsg.message?.listResponseMessage?.singleSelectReply?.selectedRowId;
            if (selectedRowId && selectedRowId?.startsWith("HELP_COMMAND")) {
                const helpCommand = await chat?.getCommandByTrigger("help");
                let splitAtNewLine = selectedRowId.split("\n");
                splitAtNewLine.shift();
                let data = splitAtNewLine.join("\n").split("\n\r");
                const commandAliases = data[0].split("\n");
                const commandDescription = data[1];
                let id = 0;
                const aliasesButtons: proto.IButton[] = commandAliases.map((alias) => {
                    return {
                        buttonId: (id++).toString(),
                        buttonText: {
                            displayText: alias.replace(
                                "{prefix}",
                                chat?.model.commandPrefix ?? config.default_command_prefix,
                            ),
                        },
                    };
                });

                return await messagingService.replyAdvanced(
                    msg,
                    {
                        text: `*${aliasesButtons[0].buttonText?.displayText ?? ""}*\n\n${commandDescription}`,
                        buttons: aliasesButtons,
                        footer: `(${chat?.model.commandPrefix}${
                            helpCommand?.name ?? "help"
                        } ${aliasesButtons[0].buttonText?.displayText?.replace(chat?.model.commandPrefix ?? "", "")})`,
                    },
                    true,
                );
            }

            // const [isExecutableCommand, commands] = await chat.isExecutableCommand(msg);
            // if (isExecutableCommand) {
            //     const promises: Promise<any>[] = [];
            //     for (const command of commands ?? []) {
            //         promises.push(user.addCooldown(chat.model.jid, command));
            //     }

            //     await Promise.all(promises);
            // }

            if (
                msg.content?.includes("@everyone") ||
                msg.content?.includes("@כולם") ||
                msg.content?.includes("@here") ||
                msg.content?.includes("@כאן")
            ) {
                const everyoneCmd = (await chat?.getCommandByTrigger("everyone")) as EveryoneCommand;
                if (!everyoneCmd) continue;
                await messagingService.replyAdvanced(
                    msg,
                    {
                        text: everyoneCmd.languageData.tip[everyoneCmd.languageCode],
                        buttons: [
                            {
                                buttonId: "0",
                                buttonText: {displayText: `${chat?.model.commandPrefix}${everyoneCmd.name}`},
                            },
                        ],
                    },
                    true,
                    {
                        placeholder: {
                            chat,
                        },
                    },
                );
            }
            if (msg.content?.toLowerCase().includes("prefix?") || msg.content?.includes("קידומת?")) {
                const helpCommand = await chat?.getCommandByTrigger("help");
                await messagingService.replyAdvanced(
                    msg,
                    {
                        text: `*${chat?.model.commandPrefix}*`,
                        buttons: [
                            {
                                buttonId: "0",
                                buttonText: {displayText: `${chat?.model.commandPrefix}${helpCommand?.name ?? "help"}`},
                            },
                        ],
                    },
                    true,
                );
            }

            const mentions = msg.raw?.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
            if (!msg.fromMe && mentions.includes(BotClient.currentClientId ?? "")) {
                const helpCommand = (await chat?.getCommandByTrigger("help")) as HelpCommand;

                await messagingService.replyAdvanced(
                    msg,
                    {
                        text: languages.tagged_info[chat?.model.language ?? "hebrew"].message,
                        buttons: [
                            {
                                buttonId: "0",
                                buttonText: {
                                    displayText: `${chat?.model.commandPrefix}${helpCommand.name} ${
                                        languages.tagged_info[chat?.model.language ?? "hebrew"].text_version
                                    }`,
                                },
                            },
                            {
                                buttonId: "1",
                                buttonText: {
                                    displayText: `${chat?.model.commandPrefix}${helpCommand.name}`,
                                },
                            },
                        ],
                    },
                    true,
                    {
                        placeholder: {
                            chat,
                        },
                    },
                );
            }

            await chat?.handleMessage(msg).catch((e) => console.error(e));
        }
    });

    eventListener.on("chats.upsert", (chats: proto.IChat[]) => {
        console.log("CHAT START")
        console.log(chats[0]);
        console.log("CHAT END")
    });
}

process.on("uncaughtException", async (err) => {
    console.log("Caught unhandled exception:");
    console.error(err);
    // await whatsappBot.restart();
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

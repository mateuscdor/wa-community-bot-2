import {isJidGroup, isJidUser, proto, WAMediaUpload, WASocket} from "@adiwajshing/baileys";
import fs from "fs";
import * as yt from "youtube-search-without-api-key";
import ytdl from "ytdl-core";
import {Chat} from "../../../chats";
import {messagingService} from "../../../constants/services";
import Message from "../../../message/message";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";
import {wait} from "../../../utils/async_utils";
import {BlockedReason} from "../../../blockable";
import {ChatLevel, DeveloperLevel} from "../../../database/models";
import {MessageMetadata} from "../../../message";
import languages from "../../../constants/language.json";
import ffmpeg from "fluent-ffmpeg";

export default class MP3Command extends Command {
    private language: typeof languages.commands.mp3[Language];

    constructor(language: Language) {
        const langs = languages.commands.mp3;
        const lang = langs[language];
        super({
            triggers: langs.triggers.map((e) => new CommandTrigger(e)),
            announcedAliases: lang.triggers,
            usage: lang.usage,
            category: lang.category,
            description: lang.description,
            extendedDescription: lang.extended_description,
            cooldowns: new Map([
                [ChatLevel.Free, 5 * 1000],
                [ChatLevel.Premium, 3 * 1000],
                [ChatLevel.Sponsor, 2 * 1000],
            ]),
        });

        this.language = lang;
    }

    downloading_list = {};

    async execute(client: WASocket, chat: Chat, message: Message, body?: string) {
        if (!message.raw?.key.remoteJid)
            return await messagingService.reply(message, "That's... Odd... It seems like this group doesn't exist 🤨");
        if (!body)
            return await messagingService.reply(message, this.language.execution.no_content, true, {
                placeholder: this.getDefaultPlaceholder({chat, message}),
            });

        const videos = await yt.search(body);
        const video = videos.filter((vid) => {
            if (!vid || !vid.duration_raw) return;

            const durationsSeconds = this.rawTimeToSeconds(vid.duration_raw);
            return durationsSeconds < 60 * 10 && durationsSeconds > 0;
        })[0];

        if (!video) {
            let errorMessage = this.language.execution.no_results;
            if (videos.length > 0) errorMessage += "\n" + this.language.execution.too_long;

            return await messagingService.reply(message, errorMessage, true, {
                placeholder: {custom: new Map([["song", body]])},
            });
        }

        video.title = this.standardizeTitle(video.title);
        const downloadMessage = this.language.execution.downloading;
        let downloadData = this.downloading_list[video.title];
        if (downloadData && downloadData["messages"] && fs.existsSync(downloadData["path"])) {
            downloadData["messages"].push(message);
            return await messagingService.reply(message, downloadMessage, true, {
                placeholder: {custom: new Map([["title", video.title]])},
            });
        } else if (downloadData && downloadData["path"] && !fs.existsSync(downloadData["path"])) {
            return await messagingService.reply(message, this.language.execution.failed, true);
        }

        await messagingService.reply(message, downloadMessage, true, {
            placeholder: {custom: new Map([["title", video.title]])},
        });
        const path = `./media/music/${video.title}.ogg`;
        this.downloading_list[video.title] = {path, messages: [message]};
        downloadData = this.downloading_list[video.title];

        const videoStream = ytdl(video.url, {filter: "audioonly", quality: "highestaudio"});
        ffmpeg(videoStream)
            .audioBitrate(128)
            .toFormat("mp3")
            .save(path)
            .on("end", async () => {
                if (!downloadData) {
                    this.deleteFiles(video.title, path);
                    delete this.downloading_list[video.title];
                } else if (downloadData["messages"].length == 0) {
                    await wait(5000);
                    if (downloadData["messages"].length == 0) this.deleteFiles(video.title, path);
                }

                const fileBuffer = fs.readFileSync(path);
                const messages = downloadData["messages"] ?? [];
                while (messages.length > 0) {
                    await this.sendRoutine(downloadData["messages"], fileBuffer, video.title);
                    await wait(5000);
                }

                this.deleteFiles(video.title, path);
                delete this.downloading_list[video.title];
            });
    }

    private async sendRoutine(messages: Array<Message>, file: Buffer, title: string) {
        while (messages.length > 0) {
            const message: Message | undefined = messages.shift();
            if (!message) {
                continue;
            }

            const jid = message.raw?.key?.remoteJid ?? "";
            if (!isJidUser(jid) && !isJidGroup(jid)) {
                continue;
            }

            messagingService.sendMessage(
                jid,
                {
                    audio: file as WAMediaUpload,
                    fileName: title + ".mp3",
                    mimetype: "audio/mpeg",
                    ptt: false,
                },
                {quoted: message.raw ?? undefined},
                {metadata: new MessageMetadata(new Map([["media", false]]))},
            );
        }
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}

    private rawTimeToSeconds(time: string) {
        const split = time.split(":");
        let seconds = 0;
        let minutes = 0;
        let hours = 0;

        switch (split.length) {
            case 1:
                seconds = Number.parseInt(split[0]);
                break;
            case 2:
                seconds = Number.parseInt(split[1]);
                minutes = Number.parseInt(split[0]);
                break;
            case 3:
                seconds = Number.parseInt(split[2]);
                minutes = Number.parseInt(split[1]);
                hours = Number.parseInt(split[0]);
                break;
            default:
                return -1;
        }

        return hours * 60 * 60 + minutes * 60 + seconds;
    }

    private deleteFiles(title: string, path: string) {
        fs.unlink(path, () => {});
        fs.unlink(path + ".mp3", () => {});
    }

    private standardizeTitle(title: string) {
        const regex = /[\\,:,?,|,¿,*,<,>,",/]/g;
        return title.replace(regex, "");
    }
}

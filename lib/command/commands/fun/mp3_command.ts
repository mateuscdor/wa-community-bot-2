import {isJidGroup, isJidUser, proto, WAMediaUpload, WASocket} from "@adiwajshing/baileys";
import fs from "fs";
import * as yt from "youtube-search-without-api-key";
import * as ytdl from "ytdl-core";
import {Chat} from "../../../chats";
import {messagingService} from "../../../constants/services";
import Message from "../../../message/message";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";
import {wait} from "../../../utils/async_utils";
import {BlockedReason} from "../../../blockable";
import { DeveloperLevel } from "../../../database/models";

export default class MP3Command extends Command {
    constructor() {
        super({
            triggers: [new CommandTrigger("mp3")],
            usage: "{prefix}{command}",
            developerLevel: DeveloperLevel.Moderator,
            category: "Fun",
            description: "Downloads an MP3 of a YouTube video (>>mp3 video name)",
        });
    }

    downloading_list = {};

    async execute(client: WASocket, chat: Chat, message: Message, body?: string) {
        if (!message.raw?.key.remoteJid) return await messagingService.reply(message, "That's... Odd... It seems like this group doesn't exist 🤨");
        if (!body) return await messagingService.reply(message, "Please specify what you want to convert to an MP3", true);

        const videos = await yt.search(body);
        const video = videos.filter((vid) => {
            if (!vid || !vid.duration_raw) return;

            const durationsSeconds = this.rawTimeToSeconds(vid.duration_raw);
            return durationsSeconds < 60 * 10 && durationsSeconds > 0;
        })[0];

        if (!video) {
            let errorMessage = "I couldn't find a video to download.";
            if (videos.length > 0) errorMessage += "\nI can only download videos up to 10 minutes. Maybe that's why?";

            return await messagingService.reply(message, errorMessage, true);
        }

        video.title = this.standardizeTitle(video.title);
        const downloadMessage = `Downloading MP3 of "${video.title}" from YouTube...`;
        let downloadData = this.downloading_list[video.title];
        if (downloadData && downloadData["messages"] && fs.existsSync(downloadData["path"])) {
            this.downloading_list[video.title]["messages"].push(message);
            return await messagingService.reply(message, downloadMessage, true);
        } else if (downloadData && downloadData["path"] && !fs.existsSync(downloadData["path"])) {
            return await messagingService.reply(message, "Please try again in a few moments", true);
        }

        await messagingService.reply(message, downloadMessage, true);
        const path = `./media/music/${video.title}.mp3`;
        this.downloading_list[video.title] = {path, messages: [message]};
        downloadData = this.downloading_list[video.title];

        ytdl.default(video.url)
            .pipe(fs.createWriteStream(path))
            .addListener("finish", async () => {
                if (!downloadData) {
                    this.deleteFiles(video.title, path);
                    delete this.downloading_list[video.title];
                } else if (downloadData["messages"].length == 0) {
                    if (downloadData["messages"].length == 0) this.deleteFiles(video.title, path);
                }

                const fileBuffer = fs.readFileSync(path);
                while (downloadData["messages"].length > 0) {
                    await this.sendRoutine(downloadData["messages"], fileBuffer, video.title);
                }

                this.deleteFiles(video.title, path);
                delete this.downloading_list[video.title];
            });
    }

    private async sendRoutine(messages: Array<Message>, file: Buffer, title: string) {
        while (messages.length > 0) {
            const message: Message | undefined = messages.shift();
            if (!message) continue;

            const jid = message.raw?.key?.remoteJid ?? "";
            if (!isJidUser(jid) && !isJidGroup(jid)) continue;

            await messagingService.sendMessage(
                jid,
                {
                    audio: file as WAMediaUpload,
                    fileName: title + ".mp3",
                    mimetype: "audio/mpeg",
                },
                {quoted: message.raw ?? undefined},
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

    private handleError(client, message) {
        client.sendMessage(message.key.remoteJid!, {text: "Failed to download the MP3 of this video."}, {quoted: message});
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

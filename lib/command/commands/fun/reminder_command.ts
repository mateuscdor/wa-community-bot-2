import {proto, WASocket} from "@adiwajshing/baileys";
import url from "node:url";
import {Chat} from "../../../chats";
import {messagingService, reminderService, userRepository} from "../../../constants/services";
import Message from "../../../message/message";
import {DeveloperLevel} from "../../../database/models/user/developer_level";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";
import {BlockedReason} from "../../../blockable";
import moment from "moment";

export default class ReminderCommand extends Command {
    constructor() {
        super({
            triggers: ["reminder", "תזכורת", "remind me", "תזכיר לי"].map((e) => new CommandTrigger(e)),
            usage: "{prefix}{command}",
            category: "Fun",
            description: "Set a reminder for yourself",
        });
    }

    private acceptableTimeTypes = new Set([
        "minute",
        "minutes",
        "דקה",
        "דקות",
        "hour",
        "hours",
        "שעה",
        "שעות",
        "day",
        "days",
        "יום",
        "ימים",
        "week",
        "weeks",
        "שבוע",
        "שבועות",
        "month",
        "months",
        "חודש",
        "חודשים",
        "year",
        "years",
        "שנה",
        "שנים",
    ]);

    async execute(client: WASocket, chat: Chat, message: Message, body?: string) {
        if (!body) {
            return await messagingService.reply(
                message,
                "You must provide time and text to set a reminder.\nExample: `>>reminder 1 hour Hello World`",
            );
        }

        const splitBody = body.split(" ");
        const time = Number(splitBody.shift());
        let timeType = splitBody.shift();
        if (!time) {
            return await messagingService.reply(
                message,
                "You must provide time and text to set a reminder.\nExample: `>>reminder 1 hour Hello World`",
            );
        } else if (timeType == "second" || timeType == "seconds" || timeType == "שנייה" || timeType == "שניות") {
            return await messagingService.reply(message, "I'm sorry, but I can't set a reminder for seconds.");
        } else if (!this.acceptableTimeTypes.has(timeType?.toLowerCase() ?? "") || !timeType) {
            const connectedString = this.buildAcceptableTimesString();
            return await messagingService.reply(message, `You must provide a valid time type.\nValid time types: ${connectedString}`);
        }

        const acceptableTimeTypesArr = Array.from(this.acceptableTimeTypes);
        timeType =
            acceptableTimeTypesArr[
                acceptableTimeTypesArr.indexOf(timeType.toLowerCase()) - (acceptableTimeTypesArr.indexOf(timeType.toLowerCase()) % 4)
            ];
        if (!timeType) {
            const connectedString = this.buildAcceptableTimesString();
            return await messagingService.reply(message, `You must provide a valid time type.\nValid time types: ${connectedString}`);
        }

        const reminderText = splitBody.join(" ");
        if (!reminderText) {
            return await messagingService.reply(
                message,
                "You must provide time and text to set a reminder.\nExample: `>>reminder 1 hour Hello World`",
            );
        }

        const remindTime = moment
            .unix(message.timestamp)
            .add(time, timeType as moment.unitOfTime.Base)
            .unix();
        const user = await userRepository.get(message.sender ?? "");
        if (!user) {
            return await messagingService.reply(message, "You must be a user to set a reminder.");
        }

        const res = await reminderService.createSimple(message.sender, reminderText, remindTime);
        if (!res) {
            return await messagingService.reply(message, "Something went wrong while creating the reminder.");
        }

        await messagingService.reply(message, `Great.\nI'll remind you to ${reminderText} in ${time} ${timeType}(s)!`);
    }

    private buildAcceptableTimesString() {
        let connectedString = "";
        // build string from acceptable time types grouping in groups of four seperated by new line
        let index = 0;
        for (const timeType of this.acceptableTimeTypes.keys()) {
            if (index % 4 === 0) {
                connectedString += "\n";
            }
            connectedString += `${timeType}, `;
            index++;
        }
        // remove last comma and space
        connectedString = connectedString.slice(0, -2);
        return connectedString;
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}

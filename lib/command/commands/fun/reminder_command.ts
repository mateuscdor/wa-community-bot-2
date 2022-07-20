import {isJidUser, proto, WASocket} from "@adiwajshing/baileys";
import {Chat} from "../../../chats";
import {messagingService, reminderService, userRepository} from "../../../constants/services";
import Message from "../../../message/message";
import {DeveloperLevel} from "../../../database/models/user/developer_level";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";
import {BlockedReason} from "../../../blockable";
import moment from "moment";
import {havePluralS, waitForMessage} from "../../../utils/message_utils";
import {remindersCollection} from "../../../database";
import {ReminderModel} from "../../../database/models";
import InteractableCommand from "../../interactable_command";

export default class ReminderCommand extends InteractableCommand {
    constructor() {
        super({
            triggers: ["reminder", "remind", "תזכורת", "remind me", "תזכיר לי"].map((e) => new CommandTrigger(e)),
            usage: "{prefix}{command}",
            category: "Fun",
            description: "Set a reminder for yourself",
            extendedDescription: "View all the reminders you have set using `>>reminder list`",
        });
    }

    private acceptableTimeTypes = new Set([
        "second",
        "seconds",
        "שניה",
        "שנחיה",
        "שניות",
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

        if (body.toLowerCase().startsWith("list") || body.toLowerCase().startsWith("רשימה")) {
            return await this.listReminders(chat, message);
        }

        const splitBody = body.split(" ");
        const time = Number(splitBody.shift());
        let timeType = splitBody.shift();
        if (!time) {
            return await messagingService.reply(
                message,
                "You must provide time and text to set a reminder.\nExample: `>>reminder 1 hour Hello World`",
            );
        } else if (!this.acceptableTimeTypes.has(timeType?.toLowerCase() ?? "") || !timeType) {
            const connectedString = this.buildAcceptableTimesString();
            return await messagingService.reply(
                message,
                `You must provide a valid time type.\nValid time types: ${connectedString}`,
            );
        }

        const acceptableTimeTypesArr = Array.from(this.acceptableTimeTypes);
        timeType =
            acceptableTimeTypesArr[
                acceptableTimeTypesArr.indexOf(timeType.toLowerCase()) -
                    (acceptableTimeTypesArr.indexOf(timeType.toLowerCase()) % 4)
            ];
        if (!timeType) {
            const connectedString = this.buildAcceptableTimesString();
            return await messagingService.reply(
                message,
                `You must provide a valid time type.\nValid time types: ${connectedString}`,
            );
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
        const timeDiff = remindTime - message.timestamp;
        if (timeDiff < 60) {
            return await messagingService.reply(message, "I'm sorry, but I can't remind you for something less than a minute from now.");
        }
        const user = await userRepository.get(message.sender ?? "");
        if (!user) {
            return await messagingService.reply(message, "You must be a user to set a reminder.");
        }

        const isDMChat = isJidUser(chat.model.jid);
        const isDMReminder = isDMChat ? true : await this.isDMReminder(message);
        if (isDMReminder == undefined) return;
        const res = await reminderService.createSimple(message.sender, reminderText, remindTime);
        if (!res) {
            return await messagingService.reply(message, "Something went wrong while creating the reminder.");
        }

        await messagingService.reply(
            message,
            `Great.\nI'll remind you to ${reminderText} in ${time} ${timeType}${havePluralS(time)}!`,
        );
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

    private async listReminders(chat: Chat, message: Message) {
        const reminders = remindersCollection
            .find<Map<string, any>>({jid: message.sender})
            .map((e) => ReminderModel.fromMap(e));
        let text = "*Reminders:* _(select one to modify using the number)_\n\n";
        const reminderMapId: Map<number, ReminderModel> = new Map();
        let id = 1;

        for await (const reminder of reminders) {
            text += `*${id}.* ${reminder.reminder}\n`;
            reminderMapId.set(id, reminder);
            id++;
        }
        // remove last new line
        text = text.slice(0, -1);
        if (id == 1) {
            return await messagingService.reply(message, "You have no reminders.");
        }

        await messagingService.reply(message, text, true);
        let recvMsg = await this.waitForInteractionWith(message);
        if (!recvMsg.content) return;
        const selectedReminderId = Number(recvMsg.content);
        if (!selectedReminderId) return;
        if (!reminderMapId.has(selectedReminderId)) return;

        const selectedReminder = reminderMapId.get(selectedReminderId);
        if (!selectedReminder) return;
        const isDMChat = isJidUser(chat.model.jid);
        const modificationMenuMessage =
            "What do you want to change?\n\n*1.* Reminder text (טקסט התזכורת)\n" +
            (isDMChat
                ? "*2.* Delete (מחק)\n*3.* Cancel (ביטול)"
                : "*2.* Remind in DM (תזכורת פרטית)\n*3.* Delete (מחק)\n*4.* Cancel (ביטול)");
        await messagingService.reply(message, modificationMenuMessage, true);
        recvMsg = await this.validatedWaitForInteractionWith(
            message,
            (msg) =>
                messagingService.reply(
                    message,
                    isDMChat
                        ? "You must answer with either `1`, `2` or `3`.\nבבקשה תענה עם `1`, `2` או `3`."
                        : "You must answer with either `1`, `2`, `3` or '4'.\nבבקשה תענה עם `1`, `2`, `3` או `4`.",
                ),
            "1",
            "2",
            "3",
            isDMChat ? undefined : "4",
            "cancel",
            "ביטול",
        );

        const receivedContent = recvMsg.content!.toLowerCase().replace("ביטול", "cancel").replace("cancel", "3");
        if (receivedContent.startsWith("1")) {
            await messagingService.reply(message, "What should the reminder be?");
            recvMsg = await this.waitForInteractionWith(message);

            const newReminderText = recvMsg.content!;
            await reminderService.update(selectedReminder._id, {$set: {reminder: newReminderText}});
            await messagingService.reply(message, `Great.\nI'll remind you to ${newReminderText}`);
        } else if (receivedContent.startsWith("2") && !isDMChat) {
            const isDM = await this.isDMReminder(message);
            if (isDM == undefined) return;
            await reminderService.update(selectedReminder._id, {$set: {jid: isDM ? message.sender : chat.model.jid}});
            return await messagingService.reply(message, "Updated reminder.");
        } else if ((receivedContent.startsWith("3") && !isDMChat) || (receivedContent.startsWith("2") && isDMChat)) {
            await reminderService.delete(selectedReminder._id);
            return await messagingService.reply(message, "Reminder deleted.");
        } else if ((receivedContent.startsWith("4") && !isDMChat) || (receivedContent.startsWith("3") && isDMChat)) {
            return await messagingService.reply(message, "Reminder modification cancelled.");
        }
    }

    private async isDMReminder(message: Message) {
        let isDM = false;
        const shouldRecurMessage =
            "האם לשלוח את התזכורת בהודעה פרטית?\nDo you want this reminder to be sent to you privately?\n\n*1.* Yes (כן)\n*2.* No (לא)\n*3.* Cancel (ביטול)";
        await messagingService.reply(message, shouldRecurMessage, true);
        let recvMsg = await this.validatedWaitForInteractionWith(
            message,
            (msg) =>
                messagingService.reply(
                    message,
                    "You must answer with either `1`, `2` or `3`.\nבבקשה תענה עם `1`, `2` או `3`.",
                ),
            "1",
            "2",
            "3",
            "yes",
            "no",
            "כן",
            "לא",
            "cancel",
            "ביטול",
        );

        const receivedContent = recvMsg
            .content!.toLowerCase()
            .replace("לא", "no")
            .replace("no", "2")
            .replace("כן", "yes")
            .replace("yes", "1")
            .replace("ביטול", "cancel")
            .replace("cancel", "3");
        if (receivedContent.startsWith("3")) {
            await messagingService.reply(message, "Reminder creation cancelled.");
            return undefined;
        }

        isDM = receivedContent.startsWith("1");
        return isDM;
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}

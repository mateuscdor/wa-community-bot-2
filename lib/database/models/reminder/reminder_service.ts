import {isJidGroup, isJidUser} from "@adiwajshing/baileys";
import moment from "moment";
import {ObjectId, UpdateFilter} from "mongodb";
import {remindersCollection} from "../..";
import {messagingService} from "../../../constants/services";
import {normalizeJid} from "../../../utils/group_utils";
import ReminderModel from "./reminder_model";

export default class ReminderService {
    private readonly repository: Map<ObjectId, ReminderModel> = new Map<ObjectId, ReminderModel>();

    constructor() {
        remindersCollection.find<Map<string, any>>({}).forEach((reminder) => {
            this.updateLocal(ReminderModel.fromMap(reminder));
        })

        setInterval(() => {
            this.repository.forEach(async (reminder) => {
                if (reminder.remindTimestamp <= moment().unix()) {
                    this.delete(reminder._id);
                    await messagingService.sendMessage(reminder.jid, {text: `*⏰Reminder*\n\n${reminder.reminder}`});
                }
            });
        }, 1000 * 20);
    }

    public async get(id: ObjectId | undefined, update: boolean = false): Promise<ReminderModel | undefined> {
        if (!id) return;

        let reminder: ReminderModel | undefined = this.repository.get(id);

        if (update || !reminder) {
            reminder = await this.fetch(id);
        }

        if (reminder) this.repository.set(id, reminder);
        else this.repository.delete(id);

        return reminder;
    }

    async create(reminder: ReminderModel): Promise<ReminderModel | undefined> {
        const res = await remindersCollection.insertOne(reminder.toMap());
        if (res.acknowledged) {
            this.updateLocal(reminder);
            return this.get(reminder._id);
        }
        return undefined;
    }

    async createSimple(jid: string | undefined, reminderText: string, remindTimestamp: number): Promise<ReminderModel | undefined> {
        if (!jid) return;
        jid = normalizeJid(jid);

        if (!jid || (!isJidUser(jid) && !isJidGroup(jid))) {
            return;
        }

        const reminder = new ReminderModel(new ObjectId(), jid, reminderText, remindTimestamp);
        return this.create(reminder);
    }

    async fetch(id: ObjectId | undefined): Promise<ReminderModel | undefined> {
        if (!id) return;
        const res = await remindersCollection.findOne<Map<string, any>>({_id: id});
        return res ? ReminderModel.fromMap(res) : undefined;
    }

    async delete(id: ObjectId | undefined): Promise<void> {
        if (!id) return;
        const res = await remindersCollection.deleteOne({_id: id});
        if (res.acknowledged) {
            this.repository.delete(id);
        }
    }

    updateLocal(reminder: ReminderModel | undefined): void {
        if (!reminder) return;
        this.repository.set(reminder._id, reminder);
    }
}

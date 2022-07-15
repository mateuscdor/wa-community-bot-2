import moment from "moment";
import {Command} from "../command";
import {userRepository} from "../constants/services";
import {UserModel} from "../database/models";

export default class User {
    public model: UserModel;

    constructor(model: UserModel) {
        this.model = model;
    }

    public static fromModel(user: UserModel): User | null | undefined {
        return new User(user);
    }

    public async addCooldown(jid: string, command: Command) {
        const cooldowns = this.model.cooldowns;
        const commandCooldowns = cooldowns[jid] ?? new Map<string, number>();
        commandCooldowns[command.mainTrigger.command] = Date.now();
        cooldowns[jid] = commandCooldowns;

        // update user cooldowns in database
        return await userRepository.update(this.model.jid, {$set: {cooldowns}});
    }

    /**
     * checks if the user has a cooldown for the given command
     * @param command The command to check for
     * @returns true if the user has a cooldown for the given command and false otherwise
     */
    public hasCooldown(command: Command) {
        return command.cooldowns.get(this.model.chatLevel) !== undefined;
    }
    
    public timeTillCooldownEnd(jid: string, command: Command) {
        const cooldowns = this.model.cooldowns;
        const commandCooldowns = cooldowns[jid] ?? new Map<string, number>();
        const cooldownEnd = (commandCooldowns[command.mainTrigger.command] ?? 0) + (command.cooldowns.get(this.model.chatLevel) ?? 0);
        return Math.max(0, cooldownEnd - Date.now());
    }

    public getDefaultingName(fallback?: string) {
        return this.getFullDefaultingName(fallback)?.split(" ")[0];
    }

    public getFullDefaultingName(fallback?: string) {
        return this.model.name ?? fallback;
    }
}

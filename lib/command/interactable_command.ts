import {Message} from "../message";
import {waitForMessage} from "../utils/message_utils";
import Command from "./command";

export default abstract class InteractableCommand extends Command {
    public async waitForInteractionWith(
        message: Message,
        filter?: (message: Message) => boolean | undefined | Promise<boolean | undefined>,
        onFail?: (message: Message) => any | Promise<any>,
    ): Promise<Message> {
        return waitForMessage(async (msg) => {
            const baseCheck =
                msg.sender == message.sender &&
                msg.raw?.key.remoteJid == message.raw?.key.remoteJid &&
                (msg.content?.length ?? 0) > 0;
            if (!baseCheck) return false;
            if (!filter) return true;

            const filterResult = await filter(msg);
            if (filterResult === undefined) return true;
            if (!filterResult && onFail) await onFail(msg);
            return filterResult;
        });
    }

    public async validatedWaitForInteractionWith(
        message: Message,
        onFail?: (message: Message) => any | Promise<any>,
        ...validResponses: (string | undefined)[]
    ) {
        const validResponsesNoUndefined: string[] = validResponses.filter((e) => e !== undefined) as string[];
        return this.waitForInteractionWith(
            message,
            async (msg) => {
                if (validResponsesNoUndefined.some((e) => msg.content?.toLowerCase()?.startsWith(e) ?? false))
                    return true;
                return false;
            },
            onFail,
        );
    }
}

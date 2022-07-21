import {Message} from "../message";
import {waitForMessage} from "../utils/message_utils";
import Command from "./command";

export default abstract class InteractableCommand extends Command {
    public async waitForInteractionWith(
        message: Message,
        filter?: (message: Message) => boolean | undefined | Promise<boolean | undefined>,
        onFail?: (message: Message) => any | Promise<any>,
        timeout?: number,
        onTimeout?: () => any | Promise<any>,
    ): Promise<Message | undefined> {
        let timedOut = false;
        if (timeout !== undefined && timeout > 0) {
            setTimeout(async () => {
                timedOut = true;
                if (onTimeout) await onTimeout();
            }, timeout);
        }
        return waitForMessage(async (msg) => {
            if (timedOut) return true;
            const baseCheck =
                msg.sender == message.sender &&
                msg.raw?.key.remoteJid == message.raw?.key.remoteJid &&
                (msg.content?.trim()?.length ?? 0) > 0;
            if (!baseCheck) return false;
            if (!filter) return true;

            const filterResult = await filter(msg);
            if (filterResult === undefined) return true;
            if (!filterResult && onFail) await onFail(msg);
            return filterResult;
        }).then((msg) => {
            if (timedOut) return undefined;
            return msg;
        });
    }

    public async validatedWaitForInteractionWith(
        message: Message,
        onFail?: (message: Message) => any | Promise<any>,
        timeout?: number,
        onTimeout?: () => any | Promise<any>,
        ...validResponses: (string | undefined)[]
    ) {
        const validResponsesNoUndefined: string[] = validResponses.filter((e) => e !== undefined) as string[];
        return this.waitForInteractionWith(
            message,
            async (msg) => {
                if (validResponsesNoUndefined.some((e) => msg.content?.trim().toLowerCase()?.startsWith(e) ?? false))
                    return true;
                return false;
            },
            onFail,
            timeout,
            onTimeout,
        );
    }
}

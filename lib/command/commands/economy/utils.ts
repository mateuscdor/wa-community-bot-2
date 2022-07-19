import {Balance} from "../../../economy";
import {commas} from "../../../utils/utils";

export function buildBalanceChangeMessage(
    previous: Balance,
    current: Balance,
    previousNet: number,
    currentNet: number,
    bankCapacity?: number,
) {
    const havePlus = (num: number) => (num > 0 ? "+" : "");

    const netDiff = currentNet - previousNet;
    const walletDiff = current.wallet - previous.wallet;
    const bankDiff = current.bank - previous.bank;

    const capacityText = bankCapacity
        ? ` / ${commas(bankCapacity)} (${((current.bank / bankCapacity) * 100).toFixed(1)}%)`
        : "";
    const walletText =
        walletDiff! + 0
            ? `${commas(previous.wallet)} => ${commas(current.wallet)} (${havePlus(walletDiff)}${commas(walletDiff)})`
            : `${commas(current.wallet)}`;

    const bankText =
        bankDiff != 0
            ? `${commas(previous.bank)} => ${commas(current.bank)}${capacityText} (${havePlus(bankDiff)}${commas(
                  bankDiff,
              )})`
            : `${commas(current.bank)}${capacityText}`;

    const netText = `${commas(previousNet)} => ${commas(currentNet)} (${havePlus(netDiff)}${commas(netDiff)})`;

    return `*Wallet:* ${walletText}\n*Bank:* ${bankText}\n*Net:* ${netText}`;
}

/**
 * allows support for number prefixes such as k (thousand), m (million), b (billion)...
 * @param str string to extract numbers from
 * @returns a list of numbers that exist in the string
 */
export function extractNumbers(str: string): number[] {
    console.log(`general match: ${str.match(/((-\d+)|\d+)[a-zA-Z]+/g)}`);
    const numbers = (str.match(/((-\d+)|\d+)[a-zA-Z]+/g) ?? []).map((numData) => {
        const numStr = numData.match(/(-\d+)|\d+/g)?.[0] ?? "";
        console.log(`numStr: ${numStr}`);
        const numPrefix = numData.match(/[a-zA-Z]+/g)?.[0] ?? "";
        const num = Number(numStr);

        if (numPrefix === "" || !numPrefix) {
            return num;
        } else if (numPrefix.startsWith("k")) {
            return num * 1000;
        } else if (numPrefix.startsWith("m")) {
            return num * 1000000;
        } else if (numPrefix.startsWith("b")) {
            return num * 1000000000;
        } else if (numPrefix.startsWith("t")) {
            return num * 1000000000000;
        } else if (numPrefix.startsWith("q")) {
            return num * 1000000000000000;
        }

        return num;
    });

    return numbers;
}

import moment from "moment";
import {createLogger, format, transports} from "winston";
import pino from "pino";
import fs from "fs";

const logDirectory = "./logs";
const botLogsDirectory = `${logDirectory}/bot`;
const botStoreDirectory = `${logDirectory}/store`;
const botTrafficDirectory = `${logDirectory}/traffic`;
// ensure log directory exists
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

fs.existsSync(botStoreDirectory) || fs.mkdirSync(botStoreDirectory);
fs.existsSync(botTrafficDirectory) || fs.mkdirSync(botTrafficDirectory);
fs.existsSync(botLogsDirectory) || fs.mkdirSync(botLogsDirectory);

export const logger = createLogger({
    level: "info",
    exitOnError: false,
    format: format.json(),
    transports: [
        new transports.File({filename: `${botLogsDirectory}/${moment().format("DD-MM-YYYY-HH-mm-ss")}.log`, level: "debug"}),
        new transports.Console({format: format.cli({level: true}), level: "debug", }),
    ],
});

export const botTrafficLogger = pino(
    {
        level: "info",
    },
    pino.destination(`${botTrafficDirectory}/${moment().format("DD-MM-YYYY-HH-mm-ss")}.log`),
);

export const storeLogger = pino(
    {
        level: "info",
        stream: "store",
    },
    pino.destination(`${botStoreDirectory}/${moment().format("DD-MM-YYYY-HH-mm-ss")}.log`),
);

import moment from "moment";
import {createLogger, format, transports} from "winston";
import pino from "pino";

export const logger = createLogger({
    level: "info",
    exitOnError: false,
    format: format.json(),
    transports: [new transports.File({filename: `../../logs/bot/${moment().format("DD-MM-YYYY-HH-mm-ss")}.log`})],
});

export const botTrafficLogger = pino(
    {
        level: "info",
        prettyPrint: {
            colorize: true,
            levelFirst: true,
            translateTime: "yyyy-dd-mm, h:MM:ss TT",
        },
    },
    pino.destination(`../../logs/traffic/${moment().format("DD-MM-YYYY-HH-mm-ss")}.log`),
);

export const storeLogger = pino(
    {
        level: "info",
        stream: "store",
        prettyPrint: {
            colorize: true,
            levelFirst: true,
            translateTime: "yyyy-dd-mm, h:MM:ss TT",
        },
    },
    pino.destination(`../../logs/store/${moment().format("DD-MM-YYYY-HH-mm-ss")}.log`),
);

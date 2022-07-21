import makeWASocket, {
    makeInMemoryStore,
    useSingleFileAuthState,
    WASocket,
    BaileysEventEmitter,
    DisconnectReason,
    AuthenticationState,
    BaileysEventMap,
    Browsers,
    useMultiFileAuthState,
} from "@adiwajshing/baileys";
import {Boom} from "@hapi/boom";
import {existsSync, fstat, mkdir, mkdirSync} from "fs";
import P from "pino";
import { messagingService } from "./constants/services";
import {getClientID} from "./utils/client_utils";

export class BotClient {
    public static currentClientId: string | undefined;
    private authPath: string | undefined;
    private storePath: string | undefined;

    public store: ReturnType<typeof makeInMemoryStore>;

    public client: WASocket | undefined | null;
    public eventListener: BaileysEventEmitter | undefined;

    private registerListeners: (listener: BaileysEventEmitter, client: BotClient) => void;

    /**
     *
     * @param session_path store path.
     * @param registerListeners App may run into an error and crash. The client tries to reconnect. if successful listeners need to be re-registered
     */
    constructor(
        session_path = "./session",
        registerListeners: (listener: BaileysEventEmitter, client: BotClient) => void,
    ) {
        const storePath = `${session_path}/store`;
        const authPath = `${session_path}/auth`;
        if (!existsSync(session_path)) {
            console.log("creating");
            mkdirSync(session_path);
        }
        if (!existsSync(storePath)) {
            mkdirSync(storePath);
        }
        if (!existsSync(authPath)) {
            mkdirSync(authPath);
        }

        this.authPath = authPath;
        this.storePath = storePath;

        this.store = makeInMemoryStore({
            logger: P().child({level: "fatal", stream: "store"}),
        });
        this.store.readFromFile(storePath + "/baileys_store_multi.json");
        // save every 10s
        setInterval(() => {
            this.store.writeToFile(storePath + "/baileys_store_multi.json");
        }, 10000);

        this.client = undefined;
        this.eventListener = undefined;
        this.registerListeners = registerListeners;
    }

    public start() {
        if (!this.authPath) return;
        useMultiFileAuthState(this.authPath).then((authState) => {
            this.initBot(authState.state, authState.saveCreds);
        });
    }

    private initBot(state: AuthenticationState, saveCreds: () => Promise<void>) {
        this.client = makeWASocket({
            logger: P({level: "fatal"}),
            printQRInTerminal: true,
            auth: state,
        });

        messagingService.setClient(this.client);
        this.store.bind(this.client.ev);
        console.log("Client Ready!");
        this.eventListener = this.client.ev;

        this.registerListeners(this.eventListener, this);
        this.eventListener.on("connection.update", (update) => {
            const {connection, lastDisconnect} = update;
            console.log(`conn ${connection} - ${lastDisconnect?.error}`);
            if (lastDisconnect?.error) {
                console.log("ERROR!");
                console.error(lastDisconnect.error);
            }
            if (connection === "close") {
                // reconnect if not logged out
                if (new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut) {
                    console.log("disconnected");

                    this.start();
                } else {
                    // console.log('connection closed')
                }
            } else if (connection == "open") {
                BotClient.currentClientId = getClientID(this.client!);
            }
            // console.log('connection update', update)
        });
        // listen for when the auth credentials is updated
        this.eventListener.on("creds.update", saveCreds);
    }

    public async restart() {
        this.start();
    }
}

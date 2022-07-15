import makeWASocket, {
  makeInMemoryStore,
  useSingleFileAuthState,
  WASocket,
  BaileysEventEmitter,
  DisconnectReason,
  AuthenticationState,
  BaileysEventMap,
  Browsers,
} from "@adiwajshing/baileys";
import { Boom } from "@hapi/boom";
import { existsSync, fstat, mkdir, mkdirSync } from "fs";
import P from "pino";
import { getClientID } from "./utils/client_utils";

export class BotClient {
  public static currentClientId: string | undefined;

  public store: ReturnType<typeof makeInMemoryStore>;
  private state: AuthenticationState;
  private saveState;

  public client: WASocket | undefined | null;
  public eventListener: BaileysEventEmitter | undefined;

  private registerListeners: (
    listener: BaileysEventEmitter,
    client: BotClient
  ) => void;

  /**
   *
   * @param store_path store path.
   * @param registerListeners App may run into an error and crash. The client tries to reconnect. if successful listeners need to be re-registered
   */
  constructor(
    store_path = "./session",
    registerListeners: (
      listener: BaileysEventEmitter,
      client: BotClient
    ) => void
  ) {
    if (!existsSync(store_path)) {
      console.log('creating')
      mkdirSync(store_path);
    }

    this.store = makeInMemoryStore({
      logger: P().child({ level: "fatal", stream: "store" }),
    });
    this.store.readFromFile(store_path + "/baileys_store_multi.json");
    // save every 10s
    setInterval(() => {
      this.store.writeToFile(store_path + "/baileys_store_multi.json");
    }, 10000);

    const { state, saveState } = useSingleFileAuthState(
      store_path + "/auth_info_multi.json"
    );

    this.state = state;
    this.saveState = saveState;
    this.client = undefined;
    this.eventListener = undefined;
    this.registerListeners = registerListeners;
  }

  public start() {
    this.client = makeWASocket({
      logger: P({ level: 'fatal' }),
      printQRInTerminal: true,
      auth: this.state,
    });

    this.store.bind(this.client.ev);
    console.log("Client Ready!");
    this.eventListener = this.client.ev;

    this.registerListeners(this.eventListener, this);
    this.eventListener.on("connection.update", (update) => {
      const { connection, lastDisconnect } = update;
      console.log(`conn ${connection} - ${lastDisconnect?.error}`);
      if (lastDisconnect?.error) {
        console.log("ERROR!")
        console.error(lastDisconnect.error)
      }
      if (connection === "close") {
        // reconnect if not logged out
        if (
          new Boom(lastDisconnect?.error)?.output?.statusCode !==
          DisconnectReason.loggedOut
        ) {
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
    this.eventListener.on("creds.update", () => {
      this.saveState()
    });
  }
}

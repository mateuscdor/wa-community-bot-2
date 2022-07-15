import { MongoClient } from 'mongodb';
import { databaseName, databaseUrl, chatsCollectionName, usersCollectionName, messagesCollectionName } from './config';

export const client = new MongoClient(databaseUrl);
export const database = client.db(databaseName);

export const usersCollection = database.collection(usersCollectionName);
export const chatsCollection = database.collection(chatsCollectionName);
export const messagesCollection = database.collection(messagesCollectionName);

usersCollection.createIndex({ "jid": 1 }, { unique: true });
chatsCollection.createIndex({ "jid": 1 }, { unique: true });

export async function connectToDatabase() {
    await client.connect();
    console.log("Successfully connected to database!")
}

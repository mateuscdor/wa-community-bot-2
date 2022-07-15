import ChatRepository from "../chats/chat_repository";
import { MessageRepository } from "../message";
import MessagingService from "../messaging_service";
import UserRepository from "../user/user_repository";

export const messagingService = new MessagingService();
export const chatRepository = new ChatRepository();
export const userRepository = new UserRepository();
export const messageRepository = new MessageRepository();
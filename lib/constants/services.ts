import ChatRepository from "../chats/chat_repository";
import ReminderService from "../database/models/reminder/reminder_service";
import { MessageRepository } from "../message";
import MessagingService from "../messaging_service";
import UserRepository from "../user/user_repository";

export const messagingService = new MessagingService();
export const chatRepository = new ChatRepository();
export const userRepository = new UserRepository();
export const reminderService = new ReminderService();
export const messageRepository = new MessageRepository();
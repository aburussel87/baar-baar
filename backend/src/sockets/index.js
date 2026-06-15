"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = setupSockets;
const socket_io_1 = require("socket.io");
const prisma_1 = __importDefault(require("../utils/prisma"));
// Keep track of online users
// userId -> socketId mapping
const onlineUsers = new Map();
function setupSockets(io) {
    io.on('connection', (socket) => {
        const userId = socket.handshake.query.userId;
        if (userId) {
            onlineUsers.set(userId, socket.id);
            socket.join(userId);
            // Broadcast to everyone that this user is online
            io.emit('user_online', userId);
            console.log(`User connected: ${userId} (${socket.id})`);
        }
        socket.on('send_message', async (data) => {
            // data: { message: Message, participantIds: string[] }
            const { message, participantIds } = data;
            // Emit to all participants
            if (participantIds && participantIds.length > 0) {
                participantIds.forEach((pId) => {
                    io.to(pId).emit('receive_message', message);
                });
            }
        });
        socket.on('typing', (data) => {
            // data: { conversationId, senderId, receiverId }
            const { conversationId, senderId, receiverId } = data;
            io.to(receiverId).emit('typing', { conversationId, senderId });
        });
        socket.on('stop_typing', (data) => {
            const { conversationId, senderId, receiverId } = data;
            io.to(receiverId).emit('stop_typing', { conversationId, senderId });
        });
        socket.on('message_read', async (data) => {
            // data: { messageId, conversationId, senderId, receiverId }
            const { messageId, conversationId, senderId, receiverId } = data;
            // Update DB
            try {
                await prisma_1.default.message.update({
                    where: { id: messageId },
                    data: { status: 'READ' },
                });
                io.to(senderId).emit('message_read', { messageId, conversationId });
            }
            catch (error) {
                console.error('Error updating message read status', error);
            }
        });
        socket.on('disconnect', () => {
            if (userId) {
                onlineUsers.delete(userId);
                io.emit('user_offline', userId);
                console.log(`User disconnected: ${userId} (${socket.id})`);
            }
        });
    });
}
//# sourceMappingURL=index.js.map
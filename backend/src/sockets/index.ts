import { Server, Socket } from 'socket.io';
import prisma from '../utils/prisma';

// Keep track of online users
// userId -> socketId mapping
const onlineUsers = new Map<string, string>();

export default function setupSockets(io: Server) {
  io.on('connection', (socket: Socket) => {
    const userId = socket.handshake.query.userId as string;

    if (userId) {
      onlineUsers.set(userId, socket.id);
      socket.join(userId);

      // Send the currently online users to the newly connected user
      socket.emit('initial_online_users', Array.from(onlineUsers.keys()));

      // Broadcast to everyone that this user is online
      io.emit('user_online', userId);
      console.log(`User connected: ${userId} (${socket.id})`);
    }

    socket.on('send_message', async (data) => {
      // data: { message: Message, participantIds: string[] }
      const { message, participantIds } = data;
      
      // Emit to all participants
      if (participantIds && participantIds.length > 0) {
        participantIds.forEach((pId: string) => {
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
        await prisma.message.update({
          where: { id: messageId },
          data: { status: 'READ' },
        });
        
        io.to(senderId).emit('message_read', { messageId, conversationId });
      } catch (error) {
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

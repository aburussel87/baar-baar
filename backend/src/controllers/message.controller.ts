import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const conversationId = req.params.conversationId as string;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Verify user is part of the conversation
    const conversation = await prisma.conversationParticipant.findUnique({
      where: {
        userId_conversationId: {
          userId,
          conversationId,
        },
      },
    });

    if (!conversation) {
      return res.status(403).json({ success: false, message: 'Not part of this conversation' });
    }

    const cursor = req.query.cursor as string | undefined;

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
      },
      take: 21, // Fetch one extra to determine if there are more
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Fetch latest messages first
      },
    });

    const hasMore = messages.length === 21;
    const paginatedMessages = hasMore ? messages.slice(0, 20) : messages;

    // Reverse them to chronological order for the frontend
    paginatedMessages.reverse();

    res.json({ success: true, data: paginatedMessages, hasMore });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId, body, type } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Verify user is part of the conversation
    const conversation = await prisma.conversationParticipant.findUnique({
      where: {
        userId_conversationId: {
          userId,
          conversationId,
        },
      },
    });

    if (!conversation) {
      return res.status(403).json({ success: false, message: 'Not part of this conversation' });
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        body,
        type: type || 'TEXT',
        status: 'SENT',
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    // Update conversation's updatedAt timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const markMessageAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        conversation: {
          include: {
            participants: true,
          },
        },
      },
    });

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // @ts-ignore
    const isParticipant = message.conversation?.participants?.some((p: any) => p.userId === userId);
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Not part of this conversation' });
    }

    // Ensure the message wasn't sent by the user who is reading it
    if (message.senderId === userId) {
      return res.json({ success: true, data: message }); // Do nothing if it's their own message
    }

    const updatedMessage = await prisma.message.update({
      where: { id },
      data: { status: 'READ' },
    });

    res.json({ success: true, data: updatedMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

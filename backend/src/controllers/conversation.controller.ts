import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                publicKey: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1, // Get latest message
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    res.json({ success: true, data: conversations });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createConversation = async (req: AuthRequest, res: Response) => {
  try {
    const { participantId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!participantId) {
      return res.status(400).json({ success: false, message: 'participantId is required' });
    }

    // Check if conversation already exists between these two users
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        AND: [
          { participants: { some: { userId: userId } } },
          { participants: { some: { userId: participantId } } },
        ],
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true, publicKey: true },
            },
          },
        },
      },
    });

    if (existingConversation) {
      return res.json({ success: true, data: existingConversation });
    }

    // Create new conversation
    const newConversation = await prisma.conversation.create({
      data: {
        isGroup: false,
        participants: {
          create: [
            { userId: userId },
            { userId: participantId },
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true, publicKey: true },
            },
          },
        },
      },
    });

    res.status(201).json({ success: true, data: newConversation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getConversationById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        participants: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true, publicKey: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    res.json({ success: true, data: conversation });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createGroupConversation = async (req: AuthRequest, res: Response) => {
  try {
    const { name, participantIds } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!name || !participantIds || !Array.isArray(participantIds)) {
      return res.status(400).json({ success: false, message: 'name and participantIds array are required' });
    }

    const allParticipants = new Set([...participantIds, userId]);
    
    if (allParticipants.size < 3) {
       return res.status(400).json({ success: false, message: 'Group must have at least 3 participants including you' });
    }

    const participantsData = Array.from(allParticipants).map(id => ({ userId: id }));

    const newGroup = await prisma.conversation.create({
      data: {
        isGroup: true,
        name,
        participants: {
          create: participantsData,
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true, publicKey: true },
            },
          },
        },
      },
    });

    res.status(201).json({ success: true, data: newGroup });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const leaveGroup = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: { participants: true }
    });

    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const participant = conversation.participants.find(p => p.userId === userId);
    if (!participant) {
      return res.status(400).json({ success: false, message: 'Not a member of this group' });
    }

    await prisma.conversationParticipant.delete({
      where: { id: participant.id }
    });

    res.json({ success: true, message: 'Left group successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const clearConversation = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const participant = await prisma.conversationParticipant.findFirst({
      where: { conversationId: id, userId }
    });

    if (!participant) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    await prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { clearedAt: new Date() }
    });

    res.json({ success: true, message: 'Conversation cleared successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

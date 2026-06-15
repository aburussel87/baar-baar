"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConversationById = exports.createConversation = exports.getConversations = void 0;
const express_1 = require("express");
const prisma_1 = __importDefault(require("../utils/prisma"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const getConversations = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const conversations = await prisma_1.default.conversation.findMany({
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getConversations = getConversations;
const createConversation = async (req, res) => {
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
        const existingConversation = await prisma_1.default.conversation.findFirst({
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
                            select: { id: true, name: true, email: true, avatar: true },
                        },
                    },
                },
            },
        });
        if (existingConversation) {
            return res.json({ success: true, data: existingConversation });
        }
        // Create new conversation
        const newConversation = await prisma_1.default.conversation.create({
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
                            select: { id: true, name: true, email: true, avatar: true },
                        },
                    },
                },
            },
        });
        res.status(201).json({ success: true, data: newConversation });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.createConversation = createConversation;
const getConversationById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const conversation = await prisma_1.default.conversation.findFirst({
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
                            select: { id: true, name: true, email: true, avatar: true },
                        },
                    },
                },
            },
        });
        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }
        res.json({ success: true, data: conversation });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getConversationById = getConversationById;
//# sourceMappingURL=conversation.controller.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markMessageAsRead = exports.sendMessage = exports.getMessages = void 0;
const express_1 = require("express");
const prisma_1 = __importDefault(require("../utils/prisma"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        // Verify user is part of the conversation
        const conversation = await prisma_1.default.conversationParticipant.findUnique({
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
        const messages = await prisma_1.default.message.findMany({
            where: {
                conversationId,
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
            orderBy: {
                createdAt: 'asc',
            },
        });
        res.json({ success: true, data: messages });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getMessages = getMessages;
const sendMessage = async (req, res) => {
    try {
        const { conversationId, body, type } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        // Verify user is part of the conversation
        const conversation = await prisma_1.default.conversationParticipant.findUnique({
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
        const message = await prisma_1.default.message.create({
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
        await prisma_1.default.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
        });
        res.status(201).json({ success: true, data: message });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.sendMessage = sendMessage;
const markMessageAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const message = await prisma_1.default.message.findUnique({
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
        // Ensure the reader is a participant in the conversation
        const isParticipant = message.conversation.participants.some(p => p.userId === userId);
        if (!isParticipant) {
            return res.status(403).json({ success: false, message: 'Not part of this conversation' });
        }
        // Ensure the message wasn't sent by the user who is reading it
        if (message.senderId === userId) {
            return res.json({ success: true, data: message }); // Do nothing if it's their own message
        }
        const updatedMessage = await prisma_1.default.message.update({
            where: { id },
            data: { status: 'READ' },
        });
        res.json({ success: true, data: updatedMessage });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.markMessageAsRead = markMessageAsRead;
//# sourceMappingURL=message.controller.js.map
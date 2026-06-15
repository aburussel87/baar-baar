"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const conversation_controller_1 = require("../controllers/conversation.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.protect);
const createConvSchema = zod_1.z.object({
    body: zod_1.z.object({
        participantId: zod_1.z.string().uuid('Invalid user ID'),
    }),
});
router.get('/', conversation_controller_1.getConversations);
router.post('/', (0, validate_middleware_1.validateRequest)(createConvSchema), conversation_controller_1.createConversation);
router.get('/:id', conversation_controller_1.getConversationById);
exports.default = router;
//# sourceMappingURL=conversation.routes.js.map
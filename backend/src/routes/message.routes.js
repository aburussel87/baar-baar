"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const message_controller_1 = require("../controllers/message.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.protect);
const sendMessageSchema = zod_1.z.object({
    body: zod_1.z.object({
        conversationId: zod_1.z.string().uuid(),
        body: zod_1.z.string().min(1, 'Message cannot be empty'),
        type: zod_1.z.enum(['TEXT', 'IMAGE', 'FILE']).optional(),
    }),
});
router.get('/:conversationId', message_controller_1.getMessages);
router.post('/', (0, validate_middleware_1.validateRequest)(sendMessageSchema), message_controller_1.sendMessage);
router.patch('/:id/read', message_controller_1.markMessageAsRead);
exports.default = router;
//# sourceMappingURL=message.routes.js.map
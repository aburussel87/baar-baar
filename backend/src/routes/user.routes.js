"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.protect);
router.get('/', user_controller_1.getUsers);
router.get('/search', user_controller_1.searchUsers);
exports.default = router;
//# sourceMappingURL=user.routes.js.map
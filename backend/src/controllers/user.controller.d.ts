import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const getUsers: (req: AuthRequest, res: Response) => Promise<void>;
export declare const searchUsers: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=user.controller.d.ts.map
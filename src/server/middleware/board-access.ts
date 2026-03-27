import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';

function requireBoardMember(paramName = 'id') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const boardId = req.params[paramName] as string | undefined;
    const userId = req.user?.id;

    if (!boardId || !userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const member = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId } },
    });

    if (!member) {
      res.status(403).json({ error: 'Not a member of this board' });
      return;
    }

    req.boardId = boardId;
    next();
  };
}

function requireBoardAdmin(paramName = 'id') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const boardId = req.params[paramName] as string | undefined;
    const userId = req.user?.id;

    if (!boardId || !userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const member = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId } },
    });

    if (!member || member.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    req.boardId = boardId;
    next();
  };
}

export { requireBoardMember, requireBoardAdmin };

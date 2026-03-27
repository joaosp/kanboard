import { User } from './user';
import { List } from './list';

export interface Board {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  members?: BoardMember[];
  lists?: List[];
}

export interface BoardMember {
  boardId: string;
  userId: string;
  role: string;
  user?: User;
}

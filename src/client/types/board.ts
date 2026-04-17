import { User } from './user';
import { List } from './list';
import { Label } from './label';

export interface Board {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  members?: BoardMember[];
  lists?: List[];
  labels?: Label[];
}

export interface BoardMember {
  boardId: string;
  userId: string;
  role: string;
  user?: User;
}

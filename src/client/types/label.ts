export const LABEL_COLORS = ['red', 'amber', 'green', 'blue', 'purple', 'slate'] as const;
export type LabelColor = (typeof LABEL_COLORS)[number];

export interface Label {
  id: string;
  boardId: string;
  name: string;
  color: LabelColor;
  createdAt: string;
  updatedAt: string;
}

export interface CardLabel {
  cardId: string;
  labelId: string;
  createdAt: string;
}

import { useCardsStore } from '../stores/cards';

export function useCards() {
  const { createCard, updateCard, deleteCard, fetchCard } = useCardsStore();
  return { createCard, updateCard, deleteCard, fetchCard };
}

import { FormEvent, useState } from 'react';
import { useCardsStore } from '../../../stores/cards';
import { Button } from '../../shared/Button/Button';
import styles from './AddCardForm.module.css';

interface AddCardFormProps {
  listId: string;
}

export function AddCardForm({ listId }: AddCardFormProps) {
  const [title, setTitle] = useState('');
  const createCard = useCardsStore((s) => s.createCard);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createCard(listId, { title: title.trim() });
    setTitle('');
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} data-testid="add-card-form">
      <input
        className={styles.input}
        placeholder="Add a card..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        data-testid="add-card-input"
      />
      <Button type="submit" size="sm" data-testid="add-card-button">
        Add
      </Button>
    </form>
  );
}

import DataLoader from 'dataloader';
import { Flashcard } from '../entities/Flashcard';

// [1, 78, 8, 9]
// [{id: 1, username: 'tim'}, {}, {}, {}]
export const createFlashcardLoader = () =>
  new DataLoader<number, Flashcard>(async (fIds) => {
    const flashcards = await Flashcard.findByIds(fIds as number[]);
    const flashcardIdToFlashcard: Record<number, Flashcard> = {};
    flashcards.forEach((f) => {
      flashcardIdToFlashcard[f.id] = f;
    });
    return fIds.map((fid) => flashcardIdToFlashcard[fid]);
  });

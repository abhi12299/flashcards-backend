import { registerEnumType } from 'type-graphql';
import { FlashcardDifficulty, FlashcardStatus, FlashcardVisibility } from '../types';

registerEnumType(FlashcardDifficulty, {
  name: 'Difficulty',
  description: 'Difficulty of flashcard',
});

registerEnumType(FlashcardStatus, {
  name: 'FlashcardStatus',
  description: "User's status for a flashcard",
});

registerEnumType(FlashcardVisibility, {
  name: 'FlashcardVisibility',
  description: 'Visibility of a flashcard (public/private/deleted etc)',
});

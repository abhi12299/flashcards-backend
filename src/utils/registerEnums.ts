import { registerEnumType } from 'type-graphql';
import { FlashcardDifficulty, FlashcardStatus } from '../types';

registerEnumType(FlashcardDifficulty, {
  name: 'Difficulty',
  description: 'Difficulty of flashcard',
});

registerEnumType(FlashcardStatus, {
  name: 'FlashcardStatus',
  description: "User's status for a flashcard",
});

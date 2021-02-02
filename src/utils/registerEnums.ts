import { registerEnumType } from 'type-graphql';
import { FlashcardDifficulty } from '../types';

registerEnumType(FlashcardDifficulty, {
  name: 'Difficulty', // this one is mandatory
  description: 'Difficulty of flashcard', // this one is optional
});

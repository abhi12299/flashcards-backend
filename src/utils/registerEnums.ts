import { registerEnumType } from 'type-graphql';
import { FlashcardDifficulty, FlashcardStatus, FlashcardVisibility, ReportGroupBy, ReportTimespan } from '../types';

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

registerEnumType(ReportTimespan, {
  name: 'ReportTimespan',
  description: 'Duration to be captured in reporting',
});

registerEnumType(ReportGroupBy, {
  name: 'ReportGroupBy',
  description: 'Groups to be formed in reports',
});

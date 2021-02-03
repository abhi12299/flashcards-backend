import DataLoader from 'dataloader';
import { getConnection } from 'typeorm';
import { FlashcardStats } from '../graphqlTypes';

// ['1|1', '2|1', ...] -- userId|flashcardId
// [{avgTime: 1, numAttempts: 1, lastSeenOn: '1657888763' }, ...]
export const createFlashcardStatsLoader = () =>
  new DataLoader<string, FlashcardStats | undefined>(async (keys) => {
    let whereClause = `where `;
    const flatKeys = keys.map((s) => s.split('|').map((v) => parseInt(v))).flat();
    // flatKeys = [1, 1, 2, 1, ...]
    for (let i = 0; i < flatKeys.length - 1; i += 2) {
      whereClause += `(fh."userId" = $${i + 1} and fh."flashcardId" = $${i + 2}) or `;
    }
    whereClause = whereClause.slice(0, -4);

    const stats = await getConnection().query(
      `
    select
    fh."flashcardId" as "flashcardId",
    fh."userId" as "userId",
    ROUND(avg(fh."responseDuration")::numeric, 2) as "avgTime",
    count(*) as "numAttempts",
    max(fh."createdAt") as "lastSeenOn"
    from flashcard_history fh
    ${whereClause}
    group by fh."flashcardId", fh."userId";
    `,
      flatKeys,
    );
    const flashcardIdsToFlashcardHistory: Record<string, FlashcardStats> = {};

    stats.forEach((s: any) => {
      flashcardIdsToFlashcardHistory[`${s.userId}|${s.flashcardId}`] = s;
    });
    return keys.map((key) => flashcardIdsToFlashcardHistory[key]);
  });

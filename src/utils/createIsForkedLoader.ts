import DataLoader from 'dataloader';
import { getConnection } from 'typeorm';

// ['1|1', '2|1', ...] -- userId|flashcardId
// [true, false, ...] -- is this flashcard forked previously by the user?
export const createIsForkedLoader = () =>
  new DataLoader<string, boolean>(async (keys) => {
    let whereClause = `where `;
    const flatKeys = keys.map((s) => s.split('|').map((v) => +v)).flat();
    // flatKeys = [1, 1, 2, 1, ...]
    for (let i = 0; i < flatKeys.length - 1; i += 2) {
      whereClause += `(f."forkedBy" = $${i + 1} and f."forkedFrom" = $${i + 2}) or `;
    }
    whereClause = whereClause.slice(0, -4);
    const resp = await getConnection().query(
      `
      select f.*
      from fork f
      ${whereClause};
    `,
      flatKeys,
    );

    const idsToIsForked: Record<string, boolean> = {};
    resp.forEach((r: any) => {
      idsToIsForked[`${r.forkedBy}|${r.forkedFrom}`] = true;
    });
    return keys.map((key) => idsToIsForked[key] || false);
  });

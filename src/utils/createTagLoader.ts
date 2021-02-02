import DataLoader from 'dataloader';
import { getConnection } from 'typeorm';
import { Tag } from '../entities/Tag';

// [1, 78, 8, 9]
// [[{id, name, createdAt, updatedAt}, {}], [{}]]
export const createTagLoader = () =>
  new DataLoader<number, Tag[]>(async (keys) => {
    const data = await getConnection().query(
      `
    select ftt."flashcardId" as fid, tag.*
    from flashcard_tags_tag ftt left join tag
    on tag.id = ftt."tagId"
    where ftt."flashcardId" = ANY($1);
    `,
      [keys],
    );
    const flashcardIdToTags: Record<string, Tag[]> = {};

    data.forEach((d: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { fid, ...tagData } = d as any;

      if (!flashcardIdToTags[fid]) {
        flashcardIdToTags[fid] = [tagData];
      } else {
        flashcardIdToTags[fid].push(tagData);
      }
    });

    return keys.map((flashcardId) => flashcardIdToTags[flashcardId]);
  });

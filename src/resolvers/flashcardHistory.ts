import { Arg, Ctx, FieldResolver, Query, Resolver, Root, UseMiddleware } from 'type-graphql';
import { getConnection } from 'typeorm';
import { Flashcard } from '../entities/Flashcard';
import { FlashcardHistory } from '../entities/FlashcardHistory';
import { GetFlashcardsHistoryInput, PaginatedFlashcardsHistory } from '../graphqlTypes';
import { isAuth } from '../middleware/isAuth';
import { MyContext } from '../types';

@Resolver(FlashcardHistory)
export class FlashcardHistoryResolver {
  // @FieldResolver(() => String)
  // textSnippet(@Root() post: Flashcard) {
  //   return post.text.slice(0, 50);
  // }

  @FieldResolver(() => Flashcard)
  flashcard(@Root() fcHistory: FlashcardHistory, @Ctx() { flashcardLoader }: MyContext) {
    return flashcardLoader.load(fcHistory.flashcardId);
  }

  @Query(() => PaginatedFlashcardsHistory)
  @UseMiddleware(isAuth)
  async flashcardHistory(
    @Arg('input') { limit, cursor }: GetFlashcardsHistoryInput,
    @Ctx() { req }: MyContext,
  ): Promise<PaginatedFlashcardsHistory> {
    const { id: userId } = req.user!;
    const realLimit = Math.min(50, limit);
    const reaLimitPlusOne = realLimit + 1;

    const replacements: unknown[] = [reaLimitPlusOne];

    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
    }

    const qb = getConnection()
      .getRepository(FlashcardHistory)
      .createQueryBuilder('fch')
      .where('fch."userId" = :userId', { userId })
      .orderBy('fch.createdAt', 'DESC')
      .take(reaLimitPlusOne);

    if (cursor) {
      qb.andWhere('fch."createdAt" < :cursor', {
        cursor: new Date(parseInt(cursor)),
      });
    }

    const flashcardHistory = await qb.getMany();

    return {
      flashcardHistory: flashcardHistory.slice(0, realLimit),
      hasMore: flashcardHistory.length === reaLimitPlusOne,
    };
  }
}

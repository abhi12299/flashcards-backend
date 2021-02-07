import * as Sentry from '@sentry/node';
import moment from 'moment';
import { Arg, Ctx, Int, Mutation, Query, Resolver, UseMiddleware } from 'type-graphql';
import { getConnection, In } from 'typeorm';
import { Collection } from '../entities/Collection';
import { Flashcard } from '../entities/Flashcard';
import { FlashcardHistory } from '../entities/FlashcardHistory';
import { Fork } from '../entities/Fork';
import { Tag } from '../entities/Tag';
import { User } from '../entities/User';
import {
  CreateCollectionInput,
  CreateCollectionResponse,
  FlashcardReportInput,
  FlashcardReportResponse,
  ForkFlashcardResponse,
  RespondToFlashcardInput,
  RespondToFlashcardResponse,
} from '../graphqlTypes';
import { isAuth } from '../middleware/isAuth';
import { FlashcardDifficulty, FlashcardStatus, MyContext, ReportGroupBy, ReportTimespan } from '../types';

@Resolver(Collection)
export class CollectionResolver {
  // @FieldResolver(() => FlashcardVisibility)
  // status(@Root() flashcard: Flashcard): FlashcardVisibility {
  //   if (!flashcard.isPublic) {
  //     return FlashcardVisibility.private;
  //   }
  //   if (flashcard.deletedAt) {
  //     return FlashcardVisibility.deleted;
  //   }
  //   return FlashcardVisibility.public;
  // }

  // @FieldResolver(() => User)
  // creator(@Root() flashcard: Flashcard, @Ctx() { userLoader }: MyContext) {
  //   return userLoader.load(flashcard.creatorId);
  // }

  // @FieldResolver(() => [Tag])
  // tags(@Root() flashcard: Flashcard, @Ctx() { tagLoader }: MyContext) {
  //   if (flashcard.tags) {
  //     return flashcard.tags;
  //   }
  //   return tagLoader.load(flashcard.id);
  // }

  // @FieldResolver(() => String)
  // title(@Root() flashcard: Flashcard, @Ctx() { req }: MyContext): string {
  //   if (flashcard.deletedAt) {
  //     return '';
  //   }
  //   if (flashcard.creatorId === req.user?.id || flashcard.isPublic) {
  //     return flashcard.title;
  //   }
  //   return '';
  // }

  // @FieldResolver(() => String)
  // body(@Root() flashcard: Flashcard, @Ctx() { req }: MyContext): string {
  //   if (flashcard.deletedAt) {
  //     return '';
  //   }
  //   if (flashcard.creatorId === req.user?.id || flashcard.isPublic) {
  //     return flashcard.body;
  //   }
  //   return '';
  // }

  // @FieldResolver(() => FlashcardStats, { nullable: true })
  // @UseMiddleware(isAuth)
  // async stats(
  //   @Root() flashcard: Flashcard,
  //   @Ctx() { req, flashcardStatsLoader }: MyContext,
  // ): Promise<FlashcardStats | undefined> {
  //   return flashcardStatsLoader.load(`${req.user!.id}|${flashcard.id}`);
  // }

  // @Query(() => PaginatedFlashcards)
  // async publicFlashcards(
  //   @Arg('input') { limit, cursor, tags, user }: GetFlashcardsInput,
  // ): Promise<PaginatedFlashcards> {
  //   const realLimit = Math.min(50, limit);
  //   const reaLimitPlusOne = realLimit + 1;

  //   const replacements: unknown[] = [reaLimitPlusOne];

  //   if (cursor) {
  //     replacements.push(new Date(parseInt(cursor)));
  //   }

  //   const qb = getConnection()
  //     .getRepository(Flashcard)
  //     .createQueryBuilder('fc')
  //     .where('fc."isPublic" = true')
  //     .andWhere('fc."isFork" = false');

  //   if (user) {
  //     qb.andWhere('fc."creatorId" = :user', { user });
  //   }
  //   if (cursor) {
  //     qb.andWhere('fc."createdAt" < :cursor', {
  //       cursor: new Date(parseInt(cursor)),
  //     });
  //   }

  //   if (tags) {
  //     qb.leftJoin('flashcard_tags_tag', 'ftt', 'fc.id = ftt."flashcardId"').leftJoin('tag', 't', 't.id = ftt."tagId"');
  //     qb.andWhere('t.name in (:...tags)', { tags });
  //   }
  //   const count = await qb.clone().select('count(*) as "totalCount"').execute();
  //   const flashcards = await qb.orderBy('fc.createdAt', 'DESC').take(reaLimitPlusOne).getMany();

  //   return {
  //     flashcards: flashcards.slice(0, realLimit),
  //     hasMore: flashcards.length === reaLimitPlusOne,
  //     total: count[0]?.totalCount,
  //   };
  // }

  // @Query(() => PaginatedFlashcards)
  // @UseMiddleware(isAuth)
  // async myFlashcards(
  //   @Arg('input') { limit, cursor, tags }: GetFlashcardsInput,
  //   @Ctx() { req }: MyContext,
  // ): Promise<PaginatedFlashcards> {
  //   const { id } = req.user!;
  //   const realLimit = Math.min(50, limit);
  //   const realLimitPlusOne = realLimit + 1;

  //   const replacements: unknown[] = [id, realLimitPlusOne];

  //   if (cursor) {
  //     replacements.push(new Date(parseInt(cursor)));
  //   }

  //   const qb = getConnection().getRepository(Flashcard).createQueryBuilder('fc').where('fc."creatorId" = :id', { id });

  //   if (cursor) {
  //     qb.andWhere('fc."createdAt" < :cursor', {
  //       cursor: new Date(parseInt(cursor)),
  //     });
  //   }

  //   if (tags) {
  //     qb.leftJoin('flashcard_tags_tag', 'ftt', 'fc.id = ftt."flashcardId"').leftJoin('tag', 't', 't.id = ftt."tagId"');
  //     qb.andWhere('t.name in (:...tags)', { tags });
  //   }
  //   const count = await qb.clone().select('count(*) as "totalCount"').execute();
  //   const flashcards = await qb.orderBy('fc.createdAt', 'DESC').take(realLimitPlusOne).getMany();
  //   return {
  //     flashcards: flashcards.slice(0, realLimit),
  //     hasMore: flashcards.length === realLimitPlusOne,
  //     total: count[0]?.totalCount,
  //   };
  // }

  // @Query(() => Flashcard, { nullable: true })
  // @UseMiddleware(isAuth)
  // async flashcard(@Arg('id', () => Int) id: number, @Ctx() { req }: MyContext): Promise<Flashcard | undefined> {
  //   const flashcard = await Flashcard.findOne({ where: { id }, relations: ['tags'] });
  //   if (!flashcard || flashcard.isPublic) {
  //     return flashcard;
  //   }

  //   if (flashcard.deletedAt || flashcard.creatorId !== req.user?.id) {
  //     return;
  //   }
  //   return flashcard;
  // }

  @Mutation(() => CreateCollectionResponse)
  @UseMiddleware(isAuth)
  async createCollection(
    @Arg('input') input: CreateCollectionInput,
    @Ctx() { req, logger }: MyContext,
  ): Promise<CreateCollectionResponse> {
    const { isPublic, tags, flashcards } = input;
    const { id: userId } = req.user!;
    return await getConnection().transaction(
      async (tm): Promise<CreateCollectionResponse> => {
        try {
          const fcs = await tm.getRepository(Flashcard).findByIds(flashcards);

          if (isPublic && !fcs.every((fc) => !fc.isPublic)) {
            // when isPublic==true, ensure all flashcards are public
            return {
              errors: [{ field: 'flashcards', message: 'Public collection must have all public flashcards!' }],
            };
          }

          tm.createQueryBuilder()
            .insert()
            .into(Tag)
            .values(tags.map((t) => ({ name: t })))
            .onConflict(`("name") DO NOTHING`)
            .returning('*')
            .execute();

          const tagObjs = await tm.getRepository(Tag).find({
            where: {
              name: In(tags),
            },
          });
          const user = await tm.getRepository(User).findOneOrFail(userId, { relations: ['tags'] });
          user.tags.push(...tagObjs);
          await tm.save(user);

          let collection = Collection.create({
            ...input,
            flashcards: fcs,
            tags: tagObjs,
            creatorId: userId,
          });

          collection = await tm.save(collection);
          return { collection };
        } catch (error) {
          logger.error(error);
          Sentry.captureException(error);
          return { errors: [{ field: 'collection', message: 'Cannot save your collection. Please try again later.' }] };
        }
      },
    );
  }

  // @Mutation(() => UpdateCollectionResponse)
  // @UseMiddleware(isAuth)
  // async updateFlashcard(
  //   @Arg('input') { name, description, flashcards, tags, id, isPublic }: UpdateCollectionInput,
  //   @Ctx() { req, logger }: MyContext,
  // ): Promise<UpdateFlashcardResponse> {
  //   const { id: userId } = req.user!;
  //   if (flashcards?.length === 0) {
  //     return { errors: [{ field: 'flashcards', message: 'A collection must have at least one flashcard!' }] };
  //   }
  //   if (tags?.length === 0) {
  //     return {
  //       errors: [{ field: 'tags', message: 'Tags cannot be empty!' }],
  //     };
  //   }
  //   return await getConnection().transaction(
  //     async (tm): Promise<UpdateFlashcardResponse> => {
  //       try {
  //         const collection = await tm.getRepository(Collection).findOneOrFail({
  //           where: { id, creatorId: userId },
  //           relations: ['tags'],
  //         });
  //         if (typeof isPublic === 'boolean' && collection.isPublic !== isPublic) {
  //           if (isPublic) {
  //             // confirm if new/old flashcards are all public
  //           } else {
  //             collection.isPublic = isPublic;
  //           }
  //         }
  //         if (name && collection.name !== name) {
  //           collection.name = name;
  //         }
  //         if (description && collection.description !== description) {
  //           collection.description = description;
  //         }

  //         if (tags) {
  //           // delete previous tags associated with it
  //           // insert new ones
  //           await tm.query(
  //             `
  //           delete from collection_tags_tag
  //           where "collectionId" = $1;
  //         `,
  //             [collection.id],
  //           );
  //           await tm
  //             .createQueryBuilder()
  //             .insert()
  //             .into(Tag)
  //             .values(tags.map((t) => ({ name: t })))
  //             .onConflict(`("name") DO NOTHING`)
  //             // .returning('*')
  //             .execute();

  //           const tagObjs = await tm.getRepository(Tag).find({
  //             where: {
  //               name: In(tags),
  //             },
  //           });
  //           const user = await tm.getRepository(User).findOneOrFail(userId, { relations: ['tags'] });
  //           user.tags.push(...tagObjs);
  //           await tm.save(user);
  //           collection.tags = tagObjs;
  //         }
  //         await tm.save(collection);

  //         return { flashcard };
  //       } catch (error) {
  //         Sentry.captureException(error);
  //         logger.error(error);
  //         return {
  //           errors: [
  //             {
  //               field: '',
  //               message: 'Cannot update the flashcard. Please try again later.',
  //             },
  //           ],
  //         };
  //       }
  //     },
  //   );
  // }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deleteFlashcard(@Arg('id', () => Int) id: number, @Ctx() { req }: MyContext): Promise<boolean> {
    await getConnection().getRepository(Flashcard).softDelete({ id, creatorId: req.user!.id });
    return true;
  }

  @Mutation(() => ForkFlashcardResponse)
  @UseMiddleware(isAuth)
  async forkFlashcard(
    @Arg('from', () => Int) fromId: number,
    @Ctx() { req, logger }: MyContext,
  ): Promise<ForkFlashcardResponse> {
    const { id: userId } = req.user!;
    // check if fromId is public
    const source = await Flashcard.findOne(fromId, { relations: ['tags'] });
    if (!source || !source.isPublic) {
      return {
        done: false,
        errors: [{ field: 'from', message: 'That flashcard cannot be forked.' }],
      };
    }
    if (source.creatorId === userId) {
      return {
        done: false,
        errors: [{ field: 'from', message: 'You cannot fork your own flashcard!' }],
      };
    }
    const existingFork = await Fork.findOne({ where: { forkedFrom: fromId, forkedBy: userId } });
    if (existingFork) {
      return {
        done: false,
        errors: [{ field: 'from', message: 'You have already forked this flashcard.' }],
      };
    }
    return await getConnection().transaction(
      async (tm): Promise<ForkFlashcardResponse> => {
        try {
          const target = new Flashcard();
          target.body = source.body;
          target.creatorId = userId;
          target.title = source.title;
          target.difficulty = source.difficulty;
          target.isPublic = false;
          target.isFork = true;
          target.tags = source.tags;
          const savedTarget = await tm.save(target);

          const fork = new Fork();
          fork.forkedFrom = source.id;
          fork.forkedTo = savedTarget.id;
          fork.forkedBy = userId;
          const user = await tm.getRepository(User).findOneOrFail(userId, { relations: ['tags'] });
          user.tags.push(...source.tags);
          await Promise.all([tm.save(user), tm.save(fork)]);
          return { done: true };
        } catch (error) {
          Sentry.captureException(error);
          logger.error(error);
          return {
            done: false,
            errors: [{ field: 'from', message: 'The flashcard cannot be forked. Please try again later.' }],
          };
        }
      },
    );
  }

  @Mutation(() => RespondToFlashcardResponse)
  @UseMiddleware(isAuth)
  async respondToFlashcard(
    @Arg('input') { id, type, duration }: RespondToFlashcardInput,
    @Ctx() { req, logger }: MyContext,
  ): Promise<RespondToFlashcardResponse> {
    const { id: userId } = req.user!;

    const flashcard = await Flashcard.findOne(id);
    if (!flashcard || (flashcard.creatorId !== userId && !flashcard.isPublic)) {
      return {
        done: false,
        errors: [{ field: 'id', message: 'This flashcard is no longer available.' }],
      };
    }
    const fcHistory = new FlashcardHistory();
    fcHistory.flashcardId = id;
    fcHistory.status = type;
    fcHistory.userId = userId;
    if ([FlashcardStatus.knowAnswer, FlashcardStatus.dontKnowAnswer].includes(type)) {
      if (!duration) duration = 0;
      fcHistory.responseDuration = duration;
    }
    try {
      await getConnection().getRepository(FlashcardHistory).insert(fcHistory);
      return { done: true };
    } catch (error) {
      Sentry.captureException(error);
      logger.error(error);
      return { done: false };
    }
  }

  @Query(() => FlashcardReportResponse)
  @UseMiddleware(isAuth)
  async flashcardsReport(
    @Arg('input') { timespan, groupBy }: FlashcardReportInput,
    @Ctx() { req, logger }: MyContext,
  ): Promise<FlashcardReportResponse> {
    try {
      let startDate: moment.Moment, endDate: moment.Moment;

      if (timespan === ReportTimespan.month) {
        startDate = moment().startOf('month');
        endDate = moment().endOf('month');
      } else {
        startDate = moment().startOf('week');
        endDate = moment().endOf('week');
      }
      const { id: userId } = req.user!;
      const qb = getConnection()
        .createQueryBuilder()
        .from(FlashcardHistory, 'fch')
        .leftJoin('flashcard', 'fc', 'fch."flashcardId" = fc.id')
        .where('fch."userId" = :userId', { userId })
        .andWhere('fch."createdAt" > :startDate', { startDate: startDate.format('YYYY-MM-DD HH:mm:ss') })
        .andWhere('fch."createdAt" < :endDate', { endDate: endDate.format('YYYY-MM-DD HH:mm:ss') });
      if (groupBy === ReportGroupBy.difficulty) {
        // group by their difficulty, return count
        const result = await qb
          .select(['fc."difficulty" as difficulty', 'count(*) as count'])
          .groupBy('fc."difficulty"')
          .execute();

        if (Array.isArray(result) && result.length > 0) {
          return {
            byDifficulty: {
              easy: result.find((r) => (r.difficulty as FlashcardDifficulty) === FlashcardDifficulty.easy)?.count,
              medium: result.find((r) => (r.difficulty as FlashcardDifficulty) === FlashcardDifficulty.medium)?.count,
              hard: result.find((r) => (r.difficulty as FlashcardDifficulty) === FlashcardDifficulty.hard)?.count,
            },
          };
        }
      } else if (groupBy === ReportGroupBy.answerStatus) {
        const result = await qb.select(['fch.status as status', 'count(*) as count']).groupBy('fch.status').execute();
        if (Array.isArray(result) && result.length > 0) {
          return {
            byStatus: {
              knowAnswer: result.find((r) => (r.status as FlashcardStatus) === FlashcardStatus.knowAnswer)?.count,
              dontKnowAnswer: result.find((r) => (r.status as FlashcardStatus) === FlashcardStatus.dontKnowAnswer)
                ?.count,
              unattempted: result.find((r) => (r.status as FlashcardStatus) === FlashcardStatus.unattempted)?.count,
            },
          };
        }
      }
      return {};
    } catch (error) {
      Sentry.captureException(error);
      logger.error(error);
      return {};
    }
  }
}
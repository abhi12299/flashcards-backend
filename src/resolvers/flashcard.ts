import * as Sentry from '@sentry/node';
import moment from 'moment';
import { nanoid } from 'nanoid';
import { Arg, Ctx, FieldResolver, Mutation, Query, Resolver, Root, UseMiddleware } from 'type-graphql';
import { Brackets, getConnection, In } from 'typeorm';
import { Flashcard } from '../entities/Flashcard';
import { FlashcardHistory } from '../entities/FlashcardHistory';
import { Fork } from '../entities/Fork';
import { Tag } from '../entities/Tag';
import { User } from '../entities/User';
import {
  CreateFlashcardInput,
  CreateFlashcardResponse,
  FlashcardReportInput,
  FlashcardReportResponse,
  FlashcardStats,
  ForkFlashcardResponse,
  GetFlashcardsInput,
  PaginatedFlashcards,
  RespondToFlashcardInput,
  RespondToFlashcardResponse,
  UpdateFlashcardInput,
  UpdateFlashcardResponse,
} from '../graphqlTypes';
import { isAuth } from '../middleware/isAuth';
import {
  FlashcardDifficulty,
  FlashcardStatus,
  FlashcardVisibility,
  MyContext,
  ReportGroupBy,
  ReportTimespan,
} from '../types';

@Resolver(Flashcard)
export class FlashcardResolver {
  @FieldResolver(() => FlashcardVisibility)
  status(@Root() flashcard: Flashcard): FlashcardVisibility {
    if (!flashcard.isPublic) {
      return FlashcardVisibility.private;
    }
    if (flashcard.deletedAt) {
      return FlashcardVisibility.deleted;
    }
    return FlashcardVisibility.public;
  }

  @FieldResolver(() => Boolean)
  async isForkedByYou(@Root() flashcard: Flashcard, @Ctx() { req, isForkedLoader }: MyContext): Promise<boolean> {
    if (!req.user) {
      return false;
    }
    return isForkedLoader.load(`${req.user.id}|${flashcard.id}`);
  }

  @FieldResolver(() => User)
  creator(@Root() flashcard: Flashcard, @Ctx() { userLoader }: MyContext) {
    return userLoader.load(flashcard.creatorId);
  }

  @FieldResolver(() => [Tag])
  tags(@Root() flashcard: Flashcard, @Ctx() { tagLoader }: MyContext) {
    if (flashcard.tags) {
      return flashcard.tags;
    }
    return tagLoader.load(flashcard.id);
  }

  @FieldResolver(() => String)
  title(@Root() flashcard: Flashcard, @Ctx() { req }: MyContext): string {
    if (flashcard.deletedAt) {
      return '';
    }
    if (flashcard.creatorId === req.user?.id || flashcard.isPublic) {
      return flashcard.title;
    }
    return '';
  }

  @FieldResolver(() => String)
  body(@Root() flashcard: Flashcard, @Ctx() { req }: MyContext): string {
    if (flashcard.deletedAt) {
      return '';
    }
    if (flashcard.creatorId === req.user?.id || flashcard.isPublic) {
      return flashcard.body;
    }
    return '';
  }

  @FieldResolver(() => FlashcardStats, { nullable: true })
  @UseMiddleware(isAuth)
  async stats(
    @Root() flashcard: Flashcard,
    @Ctx() { req, flashcardStatsLoader }: MyContext,
  ): Promise<FlashcardStats | undefined> {
    return flashcardStatsLoader.load(`${req.user!.id}|${flashcard.id}`);
  }

  @Query(() => PaginatedFlashcards)
  @UseMiddleware(isAuth)
  async flashcardsFeed(
    @Arg('input') { limit, cursor, tags }: GetFlashcardsInput,
    @Ctx() { req }: MyContext,
  ): Promise<PaginatedFlashcards> {
    const realLimit = Math.min(50, limit);
    const realLimitPlusOne = realLimit + 1;

    const replacements: unknown[] = [realLimitPlusOne];

    if (cursor) {
      replacements.push(new Date(cursor));
    }

    const qb = getConnection()
      .getRepository(Flashcard)
      .createQueryBuilder('fc')
      .where(
        new Brackets((bracket) => {
          bracket.andWhere('fc."creatorId" = :id', {
            id: req.user!.id,
          });
          bracket.orWhere('fc."isPublic" = true');
        }),
      )
      .andWhere('fc."isFork" = false');

    if (tags && tags.length > 0) {
      qb.leftJoin('flashcard_tags_tag', 'ftt', 'fc.id = ftt."flashcardId"').leftJoin('tag', 't', 't.id = ftt."tagId"');
      qb.andWhere('t.name in (:...tags)', { tags });
    }
    const count = await qb.clone().select('count(*) as "totalCount"').execute();

    if (cursor) {
      qb.andWhere('fc."createdAt" < :cursor', {
        cursor: new Date(cursor),
      });
    }
    const flashcards = await qb.orderBy('fc.createdAt', 'DESC').take(realLimitPlusOne).getMany();

    return {
      flashcards: flashcards.slice(0, realLimit),
      hasMore: flashcards.length === realLimitPlusOne,
      total: count[0]?.totalCount,
    };
  }

  @Query(() => PaginatedFlashcards)
  @UseMiddleware(isAuth)
  async userFlashcards(
    @Arg('input') { limit, cursor, tags, username }: GetFlashcardsInput,
    @Ctx() { req }: MyContext,
  ): Promise<PaginatedFlashcards> {
    const { id } = req.user!;
    const realLimit = Math.min(50, limit);
    const realLimitPlusOne = realLimit + 1;

    const replacements: unknown[] = [id, realLimitPlusOne];

    if (cursor) {
      replacements.push(new Date(cursor));
    }

    const user = await User.findOneOrFail({ where: { username } });
    const qb = getConnection().getRepository(Flashcard).createQueryBuilder('fc');
    if (!username) {
      qb.where('fc."creatorId" = :id', { id });
    } else {
      qb.where('fc."creatorId" = :id', { id: user.id });
      if (user.id !== id) {
        qb.andWhere('fc."isPublic" = true');
      }
    }
    if (tags && tags.length > 0) {
      qb.leftJoin('flashcard_tags_tag', 'ftt', 'fc.id = ftt."flashcardId"').leftJoin('tag', 't', 't.id = ftt."tagId"');
      qb.andWhere('t.name in (:...tags)', { tags });
    }
    const count = await qb.clone().select('count(*) as "totalCount"').execute();

    if (cursor) {
      qb.andWhere('fc."createdAt" < :cursor', {
        cursor: new Date(cursor),
      });
    }

    const flashcards = await qb.orderBy('fc.createdAt', 'DESC').take(realLimitPlusOne).getMany();
    return {
      flashcards: flashcards.slice(0, realLimit),
      hasMore: flashcards.length === realLimitPlusOne,
      total: count[0]?.totalCount,
    };
  }

  @Query(() => Flashcard, { nullable: true })
  @UseMiddleware(isAuth)
  async flashcard(
    @Arg('randId', () => String) randId: string,
    @Ctx() { req }: MyContext,
  ): Promise<Flashcard | undefined> {
    const flashcard = await getConnection()
      .getRepository(Flashcard)
      .findOne({ where: { randId }, relations: ['tags'] });
    if (!flashcard || flashcard.isPublic) {
      return flashcard;
    }

    if (flashcard.deletedAt || flashcard.creatorId !== req.user?.id) {
      return;
    }
    return flashcard;
  }

  @Mutation(() => CreateFlashcardResponse)
  @UseMiddleware(isAuth)
  async createFlashcard(
    @Arg('input') input: CreateFlashcardInput,
    @Ctx() { req, logger }: MyContext,
  ): Promise<CreateFlashcardResponse> {
    const { tags } = input;
    // convert all tags to lower case
    for (let i = 0; i < tags.length; i++) {
      tags[i] = tags[i].toLowerCase();
    }
    const { id: userId } = req.user!;
    return await getConnection().transaction(
      async (tm): Promise<CreateFlashcardResponse> => {
        try {
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

          const randId = nanoid();
          let flashcard = Flashcard.create({
            ...input,
            tags: tagObjs,
          });
          flashcard.creatorId = user.id;
          flashcard.randId = randId;
          flashcard = await tm.save(flashcard);
          return { flashcard };
        } catch (error) {
          logger.error(error);
          Sentry.captureException(error);
          return { errors: [{ field: 'flashcard', message: 'Cannot save flashcard. Please try again later.' }] };
        }
      },
    );
  }

  @Mutation(() => UpdateFlashcardResponse)
  @UseMiddleware(isAuth)
  async updateFlashcard(
    @Arg('input') { title, body, difficulty, tags, randId, isPublic }: UpdateFlashcardInput,
    @Ctx() { req, logger }: MyContext,
  ): Promise<UpdateFlashcardResponse> {
    const { id: userId } = req.user!;
    return await getConnection().transaction(
      async (tm): Promise<UpdateFlashcardResponse> => {
        try {
          const flashcard = await tm.getRepository(Flashcard).findOneOrFail({
            where: { randId, creatorId: userId },
            relations: ['tags'],
          });

          if (typeof isPublic === 'boolean') {
            if (isPublic && flashcard.isFork) {
              return {
                errors: [
                  {
                    field: 'isPublic',
                    message: 'Forked flashcards cannot be made public.',
                  },
                ],
              };
            }
            flashcard.isPublic = isPublic;
          }
          if (difficulty && flashcard.difficulty !== difficulty) {
            flashcard.difficulty = difficulty;
          }
          if (title && flashcard.title !== title) {
            flashcard.title = title;
          }
          if (body && flashcard.body !== body) {
            flashcard.body = body;
          }
          if (tags) {
            if (tags.length === 0) {
              return {
                errors: [{ field: 'tags', message: 'Tags cannot be empty!' }],
              };
            }
            // delete previous tags associated with it
            // insert new ones
            await tm.query(
              `
            delete from flashcard_tags_tag
            where "flashcardId" = $1;
          `,
              [flashcard.id],
            );
            await tm
              .createQueryBuilder()
              .insert()
              .into(Tag)
              .values(tags.map((t) => ({ name: t })))
              .onConflict(`("name") DO NOTHING`)
              // .returning('*')
              .execute();

            const tagObjs = await tm.getRepository(Tag).find({
              where: {
                name: In(tags),
              },
            });
            const user = await tm.getRepository(User).findOneOrFail(userId, { relations: ['tags'] });
            user.tags.push(...tagObjs);
            await tm.save(user);
            flashcard.tags = tagObjs;
          }
          await tm.save(flashcard);

          return { flashcard };
        } catch (error) {
          Sentry.captureException(error);
          logger.error(error);
          return {
            errors: [
              {
                field: '',
                message: 'Cannot update the flashcard. Please try again later.',
              },
            ],
          };
        }
      },
    );
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deleteFlashcard(@Arg('randId', () => String) randId: string, @Ctx() { req }: MyContext): Promise<boolean> {
    return await getConnection().transaction(
      async (tm): Promise<boolean> => {
        const flashcard = await tm.getRepository(Flashcard).findOne({ randId });
        if (!flashcard) return true;
        await tm.getRepository(Flashcard).softDelete({ randId, creatorId: req.user!.id });
        await tm.getRepository(Fork).delete({ forkedTo: flashcard.id, forkedBy: req.user!.id });
        return true;
      },
    );
  }

  @Mutation(() => ForkFlashcardResponse)
  @UseMiddleware(isAuth)
  async forkFlashcard(
    @Arg('from', () => String) fromRandId: string,
    @Ctx() { req, logger }: MyContext,
  ): Promise<ForkFlashcardResponse> {
    const { id: userId } = req.user!;
    // check if fromId is public
    const source = await getConnection()
      .getRepository(Flashcard)
      .findOne({ randId: fromRandId }, { relations: ['tags'] });
    if (!source || !source.isPublic) {
      return {
        errors: [{ field: 'from', message: 'That flashcard cannot be forked.' }],
      };
    }
    if (source.creatorId === userId) {
      return {
        errors: [{ field: 'from', message: 'You cannot fork your own flashcard!' }],
      };
    }
    const existingFork = await Fork.findOne({ where: { forkedFrom: source.id, forkedBy: userId } });
    if (existingFork) {
      return {
        errors: [{ field: 'from', message: 'You have already forked this flashcard.' }],
      };
    }
    return await getConnection().transaction(
      async (tm): Promise<ForkFlashcardResponse> => {
        try {
          const randId = nanoid();
          const target = new Flashcard();
          target.body = source.body;
          target.creatorId = userId;
          target.title = source.title;
          target.difficulty = source.difficulty;
          target.isPublic = false;
          target.isFork = true;
          target.tags = source.tags;
          target.randId = randId;
          const savedTarget = await tm.save(target);

          const fork = new Fork();
          fork.forkedFrom = source.id;
          fork.forkedTo = savedTarget.id;
          fork.forkedBy = userId;
          const user = await tm.getRepository(User).findOneOrFail(userId, { relations: ['tags'] });
          user.tags.push(...source.tags);
          await Promise.all([tm.save(user), tm.save(fork)]);
          return { forkedId: randId };
        } catch (error) {
          Sentry.captureException(error);
          logger.error(error);
          return {
            errors: [{ field: 'from', message: 'The flashcard cannot be forked. Please try again later.' }],
          };
        }
      },
    );
  }

  @Mutation(() => RespondToFlashcardResponse)
  @UseMiddleware(isAuth)
  async respondToFlashcard(
    @Arg('input') { randId, type, duration }: RespondToFlashcardInput,
    @Ctx() { req, logger }: MyContext,
  ): Promise<RespondToFlashcardResponse> {
    const { id: userId } = req.user!;

    const flashcard = await getConnection().getRepository(Flashcard).findOne({ randId });
    if (!flashcard || (flashcard.creatorId !== userId && !flashcard.isPublic)) {
      return {
        done: false,
        errors: [{ field: 'id', message: 'This flashcard is no longer available.' }],
      };
    }
    const fcHistory = new FlashcardHistory();
    fcHistory.flashcardId = flashcard.id;
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

import { Arg, Ctx, FieldResolver, Int, Mutation, Query, Resolver, Root, UseMiddleware } from 'type-graphql';
import { getConnection, In } from 'typeorm';
import { Flashcard } from '../entities/Flashcard';
import { FlashcardHistory } from '../entities/FlashcardHistory';
import { Fork } from '../entities/Fork';
import { Tag } from '../entities/Tag';
import { User } from '../entities/User';
import {
  CreateFlashcardInput,
  CreateFlashcardResponse,
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
import { FlashcardStatus, FlashcardVisibility, MyContext } from '../types';

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
  async publicFlashcards(@Arg('input') { limit, cursor, tags }: GetFlashcardsInput): Promise<PaginatedFlashcards> {
    const realLimit = Math.min(50, limit);
    const reaLimitPlusOne = realLimit + 1;

    const replacements: unknown[] = [reaLimitPlusOne];

    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
    }

    const qb = getConnection()
      .getRepository(Flashcard)
      .createQueryBuilder('fc')
      .where('fc."isPublic" = true')
      .andWhere('fc."isFork" = false')
      .orderBy('fc.createdAt', 'DESC')
      .take(reaLimitPlusOne);

    if (cursor) {
      qb.andWhere('fc."createdAt" < :cursor', {
        cursor: new Date(parseInt(cursor)),
      });
    }

    if (tags) {
      qb.leftJoin('flashcard_tags_tag', 'ftt', 'fc.id = ftt."flashcardId"').leftJoin('tag', 't', 't.id = ftt."tagId"');
      qb.andWhere('t.name in (:...tags)', { tags });
    }
    const flashcards = await qb.getMany();

    return {
      flashcards: flashcards.slice(0, realLimit),
      hasMore: flashcards.length === reaLimitPlusOne,
    };
  }

  @Query(() => PaginatedFlashcards)
  @UseMiddleware(isAuth)
  async myFlashcards(
    @Arg('input') { limit, cursor, tags }: GetFlashcardsInput,
    @Ctx() { req }: MyContext,
  ): Promise<PaginatedFlashcards> {
    const { id } = req.user!;
    const realLimit = Math.min(50, limit);
    const reaLimitPlusOne = realLimit + 1;

    const replacements: unknown[] = [id, reaLimitPlusOne];

    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
    }

    // const flashcards = await getConnection().query(
    //   `
    // select fc.*
    // from flashcard fc
    // where fc."creatorId" = $1
    // ${cursor ? `and fc."createdAt" < $3` : ''}
    // order by fc."createdAt" DESC
    // limit $2;
    // `,
    //   replacements,
    // );

    const qb = getConnection()
      .getRepository(Flashcard)
      .createQueryBuilder('fc')
      .where('fc."creatorId" = :id', { id })
      .orderBy('fc.createdAt', 'DESC')
      .take(reaLimitPlusOne);

    if (cursor) {
      qb.andWhere('fc."createdAt" < :cursor', {
        cursor: new Date(parseInt(cursor)),
      });
    }

    if (tags) {
      qb.leftJoin('flashcard_tags_tag', 'ftt', 'fc.id = ftt."flashcardId"').leftJoin('tag', 't', 't.id = ftt."tagId"');
      qb.andWhere('t.name in (:...tags)', { tags });
    }
    const flashcards = await qb.getMany();

    return {
      flashcards: flashcards.slice(0, realLimit),
      hasMore: flashcards.length === reaLimitPlusOne,
    };
  }

  @Query(() => Flashcard, { nullable: true })
  @UseMiddleware(isAuth)
  async flashcard(@Arg('id', () => Int) id: number, @Ctx() { req }: MyContext): Promise<Flashcard | undefined> {
    const flashcard = await Flashcard.findOne({ where: { id }, relations: ['tags'] });
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
    @Ctx() { req }: MyContext,
  ): Promise<CreateFlashcardResponse> {
    const { tags } = input;
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

          let flashcard = Flashcard.create({
            ...input,
            tags: tagObjs,
            creatorId: userId,
          });

          flashcard = await tm.save(flashcard);
          return { flashcard };
        } catch (error) {
          console.error(error);
          return { errors: [{ field: 'flashcard', message: 'Cannot save flashcard. Please try again later.' }] };
        }
      },
    );
  }

  @Mutation(() => UpdateFlashcardResponse)
  @UseMiddleware(isAuth)
  async updateFlashcard(
    @Arg('input') { title, body, tags, id, isPublic }: UpdateFlashcardInput,
    @Ctx() { req }: MyContext,
  ): Promise<UpdateFlashcardResponse> {
    const { id: userId } = req.user!;
    return await getConnection().transaction(
      async (tm): Promise<UpdateFlashcardResponse> => {
        try {
          const flashcard = await tm.getRepository(Flashcard).findOneOrFail({
            where: { id, creatorId: userId },
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
          console.error(error);
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
  async deleteFlashcard(@Arg('id', () => Int) id: number, @Ctx() { req }: MyContext): Promise<boolean> {
    await getConnection().getRepository(Flashcard).softDelete({ id, creatorId: req.user!.id });
    return true;
  }

  @Mutation(() => ForkFlashcardResponse)
  @UseMiddleware(isAuth)
  async forkFlashcard(
    @Arg('from', () => Int) fromId: number,
    @Ctx() { req }: MyContext,
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
          console.error(error);
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
    @Ctx() { req }: MyContext,
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
      console.error(error);
      return { done: false };
    }
  }
}

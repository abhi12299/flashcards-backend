import { Arg, Ctx, FieldResolver, Int, Mutation, Query, Resolver, Root, UseMiddleware } from 'type-graphql';
import { getConnection, In } from 'typeorm';
import { Flashcard } from '../entities/Flashcard';
import { Fork } from '../entities/Fork';
import { Tag } from '../entities/Tag';
import { User } from '../entities/User';
import {
  CreateFlashcardInput,
  CreateFlashcardResponse,
  FlashcardResponse,
  ForkFlashcardResponse,
  GetFlashcardsInput,
  PaginatedFlashcards,
  UpdateFlashcardInput,
} from '../graphqlTypes';
import { isAuth } from '../middleware/isAuth';
import { MyContext } from '../types';

@Resolver(Flashcard)
export class FlashcardResolver {
  // @FieldResolver(() => String)
  // textSnippet(@Root() post: Flashcard) {
  //   return post.text.slice(0, 50);
  // }

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

  // @FieldResolver(() => Int, { nullable: true })
  // async voteStatus(@Root() post: Flashcard, @Ctx() { updootLoader, req }: MyContext) {
  //   if (!req.session.userId) {
  //     return null;
  //   }

  //   const updoot = await updootLoader.load({
  //     postId: post.id,
  //     userId: req.session.userId,
  //   });

  //   return updoot ? updoot.value : null;
  // }

  // @Mutation(() => Boolean)
  // @UseMiddleware(isAuth)
  // async vote(
  //   @Arg('postId', () => Int) postId: number,
  //   @Arg('value', () => Int) value: number,
  //   @Ctx() { req }: MyContext,
  // ) {
  //   const isUpdoot = value !== -1;
  //   const realValue = isUpdoot ? 1 : -1;
  //   const { userId } = req.session;

  //   const updoot = await Updoot.findOne({ where: { postId, userId } });

  //   // the user has voted on the post before
  //   // and they are changing their vote
  //   if (updoot && updoot.value !== realValue) {
  //     await getConnection().transaction(async (tm) => {
  //       await tm.query(
  //         `
  //   update updoot
  //   set value = $1
  //   where "postId" = $2 and "userId" = $3
  //       `,
  //         [realValue, postId, userId],
  //       );

  //       await tm.query(
  //         `
  //         update post
  //         set points = points + $1
  //         where id = $2
  //       `,
  //         [2 * realValue, postId],
  //       );
  //     });
  //   } else if (!updoot) {
  //     // has never voted before
  //     await getConnection().transaction(async (tm) => {
  //       await tm.query(
  //         `
  //   insert into updoot ("userId", "postId", value)
  //   values ($1, $2, $3)
  //       `,
  //         [userId, postId, realValue],
  //       );

  //       await tm.query(
  //         `
  //   update post
  //   set points = points + $1
  //   where id = $2
  //     `,
  //         [realValue, postId],
  //       );
  //     });
  //   }
  //   return true;
  // }

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
  // @UseMiddleware(isAuth)
  async flashcard(@Arg('id', () => Int) id: number, @Ctx() { req }: MyContext): Promise<Flashcard | undefined> {
    const flashcard = await Flashcard.findOne({ where: { id }, relations: ['tags'] });
    if (!flashcard || flashcard.isPublic) {
      return flashcard;
    }

    if (!req.user?.id || flashcard.creatorId !== req.user?.id) {
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
    try {
      await getConnection()
        .createQueryBuilder()
        .insert()
        .into(Tag)
        .values(tags.map((t) => ({ name: t })))
        .onConflict(`("name") DO NOTHING`)
        .returning('*')
        .execute();

      const tagObjs = await getConnection()
        .manager.getRepository(Tag)
        .find({
          where: {
            name: In(tags),
          },
        });

      const flashcard = await Flashcard.create({
        ...input,
        tags: tagObjs,
        creatorId: req.user!.id,
      }).save();
      return { flashcard };
    } catch (error) {
      console.error(error);
      return { errors: [{ field: 'flashcard', message: 'Cannot save flashcard. Please try again later.' }] };
    }
  }

  @Mutation(() => FlashcardResponse)
  @UseMiddleware(isAuth)
  async updateFlashcard(
    @Arg('input') { title, body, tags, id, isPublic }: UpdateFlashcardInput,
    @Ctx() { req }: MyContext,
  ): Promise<FlashcardResponse> {
    const flashcard = await Flashcard.findOne({
      where: { id, creatorId: req.user!.id },
      relations: ['tags'],
    });
    if (!flashcard) {
      return {
        errors: [{ field: 'id', message: 'Cannot update this flashcard!' }],
      };
    }

    if (typeof isPublic === 'boolean') {
      if (isPublic && flashcard.isFork) {
        return {
          errors: [{ field: 'isPublic', message: 'Forked flashcards cannot be made public.' }],
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
      await getConnection().query(
        `
        delete from flashcard_tags_tag
        where "flashcardId" = $1;
      `,
        [flashcard.id],
      );
      await getConnection()
        .createQueryBuilder()
        .insert()
        .into(Tag)
        .values(tags.map((t) => ({ name: t })))
        .onConflict(`("name") DO NOTHING`)
        .returning('*')
        .execute();

      const tagObjs = await getConnection()
        .manager.getRepository(Tag)
        .find({
          where: {
            name: In(tags),
          },
        });
      flashcard.tags = tagObjs;
    }
    await flashcard.save();

    return { flashcard };
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deleteFlashcard(@Arg('id', () => Int) id: number, @Ctx() { req }: MyContext): Promise<boolean> {
    await Flashcard.delete({ id, creatorId: req.user!.id });
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
          await tm.save(fork);
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
}

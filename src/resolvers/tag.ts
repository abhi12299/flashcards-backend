import { Arg, Ctx, Query, Resolver, UseMiddleware } from 'type-graphql';
import { getConnection } from 'typeorm';
import { Tag } from '../entities/Tag';
import { User } from '../entities/User';
import { SearchTagsInput } from '../graphqlTypes';
import { isAuth } from '../middleware/isAuth';
import { MyContext } from '../types';

@Resolver(Tag)
export class TagResolver {
  @Query(() => [Tag])
  @UseMiddleware(isAuth)
  async myTopTags(@Ctx() { req }: MyContext): Promise<Tag[]> {
    const { id: userId } = req.user!;
    const tags = await getConnection()
      .createQueryBuilder()
      .select('tag.*')
      .from(User, 'user')
      .where('user.id = :userId', { userId })
      .leftJoin('user.tags', 'tag')
      .take(10)
      .execute();

    return tags;
  }

  @Query(() => [Tag])
  @UseMiddleware(isAuth)
  async topTags(): Promise<Tag[]> {
    const tags = await getConnection().getRepository(Tag).find({
      take: 10,
    });

    return tags;
  }

  @Query(() => [Tag])
  @UseMiddleware(isAuth)
  async searchTags(@Arg('input') { term }: SearchTagsInput): Promise<Tag[]> {
    if (!/^\w+$/g.test(term)) {
      return [];
    }

    console.log(term);
    return await getConnection()
      .createQueryBuilder(Tag, 't')
      .where('name like :term', {
        term: `%${term}%`,
      })
      .take(10)
      .getMany();
  }
}

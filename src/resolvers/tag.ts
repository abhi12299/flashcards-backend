import { Ctx, Query, Resolver, UseMiddleware } from 'type-graphql';
import { getConnection } from 'typeorm';
import { Tag } from '../entities/Tag';
import { User } from '../entities/User';
import { isAuth } from '../middleware/isAuth';
import { MyContext } from '../types';

@Resolver(Tag)
export class TagResolver {
  @Query(() => [Tag])
  @UseMiddleware(isAuth)
  async myTags(@Ctx() { req }: MyContext): Promise<Tag[]> {
    const { id: userId } = req.user!;
    const tags = await getConnection()
      .createQueryBuilder()
      .select('tag.*')
      .from(User, 'user')
      .where('user.id = :userId', { userId })
      .leftJoin('user.tags', 'tag')
      .execute();

    return tags;
  }

  @Query(() => [Tag])
  async allTags(): Promise<Tag[]> {
    const tags = await getConnection().getRepository(Tag).find();

    return tags;
  }
}

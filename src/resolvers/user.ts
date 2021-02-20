import * as Sentry from '@sentry/node';
import jwt from 'jsonwebtoken';
import { Arg, Ctx, FieldResolver, Int, Mutation, Query, Resolver, Root, UseMiddleware } from 'type-graphql';
import { getConnection } from 'typeorm';
import { Flashcard } from '../entities/Flashcard';
import { User } from '../entities/User';
import { UpdateUserProfileInput, UserResponse } from '../graphqlTypes';
import { isAuth } from '../middleware/isAuth';
import { MyContext } from '../types';
import { verifyIdToken } from '../utils/verifyIdToken';

@Resolver(User)
export class UserResolver {
  @FieldResolver(() => String)
  email(@Root() user: User, @Ctx() { req }: MyContext) {
    if (req.user?.id === user.id) {
      return user.email;
    }
    return '';
  }

  // TODO: add dataloader for this to avoid n+1 problem
  @FieldResolver(() => Int)
  async numFlashcards(@Root() user: User, @Ctx() { req }: MyContext): Promise<number> {
    const { id } = req.user || {};
    if (user.id === id) {
      return await Flashcard.count({ where: { creatorId: user.id } });
    }
    return await Flashcard.count({ where: { creatorId: user.id, isPublic: true } });
  }

  @Query(() => User, { nullable: true })
  me(@Ctx() { req }: MyContext) {
    if (!req.user) {
      return null;
    }

    return User.findOne(req.user.id);
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('idToken') idToken: string,
    @Arg('name') name: string,
    @Ctx() { logger }: MyContext,
  ): Promise<UserResponse> {
    const errMessage = 'Cannot login! Please try again with a different email.';

    let email: string | undefined;
    let profilePic: string | undefined;
    try {
      const decoded = await verifyIdToken(idToken);
      if (!decoded) {
        throw new Error('invalid id token');
      }
      email = decoded.email;
      profilePic = decoded.picture;
    } catch (error) {
      Sentry.captureException(error);
      logger.error(error);
    }
    if (!email) {
      return {
        errors: [{ field: 'idToken', message: errMessage }],
      };
    }

    let user: User | undefined;
    let isNewUser = false;
    try {
      user = await User.findOne({ where: { email } });
      isNewUser = !user;
      if (isNewUser) {
        // create one
        const result = await getConnection()
          .createQueryBuilder()
          .insert()
          .into(User)
          .values({ email, profilePic, name })
          .returning('*')
          .execute();
        user = result.raw[0];
      }
    } catch (error) {
      Sentry.captureException(error);
      logger.error(error);
    }

    if (!user) {
      return {
        errors: [{ field: 'email', message: errMessage }],
      };
    }
    // create jwt
    const accessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
    return {
      // user,
      isNewUser,
      accessToken,
    };
  }

  @Mutation(() => User, { nullable: true })
  @UseMiddleware(isAuth)
  async updateUser(
    @Arg('input') { name }: UpdateUserProfileInput,
    @Ctx() { req, logger }: MyContext,
  ): Promise<User | null> {
    const { id: userId } = req.user!;
    try {
      const user = await User.findOneOrFail(userId);
      if (name && user.name !== name) {
        user.name = name;
      }
      await user.save();
      return user;
    } catch (error) {
      Sentry.captureException(error);
      logger.error(error);
      return null;
    }
  }
}

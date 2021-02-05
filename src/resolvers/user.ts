import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';
import { Arg, Ctx, FieldResolver, Mutation, Query, Resolver, Root, UseMiddleware } from 'type-graphql';
import { getConnection } from 'typeorm';
import { User } from '../entities/User';
import { UpdateUserProfileInput, UserResponse } from '../graphqlTypes';
import { isAuth } from '../middleware/isAuth';
import { MyContext } from '../types';

@Resolver(User)
export class UserResolver {
  @FieldResolver(() => String)
  email(@Root() user: User, @Ctx() { req }: MyContext) {
    if (req.user?.id === user.id) {
      return user.email;
    }
    return '';
  }

  @Query(() => User, { nullable: true })
  me(@Ctx() { req }: MyContext) {
    if (!req.user) {
      return null;
    }

    return User.findOne(req.user.id);
  }

  @Mutation(() => UserResponse)
  async login(@Arg('idToken') idToken: string, @Arg('name') name: string): Promise<UserResponse> {
    let email: string | undefined;
    let profilePic: string | undefined;
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      email = decoded.email;
      profilePic = decoded.picture;
    } catch (error) {
      console.error(error);
    }
    if (!email) {
      return {
        errors: [{ field: 'idToken', message: 'Cannot obtain your email address! Please try again.' }],
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
      console.error(error);
    }

    if (!user) {
      return {
        errors: [{ field: 'email', message: 'Cannot login. Please try again later.' }],
      };
    }
    // create jwt
    const accessToken = await jwt.sign({ id: user.id }, process.env.JWT_SECRET);
    return {
      user,
      isNewUser,
      accessToken,
    };
  }

  @Mutation(() => User, { nullable: true })
  @UseMiddleware(isAuth)
  async updateUser(@Arg('input') { name }: UpdateUserProfileInput, @Ctx() { req }: MyContext): Promise<User | null> {
    const { id: userId } = req.user!;
    try {
      const user = await User.findOneOrFail(userId);
      if (name && user.name !== name) {
        user.name = name;
      }
      await user.save();
      return user;
    } catch (error) {
      console.error(error);
      return null;
    }
  }
}

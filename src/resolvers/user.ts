import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';
import { Arg, Ctx, FieldResolver, Mutation, Resolver, Root } from 'type-graphql';
import { getConnection } from 'typeorm';
import { User } from '../entities/User';
import { UserResponse } from '../graphqlTypes';
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

  // @Mutation(() => UserResponse)
  // async changePassword(
  //   @Arg("token") token: string,
  //   @Arg("newPassword") newPassword: string,
  //   @Ctx() { redis, req }: MyContext
  // ): Promise<UserResponse> {
  //   if (newPassword.length <= 2) {
  //     return {
  //       errors: [
  //         {
  //           field: "newPassword",
  //           message: "length must be greater than 2",
  //         },
  //       ],
  //     };
  //   }

  //   const key = FORGET_PASSWORD_PREFIX + token;
  //   const userId = await redis.get(key);
  //   if (!userId) {
  //     return {
  //       errors: [
  //         {
  //           field: "token",
  //           message: "token expired",
  //         },
  //       ],
  //     };
  //   }

  //   const userIdNum = parseInt(userId);
  //   const user = await User.findOne(userIdNum);

  //   if (!user) {
  //     return {
  //       errors: [
  //         {
  //           field: "token",
  //           message: "user no longer exists",
  //         },
  //       ],
  //     };
  //   }

  //   await User.update(
  //     { id: userIdNum },
  //     {
  //       password: await argon2.hash(newPassword),
  //     }
  //   );

  //   await redis.del(key);

  //   // log in user after change password
  //   req.session.userId = user.id;

  //   return { user };
  // }

  // @Mutation(() => Boolean)
  // async forgotPassword(
  //   @Arg("email") email: string,
  //   @Ctx() { redis }: MyContext
  // ) {
  //   const user = await User.findOne({ where: { email } });
  //   if (!user) {
  //     // the email is not in the db
  //     return true;
  //   }

  //   const token = v4();

  //   await redis.set(
  //     FORGET_PASSWORD_PREFIX + token,
  //     user.id,
  //     "ex",
  //     1000 * 60 * 60 * 24 * 3
  //   ); // 3 days

  //   await sendEmail(
  //     email,
  //     `<a href="http://localhost:3000/change-password/${token}">reset password</a>`
  //   );

  //   return true;
  // }

  // @Query(() => User, { nullable: true })
  // me(@Ctx() { req }: MyContext) {
  //   return null;
  //   // you are not logged in
  //   // if (!req.session.userId) {
  //   //   return null;
  //   // }

  //   // return User.findOne(req.session.userId);
  // }

  // @Mutation(() => UserResponse)
  // async register(@Arg('options') options: UsernamePasswordInput, @Ctx() { req }: MyContext): Promise<UserResponse> {
  //   const errors = validateRegister(options);
  //   if (errors) {
  //     return { errors };
  //   }

  //   const hashedPassword = await argon2.hash(options.password);
  //   let user;
  //   try {
  //     // User.create({}).save()
  //     const result = await getConnection()
  //       .createQueryBuilder()
  //       .insert()
  //       .into(User)
  //       .values({
  //         username: options.username,
  //         email: options.email,
  //         password: hashedPassword,
  //       })
  //       .returning('*')
  //       .execute();
  //     user = result.raw[0];
  //   } catch (err) {
  //     //|| err.detail.includes("already exists")) {
  //     // duplicate username error
  //     if (err.code === '23505') {
  //       return {
  //         errors: [
  //           {
  //             field: 'username',
  //             message: 'username already taken',
  //           },
  //         ],
  //       };
  //     }
  //   }

  //   // store user id session
  //   // this will set a cookie on the user
  //   // keep them logged in
  //   // req.session.userId = user.id;

  //   return { user };
  // }

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

  // @Mutation(() => Boolean)
  // logout(@Ctx() { req, res }: MyContext) {
  //   return new Promise((resolve) =>
  //     req.session.destroy((err) => {
  //       res.clearCookie(COOKIE_NAME);
  //       if (err) {
  //         console.log(err);
  //         resolve(false);
  //         return;
  //       }

  //       resolve(true);
  //     })
  //   );
  // }
}

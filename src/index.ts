import { ApolloServer } from 'apollo-server-express';
import 'dotenv-safe/config';
import express from 'express';
import admin from 'firebase-admin';
import { GraphQLError } from 'graphql';
import path from 'path';
import 'reflect-metadata';
import { buildSchema } from 'type-graphql';
import { createConnection } from 'typeorm';
import { __prod__ } from './constants';
import { Flashcard } from './entities/Flashcard';
import { FlashcardHistory } from './entities/FlashcardHistory';
import { Fork } from './entities/Fork';
import { Tag } from './entities/Tag';
import { User } from './entities/User';
import { jwtMiddleware } from './middleware/jwtMiddleware';
import { FlashcardResolver } from './resolvers/flashcard';
import { FlashcardHistoryResolver } from './resolvers/flashcardHistory';
import { HelloResolver } from './resolvers/hello';
import { TagResolver } from './resolvers/tag';
import { UserResolver } from './resolvers/user';
import { ErrorName, ErrorResponse } from './types';
import { createFlashcardLoader } from './utils/createFlashcardLoader';
import { createFlashcardStatsLoader } from './utils/createFlashcardStatsLoader';
import { createTagLoader } from './utils/createTagLoader';
import { createUserLoader } from './utils/createUserLoader';
import { getErrorCode } from './utils/getErrorCode';
import './utils/registerEnums';

const main = async () => {
  // const conn =
  await createConnection({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    logging: true,
    synchronize: !__prod__,
    migrations: [path.join(__dirname, './migrations/*')],
    entities: [Tag, User, Flashcard, Fork, FlashcardHistory],
  });
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
  // await conn.runMigrations();

  const app = express();

  app.use(jwtMiddleware);
  app.get('/', (_, res) => res.redirect('/graphql'));

  // const redis = new Redis(process.env.REDIS_URL);
  app.set('trust proxy', 1);
  // app.use(
  //   cors({
  //     origin: process.env.CORS_ORIGIN,
  //     credentials: true,
  //   }),
  // );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, UserResolver, FlashcardResolver, TagResolver, FlashcardHistoryResolver],
      validate: false,
    }),
    context: ({ req, res }) => ({
      req,
      res,
      // redis,
      userLoader: createUserLoader(),
      tagLoader: createTagLoader(),
      flashcardLoader: createFlashcardLoader(),
      flashcardStatsLoader: createFlashcardStatsLoader(),
    }),
    formatError: (err: GraphQLError): ErrorResponse => {
      console.error('Apollo server error:', JSON.stringify(err, null, 2));
      let error: ErrorResponse;
      if (typeof err.extensions?.exception.errorName !== 'undefined') {
        error = getErrorCode(err.extensions.exception.errorName as ErrorName);
      } else {
        error = getErrorCode(ErrorName.INTERNAL_SERVER_ERROR);
      }
      return error;
    },
  });

  apolloServer.applyMiddleware({
    app,
    cors: false,
  });

  app.listen(+process.env.PORT, () => {
    console.log('server started on localhost:4000');
  });
};

main().catch((err) => {
  console.error(err);
});

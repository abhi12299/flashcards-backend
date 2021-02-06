import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { PluginDefinition } from 'apollo-server-core';
import { ApolloError, ApolloServer } from 'apollo-server-express';
import 'dotenv-safe/config';
import express from 'express';
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
import { CustomError, ErrorName, ErrorResponse } from './types';
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
  // admin.initializeApp({
  //   credential: admin.credential.applicationDefault(),
  // });
  // await conn.runMigrations();

  const app = express();
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Tracing.Integrations.Express({ app }),
      new Tracing.Integrations.Postgres(),
    ],
    tracesSampleRate: 0.2,
  });
  app.use(Sentry.Handlers.requestHandler());

  app.use(jwtMiddleware);
  app.get('/', (_, res) => res.redirect('/graphql'));

  // const redis = new Redis(process.env.REDIS_URL);
  app.set('trust proxy', 1);

  const serverPlugins: PluginDefinition[] = [];
  serverPlugins.push({
    requestDidStart(_) {
      /* Within this returned object, define functions that respond
     to request-specific lifecycle events. */
      return {
        didEncounterErrors(ctx) {
          // If we couldn't parse the operation, don't
          // do anything here
          if (!ctx.operation) {
            return;
          }

          for (const err of ctx.errors) {
            // Only report internal server errors,
            // all errors extending ApolloError should be user-facing
            if (err instanceof ApolloError || CustomError.isIgnoreable(err)) {
              continue;
            }

            // Add scoped report details and send to Sentry
            Sentry.withScope((scope) => {
              // Annotate whether failing operation was query/mutation/subscription
              scope.setTag('kind', ctx.operation?.operation || '');

              // Log query and variables as extras (make sure to strip out sensitive data!)
              scope.setExtra('query', ctx.request.query);
              scope.setExtra('variables', ctx.request.variables);

              if (err.path) {
                // We can also add the path as breadcrumb
                scope.addBreadcrumb({
                  category: 'query-path',
                  message: err.path.join(' > '),
                  level: Sentry.Severity.Debug,
                });
              }

              const transactionId = ctx.request.http?.headers.get('x-transaction-id');
              if (transactionId) {
                scope.setTransactionName(transactionId);
              }

              Sentry.captureException(err);
            });
          }
        },
      };
    },
  });

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
    plugins: serverPlugins,
  });

  apolloServer.applyMiddleware({
    app,
    cors: false,
  });

  app.use(Sentry.Handlers.errorHandler());

  app.listen(+process.env.PORT, () => {
    console.log('server started on localhost:4000');
  });
};

main().catch((err) => {
  console.error(err);
});

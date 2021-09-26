import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { PluginDefinition } from 'apollo-server-core';
import { ApolloError, ApolloServer } from 'apollo-server-express';
import cors from 'cors';
import 'dotenv-safe/config';
import express from 'express';
import { GraphQLError } from 'graphql';
import depthLimit from 'graphql-depth-limit';
import 'reflect-metadata';
import { buildSchema } from 'type-graphql';
import { createConnection } from 'typeorm';
import './config/firebase';
import { jwtMiddleware } from './middleware/jwtMiddleware';
import { FlashcardResolver } from './resolvers/flashcard';
import { FlashcardHistoryResolver } from './resolvers/flashcardHistory';
import { HelloResolver } from './resolvers/hello';
import { TagResolver } from './resolvers/tag';
import { UserResolver } from './resolvers/user';
import config from './typeorm-config';
import { CustomError, ErrorName, ErrorResponse } from './types';
import { createFlashcardLoader } from './utils/createFlashcardLoader';
import { createFlashcardStatsLoader } from './utils/createFlashcardStatsLoader';
import { createIsForkedLoader } from './utils/createIsForkedLoader';
import { createLogger } from './utils/createLogger';
import { createTagLoader } from './utils/createTagLoader';
import { createUserLoader } from './utils/createUserLoader';
import { getErrorCode } from './utils/getErrorCode';
import './utils/registerEnums';

const main = async () => {
  const conn = await createConnection(config);
  await conn.runMigrations();
  // await conn.undoLastMigration();

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

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN.split(','),
    }),
  );
  app.use(jwtMiddleware);
  app.get('/', (_, res) => res.redirect('/graphql'));

  // const redis = new Redis(process.env.REDIS_URL);
  app.set('trust proxy', 1);

  const serverPlugins: PluginDefinition[] = [];
  serverPlugins.push({
    requestDidStart() {
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
  const logger = createLogger();

  const apolloServer = new ApolloServer({
    validationRules: [depthLimit(3)],
    playground: {
      endpoint: '/graphql',
    },
    introspection: true,
    tracing: true,
    schema: await buildSchema({
      resolvers: [HelloResolver, UserResolver, FlashcardResolver, TagResolver, FlashcardHistoryResolver],
      validate: { always: true },
    }),
    context: ({ req, res }) => ({
      req,
      res,
      userLoader: createUserLoader(),
      tagLoader: createTagLoader(),
      flashcardLoader: createFlashcardLoader(),
      flashcardStatsLoader: createFlashcardStatsLoader(),
      isForkedLoader: createIsForkedLoader(),
      logger,
    }),
    formatError: (err: GraphQLError): ErrorResponse => {
      logger.error('Apollo server error', err);
      let error: ErrorResponse;
      if (typeof err.extensions?.exception.errorName !== 'undefined') {
        error = getErrorCode(err.extensions.exception.errorName as ErrorName);
      } else {
        error = getErrorCode(ErrorName.INTERNAL_SERVER_ERROR);
      }
      return error;
    },
    logger,
    plugins: serverPlugins,
  });

  apolloServer.applyMiddleware({
    app,
    cors: {
      origin: process.env.CORS_ORIGIN.split(','),
    },
  });

  app.use(Sentry.Handlers.errorHandler());

  app.listen(+process.env.PORT, () => {
    logger.log('info', 'server started on localhost:4000');
  });
};

main().catch((err) => {
  console.error(err);
});

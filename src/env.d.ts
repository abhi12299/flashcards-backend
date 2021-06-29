declare namespace NodeJS {
  export interface ProcessEnv {
    DATABASE_URL: string;
    REDIS_URL: string;
    PORT: string;
    JWT_SECRET: string;
    GOOGLE_APPLICATION_CREDENTIALS: string;
    CLIENT_ID: string;
    SENTRY_DSN: string;
    NODE_ENV: string;
    APOLLO_KEY: string;
    APOLLO_GRAPH_VARIANT: string;
    APOLLO_SCHEMA_REPORTING: string;
    CORS_ORIGIN: string;
  }
}

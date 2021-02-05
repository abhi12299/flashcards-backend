declare namespace NodeJS {
  export interface ProcessEnv {
    DATABASE_URL: string;
    REDIS_URL: string;
    PORT: string;
    JWT_SECRET: string;
    GOOGLE_APPLICATION_CREDENTIALS: string;
    CLIENT_ID: string;
  }
}

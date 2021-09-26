import path from 'path';
import { ConnectionOptions } from 'typeorm';
import { __prod__ } from './constants';
import { Flashcard } from './entities/Flashcard';
import { FlashcardHistory } from './entities/FlashcardHistory';
import { Fork } from './entities/Fork';
import { Tag } from './entities/Tag';
import { User } from './entities/User';
import { Username } from './entities/Username';

const config: ConnectionOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  logging: true,
  synchronize: !__prod__,
  migrations: [path.join(__dirname, './migrations/*')],
  entities: [Tag, User, Flashcard, Fork, FlashcardHistory, Username],
};

export = config;

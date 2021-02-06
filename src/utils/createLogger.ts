import path from 'path';
import Winston from 'winston';

export const createLogger = () => {
  const transports: Winston.transport[] = [];
  if (process.env.NODE_ENV === 'development') {
    transports.push(
      new Winston.transports.Console({
        format: Winston.format.combine(Winston.format.colorize(), Winston.format.simple()),
      }),
    );
  } else {
    transports.push(
      new Winston.transports.File({
        filename: 'error.log',
        level: 'error',
        dirname: path.join(__dirname, '../../logs'),
      }),
      new Winston.transports.File({
        level: 'info',
        filename: 'out.log',
        dirname: path.join(__dirname, '../../logs'),
      }),
    );
  }
  const logger = Winston.createLogger({
    levels: Winston.config.syslog.levels,
    format: Winston.format.combine(Winston.format.timestamp(), Winston.format.splat(), Winston.format.simple()),
    transports,
  });
  return logger;
};

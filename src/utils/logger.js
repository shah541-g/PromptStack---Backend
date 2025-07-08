import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logsDir = path.resolve(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const accessLogStream = fs.createWriteStream(
  path.join(logsDir, 'access.log'),
  { flags: 'a' }
);

const errorLogStream = fs.createWriteStream(
  path.join(logsDir, 'error.log'),
  { flags: 'a' }
);

morgan.token('body', (req) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    return JSON.stringify(req.body);
  }
  return '';
});

morgan.token('response-time-ms', (req, res) => {
  if (!res._header || !req._startAt) return '';
  const diff = process.hrtime(req._startAt);
  const ms = diff[0] * 1e3 + diff[1] * 1e-6;
  return ms.toFixed(2);
});

const detailedFormat = ':method :url :status :response-time-ms ms - :res[content-length] bytes - :body';

export const accessLogger = morgan(detailedFormat, {
  stream: accessLogStream,
  skip: (req, res) => res.statusCode >= 400 
});

export const errorLogger = morgan(detailedFormat, {
  stream: errorLogStream,
  skip: (req, res) => res.statusCode < 400 
});

export const consoleLogger = morgan('combined', {
  skip: (req, res) => res.statusCode >= 400 
});

export const appLogger = {
  info: (message, data = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      data
    };
    console.log(`[INFO] ${message}`, data);
    fs.appendFileSync(
      path.join(logsDir, 'app.log'),
      JSON.stringify(logEntry) + '\n'
    );
  },

  error: (message, error = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      error: error.message || error,
      stack: error.stack
    };
    console.error(`[ERROR] ${message}`, error);
    fs.appendFileSync(
      path.join(logsDir, 'app.log'),
      JSON.stringify(logEntry) + '\n'
    );
  },

  warn: (message, data = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      message,
      data
    };
    console.warn(`[WARN] ${message}`, data);
    fs.appendFileSync(
      path.join(logsDir, 'app.log'),
      JSON.stringify(logEntry) + '\n'
    );
  },

  debug: (message, data = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'DEBUG',
      message,
      data
    };
    console.log(`[DEBUG] ${message}`, data);
    fs.appendFileSync(
      path.join(logsDir, 'app.log'),
      JSON.stringify(logEntry) + '\n'
    );
  }
};

export const rotateLogs = () => {
  const date = new Date().toISOString().split('T')[0];
  

  if (fs.existsSync(path.join(logsDir, 'access.log'))) {
    fs.renameSync(
      path.join(logsDir, 'access.log'),
      path.join(logsDir, `access-${date}.log`)
    );
  }
  
  if (fs.existsSync(path.join(logsDir, 'error.log'))) {
    fs.renameSync(
      path.join(logsDir, 'error.log'),
      path.join(logsDir, `error-${date}.log`)
    );
  }
  
  if (fs.existsSync(path.join(logsDir, 'app.log'))) {
    fs.renameSync(
      path.join(logsDir, 'app.log'),
      path.join(logsDir, `app-${date}.log`)
    );
  }
  
  appLogger.info('Log files rotated successfully');
}; 
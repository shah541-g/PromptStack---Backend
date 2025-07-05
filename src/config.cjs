const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SERVER_CONFIG = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_VERSION: process.env.API_VERSION || 'v1',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000'
};

const DB_CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/promptstack',
  MONGODB_URI_PROD: process.env.MONGODB_URI_PROD
};

const JWT_CONFIG = {
  SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
  EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d'
};

const API_KEYS = {
  BLACKBOX_API_KEY: process.env.BLACKBOX_API_KEY,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN
};

const LOG_CONFIG = {
  LEVEL: process.env.LOG_LEVEL || 'debug'
};


const validateEnvironment = () => {
  const required = [
    'JWT_SECRET',
    'MONGODB_URI'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn('⚠️  Missing required environment variables:', missing);
    return false;
  }
  
  return true;
};


module.exports = {
  SERVER_CONFIG,
  DB_CONFIG,
  JWT_CONFIG,
  API_KEYS,
  LOG_CONFIG,
  validateEnvironment,
  CONFIG: {
    ...SERVER_CONFIG,
    ...DB_CONFIG,
    ...JWT_CONFIG,
    ...API_KEYS,
    ...LOG_CONFIG
  }
};
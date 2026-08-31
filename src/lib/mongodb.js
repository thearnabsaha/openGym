import { MongoClient } from 'mongodb';

export function getMongoUri() {
  return (
    process.env.MONGODB_URI ||
    process.env.OpenGym_MONGODB_URI ||
    process.env.OPENGYM_MONGODB_URI ||
    process.env.MONGODB_URL ||
    process.env.DATABASE_URL ||
    process.env.ATLAS_URI ||
    ''
  ).trim();
}

export function getDatabaseName(uri) {
  if (process.env.MONGODB_DB) return process.env.MONGODB_DB.trim();
  if (process.env.OpenGym_MONGODB_DB) return process.env.OpenGym_MONGODB_DB.trim();
  if (uri) {
    try {
      const parsed = new URL(uri.replace('mongodb+srv://', 'http://').replace('mongodb://', 'http://'));
      const pathDb = parsed.pathname.replace(/^\//, '').split('?')[0];
      if (pathDb) return pathDb;
    } catch (e) {
      // ignore
    }
  }
  return 'opengym';
}

const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

let cachedClient = null;
let cachedPromise = null;

export async function connectToDatabase() {
  const uri = getMongoUri();
  if (!uri) {
    throw new Error(
      'MONGODB_URI is not set. Please add MONGODB_URI (or OpenGym_MONGODB_URI) to your environment variables.'
    );
  }

  const dbName = getDatabaseName(uri);

  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect();
    }
    const client = await global._mongoClientPromise;
    return { client, db: client.db(dbName) };
  }

  if (!cachedPromise) {
    const client = new MongoClient(uri, options);
    cachedPromise = client.connect();
  }

  const client = await cachedPromise;
  return { client, db: client.db(dbName) };
}

export default connectToDatabase;

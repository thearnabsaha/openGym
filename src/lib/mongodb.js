import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'opengym';

if (!uri) {
  console.warn('⚠️ MONGODB_URI is not defined in environment variables. Offline local-first storage will be used.');
}

const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

let client;
let clientPromise;

if (!uri) {
  clientPromise = Promise.reject(new Error('MONGODB_URI not provided'));
} else {
  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable to preserve connection across HMR
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    // In production / Vercel Serverless mode
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
}

export async function connectToDatabase() {
  if (!uri) {
    throw new Error('Please configure MONGODB_URI in environment variables.');
  }

  const activeClient = await clientPromise;
  const db = activeClient.db(dbName);
  return { client: activeClient, db };
}

export default clientPromise;

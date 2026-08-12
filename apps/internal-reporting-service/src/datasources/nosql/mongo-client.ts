import { MongoClient, type Collection, type Document } from 'mongodb';

const MONGO_URL = process.env['MONGO_URL'] ?? 'mongodb://localhost:27017';
const DB_NAME = process.env['MONGO_DB_NAME'] ?? 'internal-reporting_service';

let client: MongoClient | undefined;

async function getClient(): Promise<MongoClient> {
  if (!client) {
    client = new MongoClient(MONGO_URL);
    await client.connect();
  }
  return client;
}

export async function getUsersCollection(): Promise<Collection<Document>> {
  const connected = await getClient();
  return connected.db(DB_NAME).collection('users');
}

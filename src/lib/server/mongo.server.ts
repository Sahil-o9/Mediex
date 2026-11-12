import { MongoClient, type Db as MongoDatabase } from "mongodb";
import { env } from "./env.server";

class MongoConfigError extends Error {}

const globalMongo = globalThis as typeof globalThis & {
  __mediexMongo?: Promise<MongoDatabase> | undefined;
};

export function getMongoDb(): Promise<MongoDatabase> {
  const uri = env("MONGODB_URI");
  if (!uri) throw new MongoConfigError("MONGODB_URI is required when DATA_ADAPTER=mongodb");

  globalMongo.__mediexMongo ??= connect(uri);
  return globalMongo.__mediexMongo;
}

async function connect(uri: string): Promise<MongoDatabase> {
  const client = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 10_000 });
  try {
    await client.connect();
    const databaseName = env("MONGODB_DB");
    const db = client.db(databaseName);
    await db
      .collection("accounts")
      .createIndex({ role: 1, identifier: 1 }, { unique: true, name: "role_identifier_unique" });
    return db;
  } catch (error) {
    globalMongo.__mediexMongo = undefined;
    await client.close();
    throw error;
  }
}

import mongoose from "mongoose";

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

// Trip IDs are MongoDB-generated `_id` values. A legacy unique index on the
// removed `tripId` field makes every document without that field conflict after
// the first insert. Destinations are shared lookup records, so they must not be
// unique on a trip either.
export const removeLegacyTripUniqueIndexes = async (db) => {
  const collection = db.collection("trips");
  let indexes;
  try {
    indexes = await collection.indexes();
  } catch (error) {
    // A fresh database has no trips collection/indexes to migrate yet.
    if (error.code === 26) return;
    throw error;
  }
  const legacyIndexes = indexes.filter(
    (index) =>
      index.unique &&
      ((Object.keys(index.key).length === 1 && index.key.tripId === 1) ||
        (Object.keys(index.key).length === 1 && index.key.destination === 1)),
  );

  await Promise.all(
    legacyIndexes.map((index) => collection.dropIndex(index.name)),
  );
};

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    cached.conn = mongoose.connection;
    return cached.conn;
  }

  if (mongoose.connection.readyState === 2 && cached.promise) {
    cached.conn = await cached.promise;
    return cached.conn;
  }

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured");
  }

  const opts = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferCommands: true,
  };

  cached.promise = mongoose
    .connect(process.env.MONGO_URI, opts)
    .then(async (mongooseInstance) => {
      await removeLegacyTripUniqueIndexes(mongooseInstance.connection.db);
      console.log(`MongoDB connected: ${mongooseInstance.connection.host}`);
      return mongooseInstance.connection;
    })
    .catch((error) => {
      cached.promise = null;
      cached.conn = null;
      throw error;
    });

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    cached.conn = null;
    throw error;
  }
};

export default connectDB;

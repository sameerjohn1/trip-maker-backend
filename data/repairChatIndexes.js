import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../configs/db.js";

const collectionNames = ["conversations", "chats"];
const isLegacyParallelArrayIndex = (index) => {
  const fields = Object.keys(index.key || {});
  return fields.includes("participants") && fields.includes("deletedBy");
};

try {
  const connection = await connectDB();
  const db = connection.db;

  for (const collectionName of collectionNames) {
    const collection = db.collection(collectionName);
    const collections = await db
      .listCollections({ name: collectionName }, { nameOnly: true })
      .toArray();
    const exists = collections.length > 0;
    if (!exists) {
      console.log(`${collectionName}: collection does not exist; skipped.`);
      continue;
    }

    const indexes = await collection.indexes();
    const legacyIndexes = indexes.filter(isLegacyParallelArrayIndex);
    for (const index of legacyIndexes) {
      await collection.dropIndex(index.name);
      console.log(`${collectionName}: dropped legacy index ${index.name}.`);
    }

    // Both fields are arrays, so they must be indexed independently.
    await collection.createIndex({ participants: 1 });
    if (collectionName === "conversations") {
      await collection.createIndex({ deletedBy: 1 });
    }

    console.log(`${collectionName}: current indexes`, await collection.indexes());
  }
} catch (error) {
  console.error("Chat index repair failed:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}

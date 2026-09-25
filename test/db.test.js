import assert from "node:assert/strict";
import test from "node:test";
import { removeLegacyTripUniqueIndexes } from "../configs/db.js";
import Trip from "../models/Trip.js";

test("trip schema permits multiple trips with the same destination", () => {
  const destinationIndexes = Trip.schema
    .indexes()
    .filter(([key]) => Object.hasOwn(key, "destination"));

  assert.deepEqual(destinationIndexes, []);
});

test("removes only legacy unique tripId and destination indexes", async () => {
  const dropped = [];
  const collection = {
    indexes: async () => [
      { name: "_id_", key: { _id: 1 }, unique: true },
      { name: "tripId_1", key: { tripId: 1 }, unique: true },
      { name: "destination_1", key: { destination: 1 }, unique: true },
      { name: "ownerId_1_status_1", key: { ownerId: 1, status: 1 } },
    ],
    dropIndex: async (name) => dropped.push(name),
  };

  await removeLegacyTripUniqueIndexes({ collection: () => collection });

  assert.deepEqual(dropped.sort(), ["destination_1", "tripId_1"]);
});

test("does not remove a non-unique destination lookup index", async () => {
  const dropped = [];
  const collection = {
    indexes: async () => [
      { name: "destination_1", key: { destination: 1 } },
      { name: "tripId_1", key: { tripId: 1 } },
    ],
    dropIndex: async (name) => dropped.push(name),
  };

  await removeLegacyTripUniqueIndexes({ collection: () => collection });

  assert.deepEqual(dropped, []);
});

test("does nothing before the trips collection exists", async () => {
  await assert.doesNotReject(() =>
    removeLegacyTripUniqueIndexes({
      collection: () => ({
        indexes: async () => {
          const error = new Error("NamespaceNotFound");
          error.code = 26;
          throw error;
        },
      }),
    }),
  );
});

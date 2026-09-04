import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema(
  {
    traveler: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true },
  },
  { timestamps: true },
);

favoriteSchema.index({ traveler: 1, trip: 1 }, { unique: true });
export default mongoose.model("Favorite", favoriteSchema);
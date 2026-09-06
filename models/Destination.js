import mongoose from "mongoose";

const destinationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    country: { type: String, required: true, trim: true, maxlength: 100 },
    city: { type: String, trim: true, maxlength: 100 },
    region: {
      type: String,
      enum: ["Asia", "Europe", "North America", "South America", "Africa", "Oceania", "Middle East"],
      required: true,
    },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    imageUrl: { type: String, trim: true },
    averageDailyCost: { type: Number, min: 0, default: 0 },
    bestSeason: {
      type: String,
      enum: ["Spring", "Summer", "Autumn", "Winter", "Year-round"],
      default: "Year-round",
    },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

destinationSchema.index({ name: 1, country: 1 }, { unique: true });
export default mongoose.model("Destination", destinationSchema);
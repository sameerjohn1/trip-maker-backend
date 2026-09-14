import AppError from "../utils/AppError.js";

const prohibitedWords = [
  "slur1", "slur2", "hate", "abuse", "scam", "fraud", "spam", "sex", "porn", "malicious"
];

export const moderateContent = (text) => {
  if (!text) return true;
  const lowerText = String(text).toLowerCase();
  for (const word of prohibitedWords) {
    if (lowerText.includes(word)) {
      return false; // Failed moderation
    }
  }
  return true; // Passed moderation
};

export const runAutomatedModeration = (tripData) => {
  const fieldsToCheck = [
    tripData.title,
    tripData.shortDescription,
    tripData.fullDescription,
    tripData.requirements,
    tripData.cancellationPolicy,
  ];

  for (const field of fieldsToCheck) {
    if (!moderateContent(field)) {
      return false;
    }
  }

  // Also check itinerary activities and descriptions
  if (tripData.itinerary && Array.isArray(tripData.itinerary)) {
    for (const day of tripData.itinerary) {
      if (!moderateContent(day.title) || !moderateContent(day.description)) {
        return false;
      }
    }
  }

  return true;
};

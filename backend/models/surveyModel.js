import mongoose from "mongoose";

const surveySchema = new mongoose.Schema(
  {
    show: {
      type: String,
      required: true,
      index: true,
    },
    data: {
      type: Map,
      of: {
        booked: { type: Number, default: 0 },
        notBooked: { type: Number, default: 0 },
      },
      default: {},
    },
    updatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { versionKey: false }
);

const Survey = mongoose.model("Survey", surveySchema);
export default Survey;

const mongoose = require("mongoose");

const medicalRecordSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    recordType: {
      type: String,
      enum: ["consultation", "lab_report", "imaging", "vaccination", "surgery", "other"],
      default: "consultation",
    },
    diagnosis: {
      type: String,
      trim: true,
    },
    symptoms: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
    },
    attachments: [
      {
        fileName: String,
        url: String,
        mimeType: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    recordDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

medicalRecordSchema.index({ patient: 1, recordDate: -1 });

module.exports = mongoose.model("MedicalRecord", medicalRecordSchema);

const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    dosage: { type: String, trim: true }, // e.g. "500mg"
    frequency: { type: String, trim: true }, // e.g. "twice daily"
    duration: { type: String, trim: true }, // e.g. "5 days"
    instructions: { type: String, trim: true }, // e.g. "after food"
  },
  { _id: false },
);

const prescriptionSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
    },
    medicines: {
      type: [medicineSchema],
      validate: (v) => Array.isArray(v) && v.length > 0,
    },
    diagnosis: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    issuedDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

prescriptionSchema.index({ patient: 1, issuedDate: -1 });

module.exports = mongoose.model("Prescription", prescriptionSchema);

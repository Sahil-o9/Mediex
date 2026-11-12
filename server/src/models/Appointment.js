const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
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
      index: true,
    },
    doctorName: {
      type: String,
      trim: true,
    },
    specialty: {
      type: String,
      trim: true,
    },
    hospitalName: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      required: [true, "Appointment date is required"],
    },
    time: {
      type: String, // e.g. "10:30 AM" — kept as display string, paired with `date`
      required: [true, "Appointment time is required"],
    },
    reason: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true },
);

appointmentSchema.index({ patient: 1, date: -1 });

module.exports = mongoose.model("Appointment", appointmentSchema);

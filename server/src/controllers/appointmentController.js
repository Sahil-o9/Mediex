const asyncHandler = require("express-async-handler");
const Appointment = require("../models/Appointment");

// @route  POST /api/appointments
// @access Private (patient books for self; doctor can book on behalf of a patient)
const createAppointment = asyncHandler(async (req, res) => {
  const { patient, doctor, doctorName, specialty, hospitalName, date, time, reason } = req.body;

  const patientId = req.user.role === "doctor" ? patient : req.user._id;
  if (!patientId || !date || !time) {
    res.status(400);
    throw new Error("patient, date and time are required");
  }

  const appointment = await Appointment.create({
    patient: patientId,
    doctor,
    doctorName,
    specialty,
    hospitalName,
    date,
    time,
    reason,
  });

  res.status(201).json({ success: true, appointment });
});

// @route  GET /api/appointments
// @access Private — patients see their own; doctors see their own or ?patient=<id>
const getAppointments = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === "patient") {
    filter.patient = req.user._id;
  } else {
    if (req.query.patient) filter.patient = req.query.patient;
    if (req.query.mine === "true") filter.doctor = req.user._id;
  }
  if (req.query.status) filter.status = req.query.status;

  const appointments = await Appointment.find(filter)
    .sort({ date: 1 })
    .populate("doctor", "name specialty")
    .populate("patient", "name email");

  res.json({ success: true, count: appointments.length, appointments });
});

// @route  GET /api/appointments/:id
// @access Private
const getAppointmentById = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate("doctor", "name specialty")
    .populate("patient", "name email");

  if (!appointment) {
    res.status(404);
    throw new Error("Appointment not found");
  }
  if (req.user.role === "patient" && String(appointment.patient._id) !== String(req.user._id)) {
    res.status(403);
    throw new Error("Not authorized to view this appointment");
  }

  res.json({ success: true, appointment });
});

// @route  PUT /api/appointments/:id
// @access Private
const updateAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    res.status(404);
    throw new Error("Appointment not found");
  }
  if (req.user.role === "patient" && String(appointment.patient) !== String(req.user._id)) {
    res.status(403);
    throw new Error("Not authorized to update this appointment");
  }

  const fields = ["doctor", "doctorName", "specialty", "hospitalName", "date", "time", "reason", "status"];
  for (const field of fields) {
    if (req.body[field] !== undefined) appointment[field] = req.body[field];
  }

  await appointment.save();
  res.json({ success: true, appointment });
});

// @route  DELETE /api/appointments/:id
// @access Private
const deleteAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    res.status(404);
    throw new Error("Appointment not found");
  }
  if (req.user.role === "patient" && String(appointment.patient) !== String(req.user._id)) {
    res.status(403);
    throw new Error("Not authorized to cancel this appointment");
  }

  await appointment.deleteOne();
  res.json({ success: true, message: "Appointment deleted" });
});

module.exports = {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointment,
  deleteAppointment,
};

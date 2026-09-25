const asyncHandler = require("express-async-handler");
const Prescription = require("../models/Prescription");

// @route  POST /api/prescriptions
// @access Private (doctor only)
const createPrescription = asyncHandler(async (req, res) => {
  const { patient, appointment, medicines, diagnosis, notes, issuedDate } = req.body;

  if (!patient || !Array.isArray(medicines) || medicines.length === 0) {
    res.status(400);
    throw new Error("patient and at least one medicine are required");
  }

  const prescription = await Prescription.create({
    patient,
    doctor: req.user._id,
    appointment,
    medicines,
    diagnosis,
    notes,
    issuedDate,
  });

  res.status(201).json({ success: true, prescription });
});

// @route  GET /api/prescriptions
// @access Private — patients see their own; doctors see ones they issued, or ?patient=<id>
const getPrescriptions = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === "patient") {
    filter.patient = req.user._id;
  } else {
    filter.doctor = req.user._id;
    if (req.query.patient) filter.patient = req.query.patient;
  }

  const prescriptions = await Prescription.find(filter)
    .sort({ issuedDate: -1 })
    .populate("doctor", "name specialty")
    .populate("patient", "name email");

  res.json({ success: true, count: prescriptions.length, prescriptions });
});

// @route  GET /api/prescriptions/:id
// @access Private
const getPrescriptionById = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findById(req.params.id)
    .populate("doctor", "name specialty")
    .populate("patient", "name email");

  if (!prescription) {
    res.status(404);
    throw new Error("Prescription not found");
  }
  const isOwner =
    (req.user.role === "patient" && String(prescription.patient._id) === String(req.user._id)) ||
    (req.user.role === "doctor" && String(prescription.doctor._id) === String(req.user._id));
  if (!isOwner) {
    res.status(403);
    throw new Error("Not authorized to view this prescription");
  }

  res.json({ success: true, prescription });
});

// @route  PUT /api/prescriptions/:id
// @access Private (issuing doctor only)
const updatePrescription = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findById(req.params.id);
  if (!prescription) {
    res.status(404);
    throw new Error("Prescription not found");
  }
  if (req.user.role !== "doctor" || String(prescription.doctor) !== String(req.user._id)) {
    res.status(403);
    throw new Error("Not authorized to update this prescription");
  }

  const fields = ["medicines", "diagnosis", "notes", "issuedDate"];
  for (const field of fields) {
    if (req.body[field] !== undefined) prescription[field] = req.body[field];
  }

  await prescription.save();
  res.json({ success: true, prescription });
});

// @route  DELETE /api/prescriptions/:id
// @access Private (issuing doctor only)
const deletePrescription = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findById(req.params.id);
  if (!prescription) {
    res.status(404);
    throw new Error("Prescription not found");
  }
  if (req.user.role !== "doctor" || String(prescription.doctor) !== String(req.user._id)) {
    res.status(403);
    throw new Error("Not authorized to delete this prescription");
  }

  await prescription.deleteOne();
  res.json({ success: true, message: "Prescription deleted" });
});

module.exports = {
  createPrescription,
  getPrescriptions,
  getPrescriptionById,
  updatePrescription,
  deletePrescription,
};

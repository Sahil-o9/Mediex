const asyncHandler = require("express-async-handler");
const MedicalRecord = require("../models/MedicalRecord");

// @route  POST /api/records
// @access Private (patient creates their own, or doctor creates for a patient)
const createRecord = asyncHandler(async (req, res) => {
  const { patient, title, recordType, diagnosis, symptoms, notes, attachments, recordDate } = req.body;

  const patientId = req.user.role === "doctor" ? patient : req.user._id;
  if (!patientId) {
    res.status(400);
    throw new Error("A patient id is required");
  }
  if (!title) {
    res.status(400);
    throw new Error("Title is required");
  }

  const record = await MedicalRecord.create({
    patient: patientId,
    doctor: req.user.role === "doctor" ? req.user._id : undefined,
    title,
    recordType,
    diagnosis,
    symptoms,
    notes,
    attachments,
    recordDate,
  });

  res.status(201).json({ success: true, record });
});

// @route  GET /api/records
// @access Private — patients see only their own; doctors can filter ?patient=<id>
const getRecords = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === "patient") {
    filter.patient = req.user._id;
  } else if (req.query.patient) {
    filter.patient = req.query.patient;
  }

  const records = await MedicalRecord.find(filter)
    .sort({ recordDate: -1 })
    .populate("doctor", "name specialty")
    .populate("patient", "name email");

  res.json({ success: true, count: records.length, records });
});

// @route  GET /api/records/:id
// @access Private
const getRecordById = asyncHandler(async (req, res) => {
  const record = await MedicalRecord.findById(req.params.id)
    .populate("doctor", "name specialty")
    .populate("patient", "name email");

  if (!record) {
    res.status(404);
    throw new Error("Medical record not found");
  }
  if (req.user.role === "patient" && String(record.patient._id) !== String(req.user._id)) {
    res.status(403);
    throw new Error("Not authorized to view this record");
  }

  res.json({ success: true, record });
});

// @route  PUT /api/records/:id
// @access Private (doctor who owns it, or the patient it belongs to)
const updateRecord = asyncHandler(async (req, res) => {
  const record = await MedicalRecord.findById(req.params.id);
  if (!record) {
    res.status(404);
    throw new Error("Medical record not found");
  }
  if (req.user.role === "patient" && String(record.patient) !== String(req.user._id)) {
    res.status(403);
    throw new Error("Not authorized to update this record");
  }

  const fields = ["title", "recordType", "diagnosis", "symptoms", "notes", "attachments", "recordDate"];
  for (const field of fields) {
    if (req.body[field] !== undefined) record[field] = req.body[field];
  }

  await record.save();
  res.json({ success: true, record });
});

// @route  DELETE /api/records/:id
// @access Private
const deleteRecord = asyncHandler(async (req, res) => {
  const record = await MedicalRecord.findById(req.params.id);
  if (!record) {
    res.status(404);
    throw new Error("Medical record not found");
  }
  if (req.user.role === "patient" && String(record.patient) !== String(req.user._id)) {
    res.status(403);
    throw new Error("Not authorized to delete this record");
  }

  await record.deleteOne();
  res.json({ success: true, message: "Medical record deleted" });
});

module.exports = { createRecord, getRecords, getRecordById, updateRecord, deleteRecord };

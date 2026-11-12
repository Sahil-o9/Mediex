const express = require("express");
const {
  createPrescription,
  getPrescriptions,
  getPrescriptionById,
  updatePrescription,
  deletePrescription,
} = require("../controllers/prescriptionController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.route("/").post(authorize("doctor"), createPrescription).get(getPrescriptions);
router
  .route("/:id")
  .get(getPrescriptionById)
  .put(authorize("doctor"), updatePrescription)
  .delete(authorize("doctor"), deletePrescription);

module.exports = router;

const express = require("express");
const {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointment,
  deleteAppointment,
} = require("../controllers/appointmentController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.route("/").post(createAppointment).get(getAppointments);
router.route("/:id").get(getAppointmentById).put(updateAppointment).delete(deleteAppointment);

module.exports = router;

const express = require("express");
const {
  createRecord,
  getRecords,
  getRecordById,
  updateRecord,
  deleteRecord,
} = require("../controllers/recordController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.route("/").post(createRecord).get(getRecords);
router.route("/:id").get(getRecordById).put(updateRecord).delete(deleteRecord);

module.exports = router;

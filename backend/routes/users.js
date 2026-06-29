const express = require("express");

const router = express.Router();

const UserController = require("../controllers/UserController");

router.post("/", UserController.store);
router.delete("/:id", UserController.destroy);

module.exports = router;
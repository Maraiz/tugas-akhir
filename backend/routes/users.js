const express = require("express");

const router = express.Router();

const UserController = require("../controllers/UserController");

router.get("/", UserController.index);
router.post("/", UserController.store);
router.put("/:id", UserController.update);
router.delete("/:id", UserController.destroy);

module.exports = router;
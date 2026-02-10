const { AuthController } = require("../controllers");
const router = require("express").Router();

router.post("/signup", AuthController.register);

router.post();

router.get("");

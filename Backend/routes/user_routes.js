import { Router } from "express";
import { register, login } from "../controller/user_Controller.js";

const userRouter = Router();

userRouter.post("/register", register);
userRouter.post("/login", login);

export default userRouter;

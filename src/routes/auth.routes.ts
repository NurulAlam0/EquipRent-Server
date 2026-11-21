import { Router } from "express";
import { verifyToken } from "../middlewares/auth.middleware";
import * as authController from "../controllers/auth.controller";

export const authRouter = Router();

authRouter.post("/register", authController.register);
authRouter.post("/login", authController.login);
authRouter.post("/logout", authController.logout);
authRouter.post("/exchange", authController.exchangeGoogleTicket);
authRouter.get("/me", verifyToken, authController.getMe);
authRouter.put("/me", verifyToken, authController.updateMe);
authRouter.post("/become-owner", verifyToken, authController.becomeOwner);
authRouter.get("/verify", verifyToken, authController.verify);
authRouter.get("/google", authController.googleRedirect);
authRouter.get("/google/callback", authController.googleCallback);

export default authRouter;

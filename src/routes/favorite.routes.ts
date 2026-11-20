import { Router } from "express";
import { verifyRenter } from "../middlewares/auth.middleware";
import * as favoriteController from "../controllers/favorite.controller";

export const favoritesRouter = Router();

favoritesRouter.get("/", verifyRenter, favoriteController.getFavorites);
favoritesRouter.post("/:equipmentId", verifyRenter, favoriteController.addFavorite);
favoritesRouter.delete("/:equipmentId", verifyRenter, favoriteController.removeFavorite);

export default favoritesRouter;


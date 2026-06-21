import express, { NextFunction, Request, Response } from "express";

import { register, login, updateUser } from "../controller/auth.controller";

export const authRoute = express.Router();

authRoute.post("/login", login);
authRoute.patch("/update-user", updateUser);
authRoute.get("/", (req, res) => {
  res.send("API working");
});

authRoute.post("/register", register);

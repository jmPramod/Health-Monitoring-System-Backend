import { NextFunction, Request, Response } from "express";

export const homeHb = (req: Request, res: Response, next: NextFunction) => {
  try {
    res.render("home");
  } catch (error) {}
};

import { NextFunction, RequestHandler, Response } from "express";
import mongoose from "mongoose";

export const dropDatabaseController: RequestHandler = async (
  req,
  res,
  next,
): Promise<void> => {
  try {
    const dbName = mongoose.connection.name;

    await mongoose.connection.dropDatabase();

    res.status(200).json({
      success: true,
      message: `Database "${dbName}" dropped successfully`,
    });

    return;
  } catch (error) {
    next(error);
  }
};

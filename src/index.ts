import express from "express";
import dotenv from "dotenv";
import { app, runServer } from "./app";
dotenv.config();
runServer();
app.listen(process.env.PORT, () => {
  console.log(
    `Server is running on port http://localhost:${process.env.PORT || 3000}`,
  );
});

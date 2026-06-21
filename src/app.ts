import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import morgan from "morgan";
dotenv.config();
import swaggerUI from "swagger-ui-express";
import * as swaggerDocument from "../src/config/swagger.json";
import { connectMongooseDB } from "./config/db.config";
import { authRoute } from "./routes/auth.routes";
import { ErrorHandelingMiddlewear } from "./middlewears/global.middlewear";

export const app = express();

export const runServer = async () => {
  //!middlewear
  app.use(
    cors({
      origin: [
        `http://localhost:${process.env.PORT}`,
        process.env.FE_URL as string,
      ],
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan("dev"));
  app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerDocument));
  app.use("/", authRoute);
  app.use(ErrorHandelingMiddlewear);
  connectMongooseDB();
};

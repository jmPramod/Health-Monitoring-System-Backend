import express, { NextFunction, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import swaggerUI from "swagger-ui-express";
import * as swaggerDocument from "./config/swagger.json";
import flash from "connect-flash";
import session from "express-session";
import * as handlebars from "express-handlebars";

import { connectMongooseDB } from "./config/db.config";
import { ErrorHandelingMiddlewear } from "./middlewears/global.middlewear";
import { authRoute } from "./routes/api/auth.routes";
import { routesHb } from "./routes/hb/routes.hb";
import { patientRoutes } from "./routes/api/patient.routes";

dotenv.config();

export const app = express();

const sessionOption = session({
  secret: process.env.SESSION_FOR_HB || "my-secret",
  resave: false,
  saveUninitialized: false,
});

const globalStorage = (req: Request, res: Response, next: NextFunction) => {
  res.locals.Success_msg = req.flash("Success_msg");
  res.locals.Error_msg = req.flash("Error_msg");
  res.locals.Warning_msg = req.flash("Warning_msg");
  res.locals.Info_msg = req.flash("Info_msg");
  res.locals.Error_Form = req.flash("Error_Form");
  res.locals.Loading = req.flash("Loading");
  res.locals.user_info = (req.session as any)?.user_info;

  next();
};

export const runServer = async () => {
  connectMongooseDB();

  // -----------------------------
  // Middleware
  // -----------------------------

  app.use(
    cors({
      origin: ["http://localhost:5173", process.env.FE_URL || ""],
      credentials: true,
    }),
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(morgan("dev"));

  // Session MUST come before flash
  app.use(sessionOption);

  app.use(flash());

  app.use(globalStorage);

  // -----------------------------
  // Handlebars
  // -----------------------------

  app.engine("handlebars", handlebars.engine());

  app.set("view engine", "handlebars");

  app.set("views", __dirname + "/views");

  app.use(express.static(__dirname + "/public"));

  // -----------------------------
  // Swagger
  // -----------------------------

  app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerDocument));

  // -----------------------------
  // Routes
  // -----------------------------

  // Handlebars
  console.log("Before Mounting Handlebars routes...");
  app.use("/v1", routesHb);
  console.log("After Mounting Handlebars routes...");
  // REST API
  app.use("/", authRoute);
  app.use("/", patientRoutes);

  // -----------------------------
  // Error Handler
  // -----------------------------

  app.use(ErrorHandelingMiddlewear);
};
// https://demos.pixinvent.com/vuexy-html-admin-template/html/vertical-menu-template/

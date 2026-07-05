import express, { NextFunction, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookies from "cookie-parser";
import morgan from "morgan";
import swaggerUI from "swagger-ui-express";
import * as swaggerDocument from "../src/config/swagger.json";
import { connectMongooseDB } from "./config/db.config";
import { authRoute } from "./routes/auth.routes";
// import * as flash from "connect-flash";
import { ErrorHandelingMiddlewear } from "./middlewears/global.middlewear";
import * as handlebars from "express-handlebars";
import session from "express-session";
dotenv.config();

export const app = express();

export const runServer = async () => {
  //!middlewear
  app.use(
    cors({
      origin: [
        `http://localhost:${process.env.PORT}`,
        "http://localhost:5173",
        process.env.FE_URL as string,
      ],
      credentials: true,
    }),
  );
  app.use(cookies());
  // for views(handlebars)
  app.engine("handlebars", handlebars.engine());
  app.set("view engine", "handlebars");

  //for static folder access and views
  app.set("views", __dirname + "/views");
  app.use(express.static(__dirname + "/public"));

  // app.use(flash()); // for flash message in handlebars
  // app.use(globalStorage);

  // for session storage
  app.use(sessionOption);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan("dev"));
  app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerDocument));
  app.use("/", authRoute);
  app.use(ErrorHandelingMiddlewear);
  connectMongooseDB();
};

const sessionOption = session({
  secret: process.env.SESSION_FOR_HB as string,
  resave: false,
  saveUninitialized: false,
});

// const globalStorage = function (
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ) {
//   res.locals.Success_msg = req.flash("Success_msg");
//   res.locals.Error_msg = req.flash("Error_msg");
//   res.locals.Warning_msg = req.flash("Warning_msg");
//   res.locals.Info_msg = req.flash("Info_msg");
//   res.locals.Error_Form = req.flash("Error_Form");
//   res.locals.Loading = req.flash("Loading");
//   res.locals.user_info = req.session.user_info;
//   next();
// };

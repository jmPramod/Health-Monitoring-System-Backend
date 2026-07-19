import express from "express";
import { homeHb } from "../../controller/hb/home.controller.hb";

export const routesHb = express.Router();
console.log("routes.hb.ts loaded");

routesHb.get("/", homeHb);

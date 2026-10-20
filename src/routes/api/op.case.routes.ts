import express from "express";
import {
  createRevisit,
  getOpcaseList,
} from "../../controller/op.case.controller";
import { verifyUser } from "../../middlewears/verify.token.middlewears";
// import { getOpcaseList } from "../../controller/op.case.controller";

export const OpCaseRoutes = express.Router();

OpCaseRoutes.get("/op-list", verifyUser, getOpcaseList);
OpCaseRoutes.post("/re-visit", verifyUser, createRevisit);

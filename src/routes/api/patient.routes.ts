import express from "express";
import {
  createPatientController,
  gerPatientListController,
} from "../../controller/patient.controller";
import { verifyUser } from "../../middlewears/verify.token.middlewears";

export const patientRoutes = express.Router();

patientRoutes.post("/patient", verifyUser, createPatientController);

patientRoutes.get("/patient-list", verifyUser, gerPatientListController);

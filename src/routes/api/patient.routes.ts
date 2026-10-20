import express from "express";
import {
  createPatientController,
  deletePatientController,
  gerPatientListController,
  getSinglePatientController,
  linkSinglePatientController,
  updatePatientController,
} from "../../controller/patient.controller";
import { verifyUser } from "../../middlewears/verify.token.middlewears";

export const patientRoutes = express.Router();

patientRoutes.post("/patient", verifyUser, createPatientController);
patientRoutes.patch("/patient/:patientId", verifyUser, updatePatientController);

patientRoutes.get(
  "/patient/:patientId",
  verifyUser,
  getSinglePatientController,
);
patientRoutes.delete(
  "/patient/:patientId",
  verifyUser,
  deletePatientController,
);
// gives the list of patient on register page
patientRoutes.get("/patient-list", verifyUser, gerPatientListController);
patientRoutes.patch("/link-patient", verifyUser, linkSinglePatientController);

import express from "express";
import {
  createPatientController,
  deletePatientController,
  gerPatientListController,
  getSinglePatientController,
  updatePatientController,
} from "../../controller/patient.controller";
import { verifyUser } from "../../middlewears/verify.token.middlewears";

export const patientRoutes = express.Router();

patientRoutes.post("/patient", verifyUser, createPatientController);
patientRoutes.put("/patient/:patientId", verifyUser, updatePatientController);

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

patientRoutes.get("/patient-list", verifyUser, gerPatientListController);

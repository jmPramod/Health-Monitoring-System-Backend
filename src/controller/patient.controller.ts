import { NextFunction, Request, Response } from "express";
import patientSchema, {
  PatientValidationSchema,
} from "../models/patient.schema";
import createError from "../middlewears/error.middlewears";

export const createPatientController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { mobile_no } = req.body;
    req.body.hospital_id = "68b1d92f65d84c8fbf89abcd";
    const existing_user = await patientSchema.findOne({ mobile_no });
    if (existing_user) {
      return next(createError(401, "mobile number already exist"));
    }
    const lastPatient = await patientSchema
      .findOne()
      .sort({ createdAt: -1 })
      .select("patient_id");

    let nextNumber = 1;

    if (lastPatient) {
      nextNumber = parseInt(lastPatient.patient_id.replace("PAT-", ""), 10) + 1;
    }

    req.body.patient_id = `PAT-${nextNumber.toString().padStart(6, "0")}`;
    const { error, value } = PatientValidationSchema.validate(req.body);
    if (error) {
      return next(createError(401, error.details[0].message));
    }
    const newPatient = new patientSchema(value);
    const savePatient = await newPatient.save();
    res.json({
      success: true,
      status: 201,
      message: "New Patient created",
      data: savePatient,
    });
  } catch (error) {
    next(error);
  }
};

export const gerPatientListController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const [patients, total] = await Promise.all([
      patientSchema
        .find()
        .select(
          "patient_id registration_date firstName last_name mobile_no -_id",
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      patientSchema.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      status: 200,
      message: "Patients fetched successfully",
      data: patients,
      pagination: {
        totalRecords: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        limit,
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

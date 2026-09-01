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

    // ---- Generate patient_id (unchanged) ----
    const lastPatient = await patientSchema
      .findOne()
      .sort({ createdAt: -1 })
      .select("patient_id");

    let nextNumber = 1;
    if (lastPatient) {
      nextNumber = parseInt(lastPatient.patient_id.replace("PAT-", ""), 10) + 1;
    }
    req.body.patient_id = `PAT-${nextNumber.toString().padStart(6, "0")}`;

    // ---- Validate (without op_case_no yet) ----
    const { error, value } = PatientValidationSchema.validate(req.body);
    if (error) {
      return next(createError(401, error.details[0].message));
    }

    // ---- Generate op_case_no with retry-on-duplicate ----
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, "0");
    const dd = now.getDate().toString().padStart(2, "0");
    const datePrefix = `${yy}${mm}${dd}`;

    const MAX_RETRIES = 5;
    let savePatient;
    let lastErr: any = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const todaysCount = await patientSchema.countDocuments({
        op_case_no: { $regex: `^OP-${datePrefix}-` },
      });

      const opSeq = (todaysCount + 1 + attempt).toString().padStart(4, "0");
      const op_case_no = `OP-${datePrefix}-${opSeq}`;

      try {
        const newPatient = new patientSchema({ ...value, op_case_no });
        savePatient = await newPatient.save();
        lastErr = null;
        break; // success, exit retry loop
      } catch (err: any) {
        // 11000 = MongoDB duplicate key error
        if (err.code === 11000 && err.keyPattern?.op_case_no) {
          lastErr = err;
          continue; // retry with a fresh count
        }
        // some other error (e.g. patient_id collision, validation) — don't retry
        throw err;
      }
    }

    if (!savePatient) {
      return next(
        createError(
          500,
          "Could not generate a unique OP case number, please try again",
        ),
      );
    }

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

    const {
      patient_id,
      name,
      mobile_no,
      registration_date_from,
      registration_date_to,
    } = req.query;

    // Build dynamic filter object
    const filter: Record<string, any> = {};

    if (patient_id) {
      filter.patient_id = { $regex: patient_id as string, $options: "i" };
    }

    if (mobile_no) {
      filter.mobile_no = { $regex: mobile_no as string, $options: "i" };
    }

    if (name) {
      const nameRegex = { $regex: name as string, $options: "i" };
      filter.$or = [{ firstName: nameRegex }, { last_name: nameRegex }];
    }

    if (registration_date_from || registration_date_to) {
      filter.registration_date = {};

      if (registration_date_from) {
        filter.registration_date.$gte = new Date(
          registration_date_from as string,
        );
      }

      if (registration_date_to) {
        // include the entire "to" day
        const toDate = new Date(registration_date_to as string);
        toDate.setHours(23, 59, 59, 999);
        filter.registration_date.$lte = toDate;
      }
    }

    const [patients, total] = await Promise.all([
      patientSchema
        .find(filter)
        .select(
          "patient_id registration_date firstName last_name mobile_no -_id",
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      patientSchema.countDocuments(filter),
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

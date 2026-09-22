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
        const newPatient = new patientSchema({
          ...value,
          op_case_no: [op_case_no],
        });
        savePatient = await newPatient.save();
        lastErr = null;
        break;
      } catch (err: any) {
        if (err.code === 11000 && err.keyPattern?.op_case_no) {
          lastErr = err;
          continue;
        }
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
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const { search, registration_date_from, registration_date_to } = req.query;

    const filter: Record<string, any> = {};

    // 1. Build Regex Filter with Sanitized Input
    if (search && typeof search === "string") {
      const trimmedSearch = search.trim();
      const escapedSearch = trimmedSearch.replace(
        /[-[\]{}()*+?.,\\^$|#\s]/g,
        "\\$&",
      );
      const searchRegex = new RegExp(escapedSearch, "i");

      filter.$or = [
        { patient_id: searchRegex },
        { patientId: searchRegex }, // Fallback for camelCase schema definitions
        { firstName: searchRegex },
        { last_name: searchRegex },
        { mobile_no: searchRegex },
        { op_case_no: searchRegex },
      ];
    }

    // 2. Build Safe Date Boundaries
    if (registration_date_from || registration_date_to) {
      filter.registration_date = {};

      if (registration_date_from) {
        filter.registration_date.$gte = new Date(
          registration_date_from as string,
        );
      }

      if (registration_date_to) {
        const toDate = new Date(registration_date_to as string);
        toDate.setUTCHours(23, 59, 59, 999);
        filter.registration_date.$lte = toDate;
      }
    }

    const [patients, total] = await Promise.all([
      patientSchema
        .find(filter)
        .select(
          "patient_id registration_date firstName op_case_no last_name mobile_no -_id",
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
        totalPages: Math.ceil(total / limit) || 1,
        limit,
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};
export const updatePatientController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { patientId } = req.params;

    const patient = await patientSchema.findById(patientId);
    if (!patient) {
      return next(createError(404, "Patient not found"));
    }

    // Don't allow these to be changed via this endpoint
    delete req.body.hospital_id;
    delete req.body.patient_id;
    delete req.body.op_case_no;

    // Make every field optional for edit, keep same rules
    const UpdatePatientValidationSchema = PatientValidationSchema.fork(
      Object.keys(PatientValidationSchema.describe().keys),
      (schema) => schema.optional(),
    );

    const { error, value } = UpdatePatientValidationSchema.validate(req.body);
    if (error) {
      return next(createError(401, error.details[0].message));
    }

    // If mobile_no is being changed, make sure it's not already used by someone else
    if (value.mobile_no && value.mobile_no !== patient.mobile_no) {
      const existing_user = await patientSchema.findOne({
        mobile_no: value.mobile_no,
        _id: { $ne: patientId },
      });
      if (existing_user) {
        return next(createError(401, "mobile number already exist"));
      }
    }

    const updatedPatient = await patientSchema.findByIdAndUpdate(
      patientId,
      { $set: value },
      { new: true, runValidators: true },
    );

    res.json({
      success: true,
      status: 200,
      message: "Patient updated successfully",
      data: updatedPatient,
    });
  } catch (error) {
    next(error);
  }
};
export const deletePatientController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { patientId } = req.params;

    const patient = await patientSchema.findById(patientId);
    if (!patient) {
      return next(createError(404, "Patient not found"));
    }

    await patientSchema.findByIdAndDelete(patientId);

    res.json({
      success: true,
      status: 200,
      message: "Patient deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
export const getSinglePatientController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { patientId } = req.params;
    console.log("patientId", patientId);

    const patient = await patientSchema
      .findById(patientId)
      .populate("link_others", "patient_id firstName last_name mobile_no");

    if (!patient) {
      return next(createError(404, "Patient not found"));
    }

    res.json({
      success: true,
      status: 200,
      message: "Patient fetched successfully",
      data: patient,
    });
  } catch (error) {
    next(error);
  }
};

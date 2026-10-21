import { NextFunction, Request, Response } from "express";
import patientSchema, {
  PatientValidationSchema,
} from "../models/patient.schema";

import createError from "../middlewears/error.middlewears";
import OpCaseLookUpSchema, {
  OpCaseLookUpSchemaValidation,
} from "../models/op_case_lkup";
import mongoose from "mongoose";

export const createPatientController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // const { mobile_no } = req.body;

    const hospital_id = "68b1d92f65d84c8fbf89abcd";

    // 1. Check whether patient already exists
    // const existingPatient = await patientSchema.findOne({ mobile_no });
    // console.log("existingPatient", existingPatient);

    // if (existingPatient) {
    //   return next(createError(409, "Mobile number already exists"));
    // }

    // 2. Generate patient ID
    const lastPatient = await OpCaseLookUpSchema.findOne()
      .sort({ createdAt: -1 })
      .select("patient_id");

    let nextNumber = 1;

    if (lastPatient?.patient_id) {
      nextNumber = parseInt(lastPatient.patient_id.replace("PAT", ""), 10) + 1;
    }

    const patient_id = `PAT${nextNumber.toString().padStart(6, "0")}`;

    // 3. Prepare patient data
    const patientRegisterBody = {
      name_titles: req.body.name_titles,
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      registration_date: req.body.registration_date,
      age: req.body.age,
      gender: req.body.gender,
      blood_group: req.body.blood_group,
      mobile_no: req.body.mobile_no,
      id_proof: req.body.id_proof,
      ocupation: req.body.ocupation,
      address: req.body.address,
      city: req.body.city,
      district: req.body.district,
      state: req.body.state,
      pin_code: req.body.pin_code,
      link_others: req.body.link_others,
      created_by: req.user_info.id,
      patient_id,
      hospital_id,
    };

    // 4. Validate patient data
    const { error: patientError, value: patientValue } =
      PatientValidationSchema.validate(patientRegisterBody);

    if (patientError) {
      return next(createError(400, patientError.details[0].message));
    }

    // 5. Generate OP case number
    const now = new Date();

    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, "0");
    const dd = now.getDate().toString().padStart(2, "0");

    const datePrefix = `${yy}${mm}${dd}`;

    const todaysCount = await patientSchema.countDocuments({
      op_case_no: { $regex: `^OP${datePrefix}-` },
    });

    const opSeq = (todaysCount + 1).toString().padStart(4, "0");
    const op_case_no = `OP${datePrefix}-${opSeq}`;
    // In your original code, you were saving the patient first and then creating the OP case lookup. If the OP case creation failed due to a database error, the patient record could remain in the database without an OP case. To fix this, I moved the OP case validation before saving the patient, so if the OP case data is invalid, the patient will not be saved. Then, I used a MongoDB transaction to save both the patient and the OP case lookup together. Both database operations use the same session, which ensures that if both operations succeed, the transaction is committed and both records are saved. However, if either operation fails, the transaction is rolled back, and neither record is saved. This prevents incomplete patient registrations and eliminates the need to manually delete the patient when OP case creation fails.
    // 6. Prepare OP case lookup before saving the patient
    const opCaseNoBody = {
      op_case_no,
      patient_id,
      visit_type: req.body.visit_type,
      created_by: req.user_info.id,
      visit_date: new Date(),

      registration_date: patientValue.registration_date,
      first_name: patientValue.first_name,
      last_name: patientValue.last_name,
      mobile_no: patientValue.mobile_no,
      hospital_id,
    };

    // 7. Validate OP case lookup first
    const { error: opCaseError, value: opCaseValue } =
      OpCaseLookUpSchemaValidation.validate(opCaseNoBody);

    if (opCaseError) {
      return next(createError(400, opCaseError.details[0].message));
    }

    // 8. Start MongoDB transaction
    const session = await mongoose.startSession();

    let savedPatient: any;
    let savedOpCase: any;

    try {
      await session.withTransaction(async () => {
        // Create patient inside the transaction
        const newPatient = new patientSchema({
          ...patientValue,
          op_case_no,
        });

        savedPatient = await newPatient.save({ session });

        // Create OP case lookup inside the same transaction
        const createdOpCases = await OpCaseLookUpSchema.create([opCaseValue], {
          session,
        });

        savedOpCase = createdOpCases[0];
      });
    } finally {
      await session.endSession();
    }

    // 9. Return response only after both records are committed
    return res.status(201).json({
      success: true,
      status: 201,
      message: "New patient created successfully",
      data: {
        patient: savedPatient,
        op_case_lookup: savedOpCase,
      },
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return next(createError(409, "Duplicate patient or OP case number"));
    }

    return next(error);
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
        { first_name: searchRegex },
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
          "patient_id registration_date first_name op_case_no last_name mobile_no -_id",
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

    const patient = await patientSchema.findOne({ patient_id: patientId });
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

    const updatedPatient = await patientSchema.findOneAndUpdate(
      { patient_id: patientId },
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

    const patient = await patientSchema.findOne({ patient_id: patientId });
    if (!patient) {
      return next(createError(404, "Patient not found"));
    }

    await patientSchema.findOneAndDelete({ patient_id: patientId });

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
      .findOne({ patient_id: patientId })
      .populate("link_others", "patient_id first_name last_name mobile_no");

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
export const linkSinglePatientController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { owener, linkedPerson, type } = req.body;
    console.log(owener, linkedPerson, type);

    // Find the owner patient
    const patient = await patientSchema.findById(owener);

    if (!patient) {
      return next(createError(404, "Owner patient does not exist"));
    }

    // Find the patient to link
    const linkedPatient = await patientSchema.findById(linkedPerson);

    if (!linkedPatient) {
      return next(createError(404, "Patient to link does not exist"));
    }

    // Prevent linking a patient to themselves
    if (owener === linkedPerson) {
      return next(createError(400, "A patient cannot be linked to themselves"));
    }

    // Prevent duplicate links
    const alreadyLinked = patient.link_others.some(
      (item) => item.id.toString() === linkedPerson,
    );

    if (alreadyLinked) {
      return next(createError(409, "Patients are already linked"));
    }

    // Add the linked patient
    patient.link_others.push({
      id: linkedPatient._id,
      relation: type,
    });

    await patient.save();

    return res.status(200).json({
      success: true,
      message: "Patient linked successfully",
      data: patient,
    });
  } catch (error) {
    next(error);
  }
};

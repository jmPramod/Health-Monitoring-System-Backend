import { NextFunction, Request, Response } from "express";
import opCaseSchema, {
  OpCaseLookUpSchemaValidation,
} from "../models/op_case_lkup";
import createError from "../middlewears/error.middlewears";
export const getOpcaseList = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 10);
    const skip = (page - 1) * limit;
    const { search, registration_date_from, registration_date_to, visit_type } =
      req.query;
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
    // 3. Filter by visit_type
    if (visit_type && typeof visit_type === "string") {
      filter.visit_type = visit_type.trim();
    }
    const [op_list, total] = await Promise.all([
      opCaseSchema
        .find(filter)
        // .select(
        //   "patient_id registration_date first_name op_case_no last_name mobile_no -_id",
        // )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      opCaseSchema.countDocuments(filter),
    ]);
    return res.status(200).json({
      success: true,
      status: 200,
      message: "op_list fetched successfully",
      data: op_list,
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
export const createRevisit = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // 5. Generate OP case number
    const now = new Date();

    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, "0");
    const dd = now.getDate().toString().padStart(2, "0");

    const datePrefix = `${yy}${mm}${dd}`;

    const todaysCount = await opCaseSchema.countDocuments({
      op_case_no: { $regex: `^OP${datePrefix}-` },
    });

    const opSeq = (todaysCount + 1).toString().padStart(4, "0");
    const op_case_no = `OP${datePrefix}-${opSeq}`;

    const opCaseNoBody = {
      op_case_no,
      patient_id: req.body.patient_id,
      revisit_date: new Date(),
      revisit_status: true,
      visit_type: req.body.visit_type,
      created_by: req.user_info.id,
      visit_date: req.body.visit_date,
      revisit_info: {
        department: req.body.department,
        consulting_dr: req.body.consulting_dr,

        reason: req.body.reason,
      },
      registration_date: req.body.registration_date,
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      mobile_no: req.body.mobile_no,
      hospital_id: req.body.hospital_id,
    };
    const { error: opCaseError, value: opCaseValue } =
      OpCaseLookUpSchemaValidation.validate(opCaseNoBody);

    if (opCaseError) {
      return next(createError(400, opCaseError.details[0].message));
    }
    // 9. CREATE OP CASE LOOKUP SECOND
    const savedOpCase = await opCaseSchema.create(opCaseValue);
    return res.status(201).json({
      success: true,
      status: 201,
      message: "New patient created successfully",
      data: {
        op_case_lookup: savedOpCase,
      },
    });
  } catch (error) {}
};

import Joi from "joi";
import mongoose, { Schema, Document } from "mongoose";

export interface OpCaseLookUpInterface extends Document {
  op_case_no: string;
  patient_id: string;
  visit_type: string;
  created_by: mongoose.Types.ObjectId;
  visit_date: Date | null;
  revisit_status: boolean | null;
  revisit_date: Date | null;

  revisit_info: {
    department: string | null;
    consulting_dr: string | null;

    reason: string | null;
  } | null;

  registration_date: Date | null;
  first_name: string | null;
  last_name: string | null;
  mobile_no: string | null;
  hospital_id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OpCaseLookUpSchema = new Schema<OpCaseLookUpInterface>(
  {
    op_case_no: {
      type: String,
      trim: true,
      unique: true,
      required: true,
    },

    patient_id: {
      type: String,
    },

    revisit_date: {
      type: Date,
      default: null,
    },

    revisit_status: {
      type: Boolean,
      default: null,
    },

    revisit_info: {
      type: new Schema(
        {
          department: {
            type: String,
            default: null,
          },
          consulting_dr: {
            type: String,
            default: null,
          },

          reason: {
            type: String,
            default: null,
          },
        },
        { _id: false },
      ),
      default: null,
    },

    visit_type: {
      type: String,
      default: null,
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },

    visit_date: {
      type: Date,
      default: null,
    },

    registration_date: {
      type: Date,
      default: null,
    },

    first_name: {
      type: String,
    },

    last_name: {
      type: String,
    },

    mobile_no: {
      type: String,
    },

    hospital_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
    },
  },
  {
    timestamps: true,
  },
);

// OP Case Number: exact match within a hospital
OpCaseLookUpSchema.index({ hospital_id: 1, op_case_no: 1 }, { unique: true });

// Revisit Date: filtering and sorting within a hospital
OpCaseLookUpSchema.index({
  hospital_id: 1,
  revisit_date: -1,
});

// Patient First Name: filtering within a hospital
OpCaseLookUpSchema.index({
  hospital_id: 1,
  first_name: 1,
});

// Patient Last Name: filtering within a hospital
OpCaseLookUpSchema.index({
  hospital_id: 1,
  last_name: 1,
});

export default mongoose.model<OpCaseLookUpInterface>(
  "op_case_lkup",
  OpCaseLookUpSchema,
);

export const OpCaseLookUpSchemaValidation = Joi.object({
  op_case_no: Joi.string().required(),
  patient_id: Joi.string().required(),

  revisit_date: Joi.date().allow(null).optional(),
  revisit_status: Joi.boolean().allow(null).optional(),

  revisit_info: Joi.object({
    department: Joi.string().allow("", null).optional(),
    consulting_dr: Joi.string().allow("", null).optional(),

    reason: Joi.string().allow("", null).optional(),
  })
    .allow(null)
    .optional(),

  visit_type: Joi.string().optional(),
  created_by: Joi.string().required(),
  visit_date: Joi.date().optional(),
  hospital_id: Joi.string().required(),
  first_name: Joi.string().required(),
  last_name: Joi.string().allow("").optional(),
  registration_date: Joi.date().required(),
  mobile_no: Joi.string().required(),
});

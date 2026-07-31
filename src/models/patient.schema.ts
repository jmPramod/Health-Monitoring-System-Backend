import mongoose, { Schema, Document } from "mongoose";
import Joi from "joi";

export interface PatientInterface extends Document {
  hospital_id: mongoose.Types.ObjectId;
  patient_id: string;

  name_titles: string;
  firstName: string;
  last_name: string;

  registration_date: Date;

  age: number;
  gender: "Male" | "Female" | "Other";

  blood_group: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";

  mobile_no: string;
  id_proof: string;

  ocupation: string;

  address: string;
  city: string;
  district: string;
  state: string;
  pin_code: number;

  // Related Patients
  link_others: mongoose.Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;
}

const patientSchema = new Schema<PatientInterface>(
  {
    hospital_id: {
      type: Schema.Types.ObjectId,
      ref: "Hospital",

      index: true,
    },

    patient_id: {
      type: String,

      trim: true,
    },

    name_titles: {
      type: String,
      enum: ["Mr", "Mrs", "Miss", "Ms", "Dr", "Master", "Baby"],
      default: "Mr",
    },

    firstName: {
      type: String,

      trim: true,
    },

    last_name: {
      type: String,
      default: "",
      trim: true,
    },

    registration_date: {
      type: Date,
      default: Date.now,
    },

    age: {
      type: Number,

      min: 0,
      max: 120,
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },

    blood_group: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },

    mobile_no: {
      type: String,

      trim: true,
    },

    id_proof: {
      type: String,
      default: "",
    },

    ocupation: {
      type: String,
      default: "",
      trim: true,
    },

    address: {
      type: String,

      trim: true,
    },

    city: {
      type: String,

      trim: true,
    },

    district: {
      type: String,

      trim: true,
    },

    state: {
      type: String,

      trim: true,
    },

    pin_code: {
      type: Number,
    },

    // Related Patients
    link_others: [
      {
        type: Schema.Types.ObjectId,
        ref: "Patient",
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Indexes
patientSchema.index({ hospital_id: 1, patient_id: 1 }, { unique: true });

patientSchema.index({
  firstName: "text",
  last_name: "text",
  mobile_no: "text",
});

export default mongoose.model<PatientInterface>("Patient", patientSchema);

// Joi Validation
export const PatientValidationSchema = Joi.object({
  hospital_id: Joi.string().required(),

  patient_id: Joi.string().optional(),

  name_titles: Joi.string()
    .valid("Mr", "Mrs", "Miss", "Ms", "Dr", "Master", "Baby")
    .default("Mr"),

  firstName: Joi.string().required(),

  last_name: Joi.string().allow("").optional(),

  registration_date: Joi.date().optional(),

  age: Joi.number().min(0).max(120).required(),

  gender: Joi.string().valid("Male", "Female", "Other").required(),

  blood_group: Joi.string()
    .valid("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-")
    .required(),

  mobile_no: Joi.string().required(),

  id_proof: Joi.string().allow("").optional(),

  ocupation: Joi.string().allow("").optional(),

  address: Joi.string().optional(),

  city: Joi.string().required(),

  district: Joi.string().required(),

  state: Joi.string().required(),

  pin_code: Joi.number().optional(),

  link_others: Joi.array()
    .items(Joi.string().hex().length(24))
    .default([])
    .optional(),
});

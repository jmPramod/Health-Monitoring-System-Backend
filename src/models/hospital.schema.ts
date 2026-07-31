import mongoose, { Schema, Document } from "mongoose";

export interface IHospital extends Document {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pinCode: string;
  logo: string;
  status: "active" | "inactive";
}

const hospitalSchema = new Schema(
  {
    name: { type: String, required: true },
    email: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    country: String,
    pinCode: String,
    logo: String,
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<IHospital>("Hospital", hospitalSchema);

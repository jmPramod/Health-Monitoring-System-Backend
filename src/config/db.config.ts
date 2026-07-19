import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const gracefulExit = async (signal: string): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log(`MongoDB disconnected due to ${signal}`);
    process.exit(0);
  } catch (err) {
    console.error("Error disconnecting MongoDB:", err);
    process.exit(1);
  }
};

process.on("SIGINT", () => gracefulExit("SIGINT"));
process.on("SIGTERM", () => gracefulExit("SIGTERM"));

const connectMongooseDB = async (): Promise<void> => {
  try {
    const mongoUri =
      process.env.NODE_ENV === "DEV"
        ? process.env.MONGO_LOCAL
        : process.env.MONGO_CLOUD;

    if (!mongoUri) {
      throw new Error("MongoDB URI is not defined.");
    }

    await mongoose.connect(mongoUri);

    console.log(
      process.env.NODE_ENV === "DEV"
        ? "✅ Mongo Local DB connected!"
        : "✅ Mongo Cloud DB connected!",
    );
  } catch (err) {
    console.error("❌ Error connecting to MongoDB:", err);
    process.exit(1);
  }
};

export { connectMongooseDB };

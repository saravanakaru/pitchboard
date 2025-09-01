import mongoose from "mongoose";
import { Client } from "pg";
import { env } from "./env";

// MongoDB connection
export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(env.mongodbUri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database: ${conn?.connection?.db?.databaseName}`);
  } catch (error: any) {
    console.error("Error connecting to MongoDB:", error.message);

    if (error.name === "MongoServerError") {
      if (error.code === 13) {
        console.error(
          "Authentication failed. Please check your MongoDB username and password."
        );
      } else if (error.code === 18) {
        console.error("Authentication failed. Wrong username or password.");
      }
    } else if (error.name === "MongoNetworkError") {
      console.error("Network error. Please check if MongoDB is running.");
    }

    process.exit(1);
  }
};

// PostgreSQL connection
let pgClient: Client;

export const connectPostgreSQL = async (): Promise<Client> => {
  try {
    pgClient = new Client({
      connectionString: env.postgresUrl,
      connectionTimeoutMillis: 5000,
    });

    await pgClient.connect();
    console.log("PostgreSQL Connected");

    // Create tables if they don't exist
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id),
        user_id VARCHAR(255),
        action VARCHAR(255) NOT NULL,
        resource VARCHAR(255) NOT NULL,
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    return pgClient;
  } catch (error: any) {
    console.error("Error connecting to PostgreSQL:", error.message);
    process.exit(1);
  }
};

export const getPostgreSQLClient = (): Client => {
  if (!pgClient) {
    throw new Error("PostgreSQL client not initialized");
  }
  return pgClient;
};

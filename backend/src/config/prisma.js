import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;

const isRemote =
  connectionString &&
  !connectionString.includes("localhost") &&
  !connectionString.includes("127.0.0.1");

const pool = new pg.Pool({
  connectionString,
  ssl: isRemote ? { rejectUnauthorized: false } : false,
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

export default prisma;

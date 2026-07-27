import "dotenv/config";

export const envConfig = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || "gmfabrics_pos_super_secret_jwt_key_2026",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3001",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  currency: "PKR",
};

export default envConfig;

import jwt from "jsonwebtoken";
import { envConfig } from "../config/envConfig.js";

export const generateToken = (payload) => {
  return jwt.sign(payload, envConfig.jwtSecret, {
    expiresIn: envConfig.jwtExpiresIn,
    algorithm: "HS256",
  });
};

export const verifyToken = (token) => {
  return jwt.verify(token, envConfig.jwtSecret, { algorithms: ["HS256"] });
};

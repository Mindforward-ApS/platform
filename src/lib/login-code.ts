import { z } from "zod";

// Sign-in / sign-up code sent by email (Better Auth emailOTP). Shared by the server config and the code form.
export const LOGIN_CODE_LENGTH = 6;
export const LOGIN_CODE_ATTEMPTS = 5;

/** Accepts "123 456" or "123456" and returns the 6 digits, or fails. */
export const loginCodeSchema = z
  .string()
  .transform((v) => v.replace(/\s+/g, ""))
  .pipe(z.string().regex(new RegExp(`^\\d{${LOGIN_CODE_LENGTH}}$`)));

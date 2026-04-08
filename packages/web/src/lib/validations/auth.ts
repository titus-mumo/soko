import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Include at least one uppercase letter")
    .regex(/[0-9]/, "Include at least one number"),
});

export const otpRequestSchema = z.object({
  phone: z
    .string()
    .regex(
      /^\+?[1-9]\d{6,14}$/,
      "Enter a valid phone number (e.g. +254700000000)",
    ),
});

export const otpVerifySchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{6,14}$/, "Invalid phone number"),
  code: z
    .string()
    .length(6, "Code must be exactly 6 digits")
    .regex(/^\d+$/, "Code must contain only digits"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type OtpRequestFormValues = z.infer<typeof otpRequestSchema>;
export type OtpVerifyFormValues = z.infer<typeof otpVerifySchema>;

import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(320),
  password: z.string().min(1, "Enter your password").max(128),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(1, "Enter your full name").max(120),
    email: z.string().trim().email("Enter a valid email address").max(320),
    password: z
      .string()
      .min(12, "Use at least 12 characters")
      .max(128)
      .regex(/[a-z]/, "Add a lowercase letter")
      .regex(/[A-Z]/, "Add an uppercase letter")
      .regex(/\d/, "Add a number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;

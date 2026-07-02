import {z} from 'zod'

export const registerSchema = z.object({
    name: z.string().min(3,"Name must be 3 char long"),
    email: z.string().email("Invalid Email"),
    password: z.string().min(8,"password should be 8 char long"),
});

export const loginSchema = z.object({
    email: z.string().email("Invalid Email"),
    password: z.string().min(8,"password should be 8 char long"),
});
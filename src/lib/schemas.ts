import * as z from "zod";

export const placeSchema = z.enum(["home", "computer", "trash", "text"]);

export const mailSchema = z.object({
  sender: z.string().min(1, "Sender is required"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
});

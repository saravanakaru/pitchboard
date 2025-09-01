import { type Session, type User } from "../types";

export const getUserDisplayName = (session: Session): string => {
  if (typeof session.userId === "string") {
    return "Unknown User"; // Or session.userId if you want to show the ID
  }

  const user = session.userId as User;
  return `${user.firstName} ${user.lastName}`.trim() || user.email;
};

export const isUserObject = (userId: string | User): userId is User => {
  return typeof userId !== "string" && userId !== null;
};

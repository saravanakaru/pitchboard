import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import Organization from "../models/Organization";
import { createError } from "./errorHandler";

export const validateOrganizationAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      throw createError("Organization access required", 403);
    }

    const organization = await Organization.findById(organizationId);

    if (!organization || !organization.isActive) {
      throw createError("Organization not found or inactive", 404);
    }

    // Add organization to request for later use
    req.organization = organization;
    next();
  } catch (error) {
    next(error);
  }
};

// Extend the AuthRequest interface to include organization
declare global {
  namespace Express {
    interface Request {
      organization?: any;
    }
  }
}

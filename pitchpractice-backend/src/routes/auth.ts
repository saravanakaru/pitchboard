import express, { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";
import Organization from "../models/Organization";
import { env } from "../config/env";
import { asyncHandler, createError } from "../middleware/errorHandler";
import { AuthRequest, authenticateToken } from "../middleware/auth";
const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new organization and admin user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *               - organizationName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               organizationName:
 *                 type: string
 *               organizationType:
 *                 type: string
 *                 enum: [company, individual]
 *                 default: company
 *               organizationDescription:
 *                 type: string
 *     responses:
 *       201:
 *         description: Organization and admin user created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/register",
  asyncHandler(async (req: Request, res: Response) => {
    const {
      email,
      password,
      firstName,
      lastName,
      organizationName,
      organizationType = "company",
      organizationDescription,
    } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !organizationName) {
      throw createError("Missing required fields", 400);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw createError("User already exists", 400);
    }

    // Check if organization already exists
    const existingOrganization = await Organization.findOne({
      name: organizationName,
    });
    if (existingOrganization) {
      throw createError("Organization already exists", 400);
    }

    // Create organization
    const organization = new Organization({
      name: organizationName,
      description: organizationDescription,
      type: organizationType,
    });

    await organization.save();

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create admin user for the organization
    const user = new User({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      organizationId: organization._id,
      role: "admin", // First user becomes admin
    });

    await user.save();

    // Generate tokens
    const accessToken = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role,
      },
      env.jwtSecret,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign({ userId: user._id }, env.jwtSecret, {
      expiresIn: "7d",
    });

    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
      },
      organization: {
        id: organization._id,
        name: organization.name,
        type: organization.type,
        description: organization.description,
      },
    });
  })
);

/**
 * @swagger
 * /api/auth/register/user:
 *   post:
 *     summary: Register additional users for an existing organization
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, manager, trainee]
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/register/user",
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email, password, firstName, lastName, role = "trainee" } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      throw createError("Missing required fields", 400);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw createError("User already exists", 400);
    }

    // Get organization ID from authenticated user
    const organizationId = req.user?.organizationId;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      organizationId,
      role,
    });

    await user.save();

    res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
      },
    });
  })
);

// Login
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 organization:
 *                   $ref: '#/components/schemas/Organization'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/login",
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw createError("Email and password are required", 400);
    }

    // Find user with password field
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      throw createError("Invalid credentials", 401);
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw createError("Invalid credentials", 401);
    }

    if (!user.isActive) {
      throw createError("Account is deactivated", 401);
    }

    // Get organization details
    const Organization = require("../models/Organization").default;
    const organization = await Organization.findById(user.organizationId);

    if (!organization) {
      throw createError("Organization not found", 404);
    }

    // Generate tokens
    const accessToken = jwt.sign(
      {
        userId: user.id.toString(),
        email: user.email,
        organizationId: user.organizationId.toString(),
        role: user.role,
      },
      env.jwtSecret,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { userId: user.id.toString() },
      env.jwtSecret,
      { expiresIn: "7d" }
    );

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
      },
      organization: {
        id: organization._id,
        name: organization.name,
        type: organization.type,
        description: organization.description,
        isActive: organization.isActive,
      },
    });
  })
);

// Refresh token
/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *       401:
 *         description: Invalid refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/refresh",
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw createError("Refresh token required", 401);
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as any;
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      throw createError("Invalid refresh token", 401);
    }

    const newAccessToken = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" }
    );

    res.json({ accessToken: newAccessToken });
  })
);

/**
 * @swagger
 * /api/auth/users:
 *   get:
 *     summary: Get all users for the current organization
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only admins can access
 */
router.get(
  "/users",
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    // Only allow admins and managers to view users
    if (req.user?.role !== "admin" && req.user?.role !== "manager") {
      throw createError("Access denied. Requires admin or manager role.", 403);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get users for the current organization only
    const users = await User.find({
      organizationId: req.user.organizationId,
    })
      .select("-password") // Exclude password field
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments({
      organizationId: req.user.organizationId,
    });

    res.json({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  })
);

/**
 * @swagger
 * /api/auth/users/{id}:
 *   put:
 *     summary: Update a user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [admin, manager, trainee]
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only admins can update users
 *       404:
 *         description: User not found
 */
router.put(
  "/users/:id",
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    // Only allow admins to update users
    if (req.user?.role !== "admin") {
      throw createError("Access denied. Requires admin role.", 403);
    }

    const { id } = req.params;
    const { firstName, lastName, email, role, isActive } = req.body;

    // Find user and ensure they belong to the same organization
    const user = await User.findOne({
      _id: id,
      organizationId: req.user.organizationId,
    });

    if (!user) {
      throw createError("User not found", 404);
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({
        email,
        organizationId: req.user.organizationId,
      });
      if (existingUser) {
        throw createError("Email already exists in this organization", 400);
      }
    }

    // Update user fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (role) user.role = role;
    if (typeof isActive === "boolean") user.isActive = isActive;

    await user.save();

    // Return user without password
    const userResponse = user.toObject();
    // if(userResponse) delete userResponse?.password;

    res.json(userResponse);
  })
);

/**
 * @swagger
 * /api/auth/users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request - Cannot delete own account or admin users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only admins can delete users
 *       404:
 *         description: User not found
 */
router.delete(
  "/users/:id",
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    // Only allow admins to delete users
    if (req.user?.role !== "admin") {
      throw createError("Access denied. Requires admin role.", 403);
    }

    const { id } = req.params;

    // Prevent users from deleting themselves
    if (id === req.user.userId) {
      throw createError("Cannot delete your own account", 400);
    }

    // Find user and ensure they belong to the same organization
    const user = await User.findOne({
      _id: id,
      organizationId: req.user.organizationId,
    });

    if (!user) {
      throw createError("User not found", 404);
    }

    // Prevent deletion of other admin users (optional security measure)
    if (user.role === "admin") {
      throw createError("Cannot delete admin users", 400);
    }

    await User.findByIdAndDelete(id);

    res.json({ message: "User deleted successfully" });
  })
);
export default router;

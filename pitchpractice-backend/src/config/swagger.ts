import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";
import { env } from "./env";

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Voice Coaching API",
      version: "1.0.0",
      description: "API documentation for the Voice Coaching application",
      contact: {
        name: "API Support",
        email: "support@voicecoaching.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: `http://localhost:${env.port}`,
        description: "Development server",
      },
      {
        url: "https://api.voicecoaching.com",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            _id: { type: "string" },
            email: { type: "string", format: "email" },
            firstName: { type: "string" },
            lastName: { type: "string" },
            organizationId: { type: "string" },
            role: { type: "string", enum: ["admin", "manager", "trainee"] },
            isActive: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Session: {
          type: "object",
          properties: {
            _id: { type: "string" },
            userId: { type: "string" },
            organizationId: { type: "string" },
            scenario: { type: "string" },
            audioUrl: { type: "string" },
            transcript: { type: "string" },
            duration: { type: "number" },
            feedbackMetrics: {
              type: "array",
              items: {
                $ref: "#/components/schemas/FeedbackMetric",
              },
            },
            overallScore: { type: "number" },
            status: {
              type: "string",
              enum: ["in-progress", "completed", "failed"],
            },
            startedAt: { type: "string", format: "date-time" },
            completedAt: { type: "string", format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        Organization: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string" },
            description: { type: "string" },
            type: { type: "string", enum: ["company", "individual"] },
            isActive: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        FeedbackMetric: {
          type: "object",
          properties: {
            category: { type: "string" },
            score: { type: "number" },
            feedback: { type: "string" },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            accessToken: { type: "string" },
            refreshToken: { type: "string" },
            user: { $ref: "#/components/schemas/User" },
            organization: { $ref: "#/components/schemas/Organization" },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            error: { type: "string" },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/*.ts", "./src/models/*.ts"], // Path to the API docs
};

const swaggerSpec = swaggerJSDoc(options);

function swaggerDocs(app: Express, port: number) {
  // Swagger page
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Docs in JSON format
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  console.log(`Swagger docs available at http://localhost:${port}/api-docs`);
}

export default swaggerDocs;

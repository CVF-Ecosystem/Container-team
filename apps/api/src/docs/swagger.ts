/**
 * OpenAPI/Swagger Documentation Configuration
 * Accessible at: GET /api/docs
 * OpenAPI spec: GET /api/docs.json
 */

import swaggerJsdoc, { type Options as SwaggerJsdocOptions } from "swagger-jsdoc";

const options: SwaggerJsdocOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Tan Thuan Port API",
      version: "1.0.0",
      description: `
REST API cho hệ thống quản lý cảng Tân Thuận.

## Authentication
Sử dụng JWT Bearer token. Lấy token từ \`POST /api/v1/auth/login\`.

## Rate Limiting
100 requests per 15 minutes per IP.

## Versioning
Current version: \`/api/v1/\`
Legacy (deprecated): \`/api/\`
      `,
      contact: {
        name: "Đội Container - Cảng Tân Thuận",
        url: "https://github.com/Blackbird081/tan-thuan-port",
      },
    },
    servers: [
      { url: "/api/v1", description: "API v1 (current)" },
      { url: "/api", description: "API (deprecated, use v1)" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT token từ POST /auth/login",
        },
      },
      schemas: {
        DailyData: {
          type: "object",
          required: ["date", "year", "month", "day"],
          properties: {
            id: { type: "string", description: "UUID" },
            date: { type: "string", format: "date", example: "2025-01-15" },
            year: { type: "integer", example: 2025 },
            month: { type: "integer", minimum: 1, maximum: 12 },
            day: { type: "integer", minimum: 1, maximum: 31 },
            xe_ha: { type: "integer", minimum: 0, description: "Xe hạ bãi" },
            xe_giao: { type: "integer", minimum: 0, description: "Xe giao hàng" },
            xe_cfs: { type: "integer", minimum: 0, description: "Xe CFS" },
            xe_total: { type: "integer", minimum: 0, description: "Tổng xe" },
            xalan_ha: { type: "integer", minimum: 0 },
            xalan_giao: { type: "integer", minimum: 0 },
            xalan_cfs: { type: "integer", minimum: 0 },
            xalan_total: { type: "integer", minimum: 0 },
            total_in: { type: "integer", minimum: 0 },
            total_out: { type: "integer", minimum: 0 },
            total_cfs: { type: "integer", minimum: 0 },
            total: { type: "integer", minimum: 0 },
          },
        },
        Employee: {
          type: "object",
          required: ["mscd", "name", "department", "shift"],
          properties: {
            id: { type: "string" },
            mscd: { type: "string", example: "NV001", description: "Mã số cố định" },
            name: { type: "string", example: "Nguyễn Văn A" },
            department: { type: "string", example: "Bãi cont" },
            shift: { type: "string", example: "Ca 1" },
            role: { type: "string", nullable: true },
            active: { type: "boolean", default: true },
          },
        },
        VesselData: {
          type: "object",
          properties: {
            id: { type: "string" },
            vessel_name: { type: "string", example: "EVER GIANT" },
            voyage: { type: "string", example: "0123E" },
            shipping_line: { type: "string", example: "Evergreen" },
            date: { type: "string", format: "date" },
            nhap_tau: { type: "integer", minimum: 0, description: "Discharge moves" },
            xuat_tau: { type: "integer", minimum: 0, description: "Loading moves" },
            shift_in: { type: "integer", minimum: 0 },
            shift_out: { type: "integer", minimum: 0 },
            total_moves: { type: "integer", minimum: 0 },
            teus: { type: "integer", minimum: 0 },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
            message: { type: "string" },
          },
        },
        Pagination: {
          type: "object",
          properties: {
            limit: { type: "integer" },
            offset: { type: "integer" },
            count: { type: "integer" },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: { type: "string", example: "admin" },
            password: { type: "string", example: "password123" },
          },
        },
        LoginResponse: {
          type: "object",
          properties: {
            token: { type: "string", description: "JWT Bearer token" },
            user: {
              type: "object",
              properties: {
                id: { type: "string" },
                username: { type: "string" },
                name: { type: "string" },
                role: { type: "string", enum: ["admin", "user"] },
                department: { type: "string", nullable: true },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/**/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);

export const swaggerUiOptions = {
  customSiteTitle: "Tan Thuan Port API Docs",
  customCss: ".swagger-ui .topbar { display: none }",
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
  },
};

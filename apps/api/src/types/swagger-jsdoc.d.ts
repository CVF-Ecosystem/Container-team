declare module "swagger-jsdoc" {
  export interface Options {
    definition?: Record<string, unknown>;
    apis?: string[];
    [key: string]: unknown;
  }

  export default function swaggerJsdoc(
    options: Options
  ): Record<string, unknown>;
}

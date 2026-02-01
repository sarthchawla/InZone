import { PrismaClient, BoardTemplate } from "@prisma/client";

export class TemplateService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get all built-in templates
   */
  async getTemplates(): Promise<BoardTemplate[]> {
    return this.prisma.boardTemplate.findMany({
      where: { isBuiltIn: true },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Get a single template by ID
   */
  async getTemplateById(id: string): Promise<BoardTemplate | null> {
    return this.prisma.boardTemplate.findUnique({
      where: { id },
    });
  }
}

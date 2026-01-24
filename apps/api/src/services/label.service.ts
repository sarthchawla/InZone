import { PrismaClient, Label } from "@prisma/client";

export type LabelWithCount = Label & {
  _count: {
    todos: number;
  };
};

export type CreateLabelInput = {
  name: string;
  color: string;
};

export type UpdateLabelInput = {
  name?: string;
  color?: string;
};

export class LabelService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get all labels with their todo counts
   */
  async getLabels(): Promise<LabelWithCount[]> {
    return this.prisma.label.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { todos: true },
        },
      },
    });
  }

  /**
   * Get a single label by ID
   */
  async getLabelById(id: string): Promise<LabelWithCount | null> {
    return this.prisma.label.findUnique({
      where: { id },
      include: {
        _count: {
          select: { todos: true },
        },
      },
    });
  }

  /**
   * Create a new label
   */
  async createLabel(input: CreateLabelInput): Promise<Label> {
    return this.prisma.label.create({
      data: {
        name: input.name,
        color: input.color,
      },
    });
  }

  /**
   * Update a label
   */
  async updateLabel(id: string, input: UpdateLabelInput): Promise<Label> {
    return this.prisma.label.update({
      where: { id },
      data: input,
    });
  }

  /**
   * Delete a label
   */
  async deleteLabel(id: string): Promise<void> {
    await this.prisma.label.delete({
      where: { id },
    });
  }
}

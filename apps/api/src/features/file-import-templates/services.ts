import { NotFoundException } from '../../errors';
import { prisma } from '../../database';
import { FileImportType, FileFormatType } from '@prisma/client';

export interface CreateTemplateInput {
  name: string;
  code: string;
  description?: string;
  importType: FileImportType;
  formatType?: FileFormatType;
  delimiter?: string;
  hasHeader?: boolean;
  headerRowIndex?: number;
  dataStartRow?: number;
  expectedColCount?: number;
  signatureHeaders?: string[];
  optionsFilterRule?: any;
  clientSwapRule?: any;
  brokerFeeFormula?: any;
  mappings?: Array<{
    appField: string;
    fileColumnHeader?: string | null;
    fileColumnIndex?: number | null;
    alternateHeaders?: string[];
    isRequired?: boolean;
    defaultValue?: string | null;
    transformRule?: string | null;
  }>;
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {
  isActive?: boolean;
}

export class FileImportTemplatesService {
  async findAll(type?: FileImportType) {
    return prisma.fileImportTemplate.findMany({
      where: {
        isDeleted: false,
        ...(type && { importType: type }),
      },
      include: {
        mappings: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const template = await prisma.fileImportTemplate.findFirst({
      where: { id, isDeleted: false },
      include: {
        mappings: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!template) throw new NotFoundException(`File Import Template ${id} not found`);
    return template;
  }

  async findByCode(code: string) {
    const template = await prisma.fileImportTemplate.findFirst({
      where: { code: code.toUpperCase().trim(), isDeleted: false },
      include: {
        mappings: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!template) throw new NotFoundException(`Template with code ${code} not found`);
    return template;
  }

  async create(data: CreateTemplateInput) {
    const template = await prisma.fileImportTemplate.create({
      data: {
        name: data.name.trim(),
        code: data.code.toUpperCase().trim(),
        description: data.description?.trim() || null,
        importType: data.importType,
        formatType: data.formatType || FileFormatType.CSV,
        delimiter: data.delimiter || ',',
        hasHeader: data.hasHeader !== undefined ? data.hasHeader : true,
        headerRowIndex: data.headerRowIndex ?? 0,
        dataStartRow: data.dataStartRow ?? 1,
        expectedColCount: data.expectedColCount ?? null,
        signatureHeaders: data.signatureHeaders || [],
        optionsFilterRule: data.optionsFilterRule || null,
        clientSwapRule: data.clientSwapRule || null,
        brokerFeeFormula: data.brokerFeeFormula || null,
        mappings: data.mappings
          ? {
              create: data.mappings.map((m) => ({
                appField: m.appField.trim(),
                fileColumnHeader: m.fileColumnHeader?.trim() || null,
                fileColumnIndex: m.fileColumnIndex ?? null,
                alternateHeaders: m.alternateHeaders || [],
                isRequired: m.isRequired || false,
                defaultValue: m.defaultValue || null,
                transformRule: m.transformRule || null,
              })),
            }
          : undefined,
      },
      include: {
        mappings: true,
      },
    });

    return template;
  }

  async update(id: string, data: UpdateTemplateInput) {
    await this.findOne(id);

    return prisma.$transaction(async (tx) => {
      // 1. Update template top-level fields
      const updated = await tx.fileImportTemplate.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name.trim() }),
          ...(data.code !== undefined && { code: data.code.toUpperCase().trim() }),
          ...(data.description !== undefined && { description: data.description?.trim() || null }),
          ...(data.importType !== undefined && { importType: data.importType }),
          ...(data.formatType !== undefined && { formatType: data.formatType }),
          ...(data.delimiter !== undefined && { delimiter: data.delimiter }),
          ...(data.hasHeader !== undefined && { hasHeader: data.hasHeader }),
          ...(data.headerRowIndex !== undefined && { headerRowIndex: data.headerRowIndex }),
          ...(data.dataStartRow !== undefined && { dataStartRow: data.dataStartRow }),
          ...(data.expectedColCount !== undefined && { expectedColCount: data.expectedColCount }),
          ...(data.signatureHeaders !== undefined && { signatureHeaders: data.signatureHeaders }),
          ...(data.optionsFilterRule !== undefined && { optionsFilterRule: data.optionsFilterRule }),
          ...(data.clientSwapRule !== undefined && { clientSwapRule: data.clientSwapRule }),
          ...(data.brokerFeeFormula !== undefined && { brokerFeeFormula: data.brokerFeeFormula }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
      });

      // 2. If mappings are provided, sync them
      if (data.mappings && Array.isArray(data.mappings)) {
        for (const m of data.mappings) {
          await tx.fileColumnMapping.upsert({
            where: {
              uq_template_app_field: {
                templateId: id,
                appField: m.appField.trim(),
              },
            },
            update: {
              fileColumnHeader: m.fileColumnHeader !== undefined ? (m.fileColumnHeader?.trim() || null) : undefined,
              fileColumnIndex: m.fileColumnIndex !== undefined ? m.fileColumnIndex : undefined,
              alternateHeaders: m.alternateHeaders !== undefined ? m.alternateHeaders : undefined,
              isRequired: m.isRequired !== undefined ? m.isRequired : undefined,
              defaultValue: m.defaultValue !== undefined ? m.defaultValue : undefined,
              transformRule: m.transformRule !== undefined ? m.transformRule : undefined,
              isDeleted: false,
              deletedAt: null,
            },
            create: {
              templateId: id,
              appField: m.appField.trim(),
              fileColumnHeader: m.fileColumnHeader?.trim() || null,
              fileColumnIndex: m.fileColumnIndex ?? null,
              alternateHeaders: m.alternateHeaders || [],
              isRequired: m.isRequired || false,
              defaultValue: m.defaultValue || null,
              transformRule: m.transformRule || null,
            },
          });
        }
      }

      return tx.fileImportTemplate.findUnique({
        where: { id },
        include: {
          mappings: {
            where: { isDeleted: false },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return prisma.fileImportTemplate.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }
}

import { Request, Response, NextFunction } from 'express';
import { FileImportTemplatesService } from './services';
import { FileImportType } from '@prisma/client';

const service = new FileImportTemplatesService();

export class FileImportTemplatesController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const type = req.query.type as FileImportType | undefined;
      const templates = await service.findAll(type);
      res.json(templates);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const template = await service.findOne(id);
      res.json(template);
    } catch (err) {
      next(err);
    }
  }

  async getByCode(req: Request, res: Response, next: NextFunction) {
    try {
      const code = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code;
      const template = await service.findByCode(code);
      res.json(template);
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const created = await service.create(req.body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await service.update(id, req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await service.remove(id);
      res.json({ message: 'Template deleted successfully', result });
    } catch (err) {
      next(err);
    }
  }
}

import { Router } from 'express';
import { FileImportTemplatesController } from './controller';

const router = Router();
const controller = new FileImportTemplatesController();

router.get('/', controller.getAll);
router.get('/code/:code', controller.getByCode);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

export default router;

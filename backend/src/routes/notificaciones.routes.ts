import { Router } from 'express';
import { getNotificaciones } from '../controllers/notificaciones.controller';

const router = Router();

router.get('/', getNotificaciones);

export default router;

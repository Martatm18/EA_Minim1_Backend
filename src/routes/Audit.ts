import express from 'express';
import controller from '../controllers/Audit';
import { ValidateId } from '../middleware/Joi';
import VerifyToken from '../middleware/VerifyToken';
import { RequireRole } from '../middleware/RequireRole';

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     AuditLog:
 *       type: object
 *       properties:
 *         _id: { type: string, example: "654321098765432109876543" }
 *         activityId: { type: string, example: "654321098765432109876599" }
 *         authorId: { type: string, example: "654321098765432109876511" }
 *         actionType: { type: string, enum: [CREATE, UPDATE, DELETE, RESTORE, REVERT], example: "UPDATE" }
 *         changes:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               fieldName: { type: string, example: "title" }
 *               oldValue: { type: string, example: "Pachanga v1" }
 *               newValue: { type: string, example: "Pachanga v2" }
 *               isModified: { type: boolean, example: true }
 *               changedAt: { type: string, format: date-time }
 *         createdAt: { type: string, format: date-time }
 */

/**
 * @openapi
 * /audits:
 *   get:
 *     tags: [Audits]
 *     summary: Llista els registres d'auditoria paginats amb cercador combinat (text + tipus d'acció)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: actionType
 *         schema: { type: string, enum: [CREATE, UPDATE, DELETE, RESTORE, REVERT] }
 *     responses:
 *       200:
 *         description: Llistat retornat amb èxit
 *       401:
 *         description: No autoritzat (token invàlid o absent)
 */
router.get('/', VerifyToken, controller.readAllPaginated);

/**
 * @openapi
 * /audits/{auditId}:
 *   get:
 *     tags: [Audits]
 *     summary: Obté el detall d'un registre d'auditoria pel seu ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: auditId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Detall del registre trobat
 *       400:
 *         description: ID invàlid
 *       404:
 *         description: Registre no trobat
 */
router.get('/:auditId', VerifyToken, ValidateId('auditId'), controller.readAuditLog);

/**
 * @openapi
 * /audits/{auditId}/revert:
 *   post:
 *     tags: [Audits]
 *     summary: Reverteix el canvi d'una activitat usant l'historial d'auditoria (Només ADMIN)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: auditId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Canvi revertit correctament
 *       401:
 *         description: Token invàlid
 *       403:
 *         description: Permisos insuficients (requereix rol ADMIN)
 *       404:
 *         description: Registre d'auditoria o activitat no trobada
 *       409:
 *         description: Regla de negoci incomplerta (sense estat previ)
 */
router.post('/:auditId/revert', VerifyToken, RequireRole('ADMIN'), ValidateId('auditId'), controller.revertChange);

/**
 * @openapi
 * /audits/{auditId}/soft-delete:
 *   patch:
 *     tags: [Audits]
 *     summary: Borrat lògic d'un registre d'auditoria (Només ADMIN)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: auditId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Esborrat lògic aplicat
 *       403:
 *         description: No autoritzat
 *       404:
 *         description: Registre no trobat
 */
router.patch('/:auditId/soft-delete', VerifyToken, RequireRole('ADMIN'), ValidateId('auditId'), controller.softDeleteAudit);

/**
 * @openapi
 * /audits/{auditId}:
 *   delete:
 *     tags: [Audits]
 *     summary: Borrat físic (hard delete) d'un registre d'auditoria (Només ADMIN)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: auditId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Esborrat físic completat
 *       403:
 *         description: No autoritzat
 *       404:
 *         description: Registre no trobat
 */
router.delete('/:auditId', VerifyToken, RequireRole('ADMIN'), ValidateId('auditId'), controller.hardDeleteAudit);

export default router;

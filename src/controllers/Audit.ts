import { Request, Response } from 'express';
import auditService from '../services/AuditService';

// Llistat paginat amb filtres de cerca
export const readAllPaginated = async (req: Request, res: Response) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const sortBy = (req.query.sortBy as string) || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';
        const search = typeof req.query.search === 'string' ? req.query.search : undefined;
        const actionType = typeof req.query.actionType === 'string' ? req.query.actionType : undefined;
        const activityId = typeof req.query.activityId === 'string' ? req.query.activityId : undefined;
        const showDeleted = req.query.showDeleted === 'true';

        const userRole = res.locals.jwt?.role || 'USER';

        const result = await auditService.getAllAuditLogsPaginated({
            page,
            limit,
            sortBy,
            sortOrder,
            search,
            actionType,
            activityId,
            showDeleted,
            userRole
        });

        return res.status(200).json(result);
    } catch (error: any) {
        return res.status(500).json({ message: 'Error intern del servidor', error: error.message });
    }
};

// Per obtenir detall d'un registre d'auditoria concret
export const readAuditLog = async (req: Request, res: Response) => {
    try {
        const auditId = req.params.auditId as string;
        const log = await auditService.getAuditLogById(auditId);

        if (!log) {
            return res.status(404).json({ message: "Registre d'auditoria no trobat" });
        }

        return res.status(200).json(log);
    } catch (error: any) {
        return res.status(400).json({ message: "Format d'ID invàlid", error: error.message });
    }
};

// Per revertir un canvi
export const revertChange = async (req: Request, res: Response) => {
    try {
        const auditId = req.params.auditId as string;
        const adminUserId = res.locals.jwt?.id; // L'autor s'obté del token, MAI del body!

        if (!adminUserId) {
            return res.status(401).json({ message: 'Token invàlid o no proporcionat' });
        }

        const result = await auditService.revertActivityChange(auditId, adminUserId);
        return res.status(200).json({
            message: 'Canvi revertit amb èxit correctament',
            activity: result.activity,
            revertLog: result.revertLog
        });
    } catch (error: any) {
        if (error.message === 'AUDIT_NOT_FOUND') {
            return res.status(404).json({ message: "Registre d'auditoria no trobat" });
        }
        if (error.message === 'NO_PREVIOUS_STATE') {
            return res.status(409).json({ message: 'Regla de negoci incomplerta: Aquest registre no té estat previ guardat per revertir' });
        }
        if (error.message === 'ACTIVITY_NOT_FOUND') {
            return res.status(404).json({ message: "L'activitat associada ja no existeix" });
        }
        return res.status(422).json({ message: 'Error al processar la reversió', error: error.message });
    }
};

// Soft delete d'un registre d'auditoria
export const softDeleteAudit = async (req: Request, res: Response) => {
    try {
        const auditId = req.params.auditId as string;
        const deletedLog = await auditService.softDeleteAuditLog(auditId);

        if (!deletedLog) {
            return res.status(404).json({ message: 'Registre no trobat' });
        }

        return res.status(204).send();
    } catch (error: any) {
        return res.status(400).json({ message: 'Error en el borrat lògic', error: error.message });
    }
};

// Hard delete definitiu
export const hardDeleteAudit = async (req: Request, res: Response) => {
    try {
        const auditId = req.params.auditId as string;
        const deletedLog = await auditService.hardDeleteAuditLog(auditId);

        if (!deletedLog) {
            return res.status(404).json({ message: 'Registre no trobat' });
        }

        return res.status(204).send();
    } catch (error: any) {
        return res.status(400).json({ message: 'Error en el borrat físic', error: error.message });
    }
};

export default {
    readAllPaginated,
    readAuditLog,
    revertChange,
    softDeleteAudit,
    hardDeleteAudit
};

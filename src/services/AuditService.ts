import AuditLog, { IAuditLog } from '../models/AuditLog';
import Activity, { IActivity } from '../models/Activity';

export interface AuditQueryParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
    actionType?: string;
    activityId?: string;
    showDeleted?: boolean;
    userRole?: string;
}

// Creem un nou registre d'auditoria
export const createAuditLog = async (data: Partial<IAuditLog>) => {
    const audit = new AuditLog(data);
    return await audit.save();
};

// Obtenim un log concret pel seu ID, fent un .populate() per veure de quina activitat i de quin usuari parlem
export const getAuditLogById = async (auditId: string) => {
    return await AuditLog.findOne({ _id: auditId, deleted: false }).populate('activityId', 'title category').populate('authorId', 'name email');
};

// Llistat paginat amb el cercador combinat amb dos filtres
export const getAllAuditLogsPaginated = async (params: AuditQueryParams) => {
    // Pillem els paràmetres de paginació, default a pàgina 1 i 10 elements per no petar res
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 10);
    const skip = (page - 1) * limit;

    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder === 'asc' ? 1 : -1;

    const filter: Record<string, unknown> = {};

    if (params.userRole !== 'ADMIN' || params.showDeleted !== true) {
        filter.deleted = false;
    }

    // Filtre 1, consisteix en cerca per text
    if (params.search) {
        filter.$or = [
            { actionType: { $regex: params.search, $options: 'i' } },
            { 'changes.fieldName': { $regex: params.search, $options: 'i' } },
            { 'changes.newValue': { $regex: params.search, $options: 'i' } }
        ];
    }

    // Filtre 2, consisteix en filtrar per tipus d'acció
    if (params.actionType) {
        filter.actionType = params.actionType;
    }

    if (params.activityId) {
        filter.activityId = params.activityId;
    }

    const [logs, totalCount] = await Promise.all([
        AuditLog.find(filter)
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(limit)
            .populate('activityId', 'title category')
            .populate('authorId', 'name email'),
        AuditLog.countDocuments(filter)
    ]);

    return {
        data: logs,
        totalDocs: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page
    };
};

// Per revertir el canvi d'una activitat utilitzant l'estat anterior guardat al log
export const revertActivityChange = async (auditId: string, adminUserId: string) => {
    // Primer, busquem el log d'auditoria que ens demanen
    const auditLog = await AuditLog.findOne({ _id: auditId, deleted: false });
    if (!auditLog) {
        throw new Error('AUDIT_NOT_FOUND');
    }

    if (!auditLog.previousActivityState) {
        throw new Error('NO_PREVIOUS_STATE');
    }

    // Desprès, localitzem l'activitat associada a la base de dades
    const activity = await Activity.findOne({ _id: auditLog.activityId, deleted: false });
    if (!activity) {
        throw new Error('ACTIVITY_NOT_FOUND');
    }

    // Desprès, restaurem l'estat anterior de l'activitat amb el que teníem guardat
    const prevState = auditLog.previousActivityState;
    activity.title = prevState.title ?? activity.title;
    activity.description = prevState.description ?? activity.description;
    activity.category = prevState.category ?? activity.category;
    activity.subcategory = prevState.subcategory ?? activity.subcategory;
    activity.status = prevState.status ?? activity.status;

    await activity.save();

    // Per acabar, creem un nou log de tipus REVERT perquè quedi constancia del que hem fet
    const revertLog = new AuditLog({
        activityId: activity._id,
        authorId: adminUserId,
        actionType: 'REVERT',
        changes: [
            {
                fieldName: 'revert_action',
                oldValue: 'Estat modificat',
                newValue: `Revertit al registre d'auditoria ${auditId}`,
                isModified: true,
                changedAt: new Date()
            }
        ],
        previousActivityState: activity.toObject()
    });
    await revertLog.save();

    return { activity, revertLog };
};

// Soft delete d'un registre d'auditoria
export const softDeleteAuditLog = async (auditId: string) => {
    return await AuditLog.findByIdAndUpdate(auditId, { deleted: true, deletedAt: new Date() }, { new: true });
};

// Hard delete definitiu
export const hardDeleteAuditLog = async (auditId: string) => {
    return await AuditLog.findByIdAndDelete(auditId);
};

export default {
    createAuditLog,
    getAuditLogById,
    getAllAuditLogsPaginated,
    revertActivityChange,
    softDeleteAuditLog,
    hardDeleteAuditLog
};

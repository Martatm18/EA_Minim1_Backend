import mongoose, { Document, Schema } from 'mongoose';

export type AuditActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'REVERT';

// Subdocument de detalls de modificació amb tres tipus de dades diferents, en el nostre cas,tenim String, Boolean i Date.
export interface IChangeDetail {
    fieldName: string; // String
    oldValue?: string; // String
    newValue?: string; // String
    isModified: boolean; // Boolean
    changedAt: Date; // Date
}

export interface IAuditLog {
    activityId: mongoose.Types.ObjectId | string; // Relació amb Activity
    authorId: mongoose.Types.ObjectId | string; // Relació amb User, que és l'autor del canvi
    actionType: AuditActionType;
    changes: IChangeDetail[];
    previousActivityState?: Record<string, any>;
    deleted: boolean;
    deletedAt?: Date;
}

export interface IAuditLogModel extends IAuditLog, Document {}

const ChangeDetailSchema = new Schema(
    {
        fieldName: { type: String, required: true, trim: true },
        oldValue: { type: String },
        newValue: { type: String },
        isModified: { type: Boolean, required: true, default: true },
        changedAt: { type: Date, default: Date.now }
    },
    { _id: false }
);

const AuditLogSchema: Schema = new Schema(
    {
        activityId: { type: Schema.Types.ObjectId, ref: 'Activity', required: true },
        authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        actionType: {
            type: String,
            enum: ['CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'REVERT'],
            required: true
        },
        changes: [ChangeDetailSchema],
        previousActivityState: { type: Schema.Types.Mixed }, // Això guarda l'estat anterior de l'activitat abans de la modificació.
        deleted: { type: Boolean, default: false },
        deletedAt: { type: Date }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

AuditLogSchema.index({ activityId: 1, createdAt: -1 });
AuditLogSchema.index({ authorId: 1 });

export default mongoose.model<IAuditLogModel>('AuditLog', AuditLogSchema);

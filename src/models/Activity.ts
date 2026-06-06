import mongoose, { Document, Schema } from 'mongoose';

export type ActivityCategory = 'SPORT' | 'LEISURE';
export type ActivitySubcategory = 'BASKETBALL' | 'RUNNING' | 'ARCADE' | 'TCG_BOARDGAMES';
export type ActivityModality = 'CASUAL' | 'ORGANIZED';
export type ActivityStatus = 'OPEN' | 'FULL' | 'COMPLETED' | 'CANCELLED';

// Subdocumento de ubicación en estándar GeoJSON
export interface IActivityLocation {
    type: 'Point';
    coordinates?: [number, number]; // [longitud, latitud]
    addressName: string;
    isStoreLocation: boolean;
}

// Subdocumento de ruta en GeoJSON (Exclusivo de Running)
export interface IActivityRoute {
    distanceKm: number;
    paceTarget?: string;
    path: {
        type: 'LineString';
        coordinates: [number, number][]; // Array de [longitud, latitud]
    };
}

// Subdocumento de participante
export interface IActivityParticipant {
    userId: mongoose.Types.ObjectId | string;
    name: string;
    avatarUrl?: string;
    joinedAt: Date;
}

export interface IActivity {
    creatorId: mongoose.Types.ObjectId | string;
    title: string;
    description: string;
    category: ActivityCategory;
    subcategory: ActivitySubcategory;
    modality: ActivityModality;
    status: ActivityStatus;

    location?: IActivityLocation;
    route?: IActivityRoute;

    schedule: {
        startTime: Date;
        endTime: Date;
    };
    capacity: {
        minParticipants: number;
        maxParticipants: number;
    };
    pricing: {
        price: number;
        prizeInfo?: string;
    };

    participants: IActivityParticipant[];

    deleted: boolean;
    deletedAt?: Date;
}

export interface IActivityModel extends IActivity, Document {}

const ActivitySchema: Schema = new Schema(
    {
        creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        title: { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },
        category: { type: String, enum: ['SPORT', 'LEISURE'], required: true },
        subcategory: {
            type: String,
            enum: ['BASKETBALL', 'RUNNING', 'ARCADE', 'TCG_BOARDGAMES'],
            required: true
        },
        modality: { type: String, enum: ['CASUAL', 'ORGANIZED'], default: 'CASUAL' },
        status: {
            type: String,
            enum: ['OPEN', 'FULL', 'COMPLETED', 'CANCELLED'],
            default: 'OPEN'
        },
        location: {
            type: { type: String, enum: ['Point'], default: 'Point', required: true },
            coordinates: { type: [Number] },
            addressName: { type: String, required: true, trim: true },
            isStoreLocation: { type: Boolean, default: false }
        },
        route: {
            distanceKm: { type: Number },
            paceTarget: { type: String, trim: true },
            path: {
                type: { type: String, enum: ['LineString'], default: 'LineString' },
                coordinates: { type: [[Number]] }
            }
        },
        schedule: {
            startTime: { type: Date, required: true },
            endTime: { type: Date, required: true }
        },
        capacity: {
            minParticipants: { type: Number, default: 2, min: 1 },
            maxParticipants: { type: Number, required: true, min: 1 }
        },
        pricing: {
            price: { type: Number, default: 0, min: 0 },
            prizeInfo: { type: String, trim: true }
        },
        participants: [
            {
                userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
                name: { type: String, required: true },
                avatarUrl: { type: String },
                joinedAt: { type: Date, default: Date.now }
            }
        ],

        deleted: { type: Boolean, default: false },
        deletedAt: { type: Date }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

// Índice GeoEspecial 2dsphere para permitir búsquedas eficientes por cercanía en el mapa
ActivitySchema.index({ 'location.coordinates': '2dsphere' });

export default mongoose.model<IActivityModel>('Activity', ActivitySchema);

import express from 'express';
import http from 'http';
import mongoose from 'mongoose';
import { config } from './config/config';
import { Cors } from './middleware/Cors';
import Logging from './library/Logging';
import Logger from './middleware/Logger';
import ErrorHandler from './middleware/ErrorHandler';
import swaggerUi from 'swagger-ui-express'; // permite mostrar Swagger en el navegador.
import swaggerDocument from './config/swagger'; // importa el documento que hemos creado en swagger.ts
import cookieParser from 'cookie-parser';
import authRoutes from './routes/Auth';
import userRoutes from './routes/User';
import activityRoutes from './routes/Activity';
import reportRoutes from './routes/Report';
import auditRoutes from './routes/Audit'; // Importem les rutes d'auditoria
import { attachChat } from './services/ChatService';

const router = express();

/** Connect to Mongo */
mongoose
    .connect(config.mongo.url, { retryWrites: true, w: 'majority' })
    .then(() => {
        Logging.info('Mongo connected successfully.');
        StartServer();
    })
    .catch((error) => Logging.error(error));

/** Only Start Server if Mongoose Connects */
const StartServer = () => {
    router.use(Logger);

    router.use(express.urlencoded({ extended: true }));
    router.use(express.json());
    router.use(cookieParser());

    /** CORS */
    // Con cookies no vale origin '*': hay que indicar el origen del front y activar credentials
    router.use(Cors);

    /** Routes */
    router.use('/auth', authRoutes);
    router.use('/users', userRoutes);
    router.use('/activities', activityRoutes);
    router.use('/reports', reportRoutes);
    router.use('/audits', auditRoutes); // Registrem l'endpoint /audits
    router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    /** Healthcheck */
    /**
     * @openapi
     * /ping:
     *   get:
     *     tags: [Health]
     *     summary: Comprueba que la API está viva
     *     responses:
     *       200:
     *         description: La API responde
     *         content:
     *           application/json:
     *             example: { hello: world }
     */
    router.get('/ping', (req, res) => res.status(200).json({ hello: 'world' }));

    /** Error handling */
    router.use((req, res, next) => {
        next(new Error('Not found'));
    });

    router.use(ErrorHandler);

    const server = http.createServer(router);
    // El chat comparte el mismo servidor para usar la configuración común de la API.
    attachChat(server);
    server.listen(config.server.port, () => Logging.info(`Server is running on port ${config.server.port}`));
};

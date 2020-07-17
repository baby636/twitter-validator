import 'reflect-metadata';
import { createExpressServer } from 'routing-controllers';
import authorizationChecker from './authorizationChecker';
import RunController from '../controllers/RunController';
import JobController from '../controllers/JobController';
import HealthController from '../controllers/HealthController';

const application = createExpressServer({
  authorizationChecker,
  classTransformer: true,
  controllers: [RunController, JobController, HealthController],
});

export default application;

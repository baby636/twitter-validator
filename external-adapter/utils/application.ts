import 'reflect-metadata';
import { createExpressServer } from 'routing-controllers';
import TwitterController from '../controllers/TwitterController';
import HealthController from '../controllers/HealthController';
import ChainlinkAdapterErrorHandler from '../middlewares/ChainlinkAdapterErrorHandler';

const application = createExpressServer({
  defaultErrorHandler: false,
  classTransformer: true,
  controllers: [TwitterController, HealthController],
  middlewares: [ChainlinkAdapterErrorHandler],
});

export default application;

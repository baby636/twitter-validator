import 'reflect-metadata';
import { Get, JsonController } from 'routing-controllers';

@JsonController()
export default class HealthController {
  @Get('/health')
  get(): object {
    return {};
  }
}

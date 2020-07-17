import supertest from 'supertest';
import application from '../utils/application';

describe('HealthController', () => {
  it('should return empty json on GET /health', async () => {
    const res = await supertest(application).get('/health').send();
    expect(res.body).toEqual({});
    expect(res.status).toEqual(200);
  });
});

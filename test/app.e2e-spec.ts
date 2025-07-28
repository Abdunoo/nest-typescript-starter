import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('REST API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // Base API test
  // describe('App', () => {
  //   it('/ (GET)', () => {
  //     return request(app.getHttpServer())
  //       .get('/')
  //       .expect(200)
  //       .expect('Hello World!');
  //   });
  // });

  // Auth endpoints
  describe('Auth', () => {
    const testUser = {
      email: new Date().getTime().toString() + '@test.com',
      password: 'Test123!',
      name: 'Test User',
    };

    it('/auth/register (POST)', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('user.id');
          expect(res.body).toHaveProperty('user.email', testUser.email);
          expect(res.body).toHaveProperty('user.name', testUser.name);
        });
    });

    it('/auth/login (POST)', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
        });
    });

    describe('Protected Routes', () => {
      let authToken: string;

      beforeEach(async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: testUser.email,
            password: testUser.password,
          });

        authToken = response.body.access_token;
      });

      it('/auth/profile (GET)', () => {
        return request(app.getHttpServer())
          .get('/auth/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('user.id');
            expect(res.body).toHaveProperty('user.email', testUser.email);
            expect(res.body).toHaveProperty('user.name', testUser.name);
          });
      });
    });
  });
});


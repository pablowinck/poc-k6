import http from 'k6/http';
import { check, group, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '3s', target: 100 }, // ramp up to 50 users
    { duration: '3s', target: 200 }, // ramp up to 50 users
    { duration: '3s', target: 300 }, // ramp up to 50 users
    { duration: '5s', target: 300 }, // ramp up to 50 users
    { duration: '3s', target: 500 }, // ramp up to 50 users
  ],
};

export default function () {
  const baseUrl = 'http://localhost:9999'; 
  let userId;
  let nickname = `user-${Math.random().toString(36).substr(2, 9)}`;

  group('Create Person', () => {
    const payload = JSON.stringify({
      apelido: nickname,
      nome: `Test User ${Math.random()}`,
      nascimento: '2000-10-01',
      stack: ['Node', 'JavaScript'],
    });

    const params = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const res = http.post(`${baseUrl}/pessoas`, payload, params);

    check(res, {
      'status is 201': (r) => r.status === 200,
      'nickname is unique': (r) => JSON.parse(r.body).apelido === nickname,
      'name is not null': (r) => JSON.parse(r.body).nome !== null,
      'nickname is not null': (r) => JSON.parse(r.body).apelido !== null,
      'name is a string': (r) => typeof JSON.parse(r.body).nome === 'string',
      'stack is an array of strings': (r) => {
        const stack = JSON.parse(r.body).stack;
        return Array.isArray(stack) && stack.every((item) => typeof item === 'string');
      },
      'stack can be null': (r) => JSON.parse(r.body).stack === null || Array.isArray(JSON.parse(r.body).stack),
      'id is UUID and unique': (r) => {
        userId = JSON.parse(r.body).id;
        return /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/.test(userId);
      },
    });

    sleep(1);
  });

  group('Get Person by ID', () => {
    const res = http.get(`${baseUrl}/pessoas/${userId}`);
    check(res, {
      'status is 200': (r) => r.status === 200,
    });

    sleep(1);
  });

  group('Search Persons', () => {
    const res = http.get(`${baseUrl}/pessoas?t=${nickname.substring(0, nickname.length - 2)}`);
    check(res, {
      'status is 200': (r) => r.status === 200,
    });

    sleep(1);
  });

  group('Get Person Count', () => {
    const res = http.get(`${baseUrl}/contagem-pessoas`);
    check(res, {
      'status is 200': (r) => r.status === 200,
    });

    sleep(1);
  });
// http.get('http://localhost:3000/pessoas');
}

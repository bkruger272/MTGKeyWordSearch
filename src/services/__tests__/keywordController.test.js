const request = require('supertest');
const app = require('../../../app'); // This pulls in your Express config

describe('Keyword Controller API', () => {

  it('GET /api/keys should return an array of custom keys', async () => {
    const res = await request(app).get('/api/keys');
    
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/search should return definitions for multiple terms', async () => {
    // We test a comma-separated string just like your original search.js logic
    const res = await request(app).get('/api/search?q=Blitz,Fabricate');
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toBe(2);
    expect(res.body[0]).toHaveProperty('name');
    expect(res.body[0]).toHaveProperty('definition');
  });

  it('GET /api/search should return an empty array if no query is provided', async () => {
    const res = await request(app).get('/api/search?q=');
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual([]);
  });
});
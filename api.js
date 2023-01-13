const axios =require('axios');

const api = axios.create({
    baseURL: 'http://localhost:8080',
//    baseURL: 'https://bot-api-fly.fly.dev',
})

module.exports = api;

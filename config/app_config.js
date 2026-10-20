const PORT = Number(process.env.PORT) || 5000;

const CORS_ORIGINS = [
  'https://mern-frontend-datn.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173'
];

module.exports = {
  PORT,
  CORS_ORIGINS
};
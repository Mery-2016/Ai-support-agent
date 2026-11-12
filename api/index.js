/**
 * Vercel Serverless Function for COMBO.UZ Omnichannel AI Sales Manager API
 * Powers Instagram Direct, Telegram Bot, Web Chat, Neon PostgreSQL & Catalog
 */
const { handleApiRequest } = require('../services/api-handler');

module.exports = async (req, res) => {
  return handleApiRequest(req, res);
};

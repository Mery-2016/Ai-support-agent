/**
 * COMBO.UZ Dynamic Pricing Management Service
 * Manages official retail price list from Excel (01.10.2025) and enables updating
 * prices dynamically without touching application code.
 */
const fs = require('fs');
const path = require('path');

const RETAIL_FILE = path.resolve(__dirname, '..', 'data', 'retail_price_list.json');
const PRICING_FILE = path.resolve(__dirname, '..', 'data', 'pricing.json');

function loadJson(filePath, defaultValue = null) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (err) {
    console.error(`Error loading JSON from ${filePath}:`, err.message);
  }
  return defaultValue;
}

function saveJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error saving JSON to ${filePath}:`, err.message);
    return false;
  }
}

// In-memory cache
let cachedRetail = loadJson(RETAIL_FILE, {});
let cachedPricing = loadJson(PRICING_FILE, {});

function getRetailPricing() {
  if (!cachedRetail || !cachedRetail.tables) {
    cachedRetail = loadJson(RETAIL_FILE, {});
  }
  return cachedRetail;
}

function getOfficialPricing() {
  if (!cachedPricing || !cachedPricing.categories) {
    cachedPricing = loadJson(PRICING_FILE, {});
  }
  return cachedPricing;
}

function updateRetailPricing(newData) {
  if (!newData || typeof newData !== 'object') {
    throw new Error('Invalid pricing data format');
  }

  // Preserve metadata
  newData.lastUpdated = new Date().toISOString();
  newData.source = newData.source || 'ADMIN_DYNAMIC_UPDATE';

  cachedRetail = newData;
  saveJson(RETAIL_FILE, newData);
  return { success: true, message: 'Розничный прайс-лист успешно обновлен без перезапуска системы', data: cachedRetail };
}

function updateOfficialPricing(newData) {
  if (!newData || typeof newData !== 'object') {
    throw new Error('Invalid pricing data format');
  }

  cachedPricing = newData;
  saveJson(PRICING_FILE, newData);
  return { success: true, message: 'Официальный прайс-лист успешно сохранен', data: cachedPricing };
}

module.exports = {
  getRetailPricing,
  getOfficialPricing,
  updateRetailPricing,
  updateOfficialPricing
};

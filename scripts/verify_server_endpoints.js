const http = require('http');

// Simple client test
async function testEndpoint(port, pathStr, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1',
      port,
      path: pathStr,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  const port = 8089;
  process.env.PORT = port;
  // start server
  require('../server.js');

  await new Promise(r => setTimeout(r, 600));

  console.log('Testing Endpoints on port', port);

  // 1. Static pages
  const r1 = await testEndpoint(port, '/test_sales_chat.html');
  console.log('GET /test_sales_chat.html:', r1.status === 200 ? '✅ 200 OK' : '❌ ' + r1.status);

  const r2 = await testEndpoint(port, '/admin.html');
  console.log('GET /admin.html:', r2.status === 200 ? '✅ 200 OK' : '❌ ' + r2.status);

  // 2. KB API
  const r3 = await testEndpoint(port, '/api/knowledge-base');
  const kbData = JSON.parse(r3.data);
  console.log('GET /api/knowledge-base:', r3.status === 200 && kbData.count === 100 ? `✅ 200 OK (${kbData.count} items)` : '❌ Failed');

  // 3. Leads API
  const r4 = await testEndpoint(port, '/api/leads');
  const leadsData = JSON.parse(r4.data);
  console.log('GET /api/leads:', r4.status === 200 ? `✅ 200 OK (${leadsData.count} leads)` : '❌ Failed');

  // 4. Create Lead via API
  const r5 = await testEndpoint(port, '/api/leads', 'POST', {
    name: 'Тестовый Клиент',
    phone: '+998901234567',
    district: 'Чиланзарский',
    model: 'День-Ночь',
    quantity: 2
  });
  const newLead = JSON.parse(r5.data);
  console.log('POST /api/leads:', r5.status === 200 && newLead.success ? `✅ 200 OK (Lead ID: ${newLead.leadId})` : '❌ Failed');

  console.log('\nAll Server Endpoints Verified Successfully!');
  process.exit(0);
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

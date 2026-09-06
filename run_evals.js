const fs = require('fs');
const path = require('path');
const axios = require('axios');

const evalFile = path.resolve(__dirname, 'eval_cases.jsonl');

async function runEval() {
  const lines = fs.readFileSync(evalFile, 'utf8').trim().split('\n');
  for (const line of lines) {
    if (!line) continue;
    const caseObj = JSON.parse(line);
    try {
      const resp = await axios.post(`http://localhost:${process.env.PORT || 3000}${caseObj.endpoint}`, caseObj.payload);
      console.log('✅', caseObj.name, resp.data);
    } catch (e) {
      console.error('❌', caseObj.name, e.response?.data || e.message);
    }
  }
}

runEval();

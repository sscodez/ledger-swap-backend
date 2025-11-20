#!/usr/bin/env node

const axios = require('axios');
const readline = require('readline');

const BASE_URL = 'http://localhost:8080/api/email-service';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function getAuthToken() {
  console.log('🔐 Authentication required for email service API');
  console.log('You can either:');
  console.log('1. Use a JWT token from login');
  console.log('2. Skip auth (will show mock mode results)');
  
  const choice = await question('\nEnter choice (1 for token, 2 to skip): ');
  
  if (choice === '1') {
    const token = await question('Enter JWT token: ');
    return token.trim();
  }
  
  return null;
}

async function makeRequest(endpoint, method = 'GET', data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    if (error.response) {
      return { 
        success: false, 
        error: error.response.data, 
        status: error.response.status 
      };
    }
    return { success: false, error: error.message };
  }
}

async function healthCheck(token) {
  console.log('\n🔍 Checking Email Service Health...');
  const result = await makeRequest('/health', 'GET', null, token);
  
  if (result.success) {
    console.log('✅ Email Service Health:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ Health Check Failed:', result.error);
  }
  
  return result;
}

async function getConfig(token) {
  console.log('\n⚙️ Getting Email Service Configuration...');
  const result = await makeRequest('/config', 'GET', null, token);
  
  if (result.success) {
    console.log('✅ Email Service Config:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ Config Failed:', result.error);
  }
  
  return result;
}

async function sendTestEmail(token) {
  console.log('\n📧 Send Test Email');
  
  const email = await question('Enter recipient email: ');
  const type = await question('Enter email type (test/password_reset/email_verification/welcome/support) [test]: ') || 'test';
  const subject = await question('Enter custom subject (optional): ');
  const message = await question('Enter custom message (optional): ');
  
  const data = {
    to: email,
    type: type
  };
  
  if (subject) data.subject = subject;
  if (message) data.message = message;
  
  console.log('\n📤 Sending test email...');
  const result = await makeRequest('/test', 'POST', data, token);
  
  if (result.success) {
    console.log('✅ Test Email Sent:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ Test Email Failed:', result.error);
  }
  
  return result;
}

async function executeCommand(token) {
  console.log('\n⚡ Execute Email Service Command');
  console.log('Available commands:');
  console.log('1. health_check - Check service health');
  console.log('2. verify_connection - Verify SMTP connection');
  console.log('3. send_bulk_test - Send bulk test emails');
  
  const choice = await question('Enter command number (1-3): ');
  
  let command, parameters = {};
  
  switch (choice) {
    case '1':
      command = 'health_check';
      break;
    case '2':
      command = 'verify_connection';
      break;
    case '3':
      command = 'send_bulk_test';
      const recipients = await question('Enter recipient emails (comma-separated): ');
      const emailType = await question('Enter email type [test]: ') || 'test';
      parameters = {
        recipients: recipients.split(',').map(email => email.trim()),
        emailType: emailType
      };
      break;
    default:
      console.log('❌ Invalid choice');
      return;
  }
  
  const data = { command, parameters };
  
  console.log('\n⚡ Executing command...');
  const result = await makeRequest('/execute', 'POST', data, token);
  
  if (result.success) {
    console.log('✅ Command Executed:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ Command Failed:', result.error);
  }
  
  return result;
}

async function showMenu() {
  console.log('\n📧 Email Service API CLI');
  console.log('========================');
  console.log('1. Health Check');
  console.log('2. Get Configuration');
  console.log('3. Send Test Email');
  console.log('4. Execute Command');
  console.log('5. Exit');
  
  return await question('\nSelect option (1-5): ');
}

async function main() {
  console.log('🚀 LedgerSwap Email Service API CLI');
  console.log('===================================');
  
  // Check if API is running
  try {
    await axios.get('http://localhost:8080/health');
    console.log('✅ API is running on http://localhost:8080');
  } catch (error) {
    console.log('❌ API is not running. Please start the backend server first.');
    process.exit(1);
  }
  
  const token = await getAuthToken();
  
  if (!token) {
    console.log('\n⚠️ Running without authentication - some features may be limited');
  }
  
  while (true) {
    const choice = await showMenu();
    
    switch (choice) {
      case '1':
        await healthCheck(token);
        break;
      case '2':
        await getConfig(token);
        break;
      case '3':
        await sendTestEmail(token);
        break;
      case '4':
        await executeCommand(token);
        break;
      case '5':
        console.log('👋 Goodbye!');
        rl.close();
        return;
      default:
        console.log('❌ Invalid choice. Please select 1-5.');
    }
    
    await question('\nPress Enter to continue...');
  }
}

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  rl.close();
  process.exit(0);
});

main().catch(console.error);

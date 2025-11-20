const axios = require('axios');

const BASE_URL = 'http://localhost:8080';

async function testEmailRoute() {
  console.log('🚀 Testing Email Service Route');
  console.log('==============================\n');

  // Test different email types
  const tests = [
    {
      name: 'Welcome Email',
      data: {
        to: 'ssameershah1200@gmail.com',
        type: 'welcome'
      }
    },
    {
      name: 'Password Reset Email',
      data: {
        to: 'ssameershah1200@gmail.com',
        type: 'password_reset'
      }
    },
    {
      name: 'Support Email',
      data: {
        to: 'ssameershah1200@gmail.com',
        type: 'support',
        subject: 'Test Support Email from API',
        message: 'This is a test support email sent via the test route.'
      }
    }
  ];

  for (const test of tests) {
    try {
      console.log(`📧 Testing: ${test.name}`);
      console.log(`📬 To: ${test.data.to}`);
      console.log(`📝 Type: ${test.data.type}`);
      
      const response = await axios.post(`${BASE_URL}/api/test-email`, test.data, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Success:', response.data.message);
      console.log('📄 Details:', JSON.stringify(response.data.details, null, 2));
      
    } catch (error) {
      if (error.response) {
        console.log('❌ Error:', error.response.status, error.response.data);
      } else {
        console.log('❌ Network Error:', error.message);
      }
    }
    
    console.log(''); // Empty line for spacing
  }

  console.log('🎉 Email testing completed!');
  console.log('\n📝 Note: Check your server console for email content if SMTP is not configured.');
}

// Test if server is running first
async function checkServer() {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is running:', response.data.status);
    return true;
  } catch (error) {
    console.log('❌ Server is not running. Please start the backend server first.');
    console.log('   Run: npm run dev');
    return false;
  }
}

// Run the tests
async function main() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    console.log('');
    await testEmailRoute();
  }
}

main().catch(console.error);

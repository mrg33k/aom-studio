#!/usr/bin/env node

// Test script for the analyze-logs API endpoint
// Usage: node test-analyze-logs.js

const testLog = `Error: Module not found: can't resolve 'react'
  at /Users/aom-inhouse/aom-studio-transfer/aom-studio/node_modules/webpack/lib/Compilation.js:2456:12
  at /Users/aom-inhouse/aom-studio-transfer/aom-studio/node_modules/webpack/lib/NormalModuleFactory.js:795:3
  at eval (eval at create (/Users/aom-inhouse/aom-studio-transfer/aom-studio/node_modules/tapable/lib/HookCodeFactory.js:33:10), <anonymous>:10:1)
  at /Users/aom-inhouse/aom-studio-transfer/aom-studio/node_modules/webpack/lib/NormalModuleFactory.js:275:22
  at /Users/aom-inhouse/aom-studio-transfer/aom-studio/node_modules/enhanced-resolve/lib/Resolver.js:213:14
  at /Users/aom-inhouse/aom-studio-transfer/aom-studio/node_modules/enhanced-resolve/lib/Resolver.js:285:5
  at eval (eval at create (/Users/aom-inhouse/aom-studio-transfer/aom-studio/node_modules/tapable/lib/HookCodeFactory.js:33:10), <anonymous>:13:1)
  at /Users/aom-inhouse/aom-studio-transfer/aom-studio/node_modules/enhanced-resolve/lib/DescriptionFilePlugin.js:87:43
  at /Users/aom-inhouse/aom-studio-transfer/aom-studio/node_modules/enhanced-resolve/lib/Resolver.js:213:14
  at /Users/aom-inhouse/aom-studio-transfer/aom-studio/node_modules/enhanced-resolve/lib/Resolver.js:285:5

Failed to compile.

ModuleNotFoundError: Module not found: Error: can't resolve 'react' in '/Users/aom-inhouse/aom-studio-transfer/aom-studio/src/dashboard/components'
Did you mean './react'?
Requests that should resolve in the current directory need to start with './'.
Requests that start with a name are treated as module requests and resolve within module directories (node_modules).`;

async function testAnalyzeLogs() {
  console.log('Testing analyze-logs API endpoint...\n');
  
  // Test with direct log content
  console.log('Test 1: Direct log content analysis');
  console.log('Log content (truncated):', testLog.substring(0, 200) + '...\n');
  
  const testPayload = {
    log_content: testLog
  };
  
  try {
    // Note: In a real test, you would make an HTTP request to the deployed endpoint
    // For local testing, we'll simulate what the response would look like
    console.log('Expected request format:');
    console.log(JSON.stringify({
      method: 'POST',
      url: 'https://aheadofmarket.com/api/dashboard/analyze-logs',
      headers: { 'Content-Type': 'application/json' },
      body: testPayload
    }, null, 2));
    
    console.log('\nExpected response format:');
    console.log(JSON.stringify({
      summary: 'Build failed due to missing React dependency.',
      actionable_steps: [
        'Run `npm install react`',
        'Check package.json for correct dependencies',
        'Verify node_modules exists and is not corrupted',
        'Clear build cache and restart development server'
      ]
    }, null, 2));
    
    console.log('\n---\n');
    
    // Test 2: URL-based log analysis
    console.log('Test 2: URL-based log analysis');
    console.log('Expected request with log_source_url:');
    console.log(JSON.stringify({
      method: 'POST',
      url: 'https://aheadofmarket.com/api/dashboard/analyze-logs',
      headers: { 'Content-Type': 'application/json' },
      body: {
        log_source_url: 'https://example.com/logs/build-error-123.txt'
      }
    }, null, 2));
    
    console.log('\n---\n');
    console.log('To test the actual endpoint:');
    console.log('1. Deploy the API to Vercel');
    console.log('2. Run: curl -X POST https://aheadofmarket.com/api/dashboard/analyze-logs \\');
    console.log('     -H "Content-Type: application/json" \\');
    console.log('     -d \'{"log_content": "Error: Module not found..."}\'');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testAnalyzeLogs().catch(console.error);
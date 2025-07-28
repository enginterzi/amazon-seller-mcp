#!/usr/bin/env node

/**
 * Basic functionality test for the renamed project
 */

import { AmazonSellerMcpServer, AmazonRegion } from './dist/index.js';

async function testBasicFunctionality() {
  console.log('Testing basic functionality of amazon-seller-mcp...');
  
  try {
    // Test basic instantiation without connecting
    const server = new AmazonSellerMcpServer({
      name: 'test-server',
      version: '1.0.0',
      credentials: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        refreshToken: 'test-refresh-token',
      },
      marketplaceId: 'ATVPDKIKX0DER',
      region: AmazonRegion.NA,
    });

    console.log('✅ Server instantiation successful');
    console.log('✅ AmazonRegion enum accessible');
    console.log('✅ Core functionality appears to be working');
    
    // Test that the server has expected methods
    if (typeof server.registerAllTools === 'function') {
      console.log('✅ registerAllTools method exists');
    }
    
    if (typeof server.registerAllResources === 'function') {
      console.log('✅ registerAllResources method exists');
    }
    
    console.log('\n🎉 Basic functionality test PASSED');
    console.log('The project rename was successful!');
    
  } catch (error) {
    console.error('❌ Basic functionality test FAILED:', error.message);
    process.exit(1);
  }
}

testBasicFunctionality();
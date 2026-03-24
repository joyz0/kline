/**
 * HTTP API 测试脚本
 * 
 * 测试浏览器控制服务的 HTTP API 接口
 */

const BASE_URL = 'http://127.0.0.1:18791';

// 测试配置
const TEST_CONFIG = {
  profile: 'default',
  testUrl: 'https://example.com',
  navigateUrl: 'https://www.bing.com',
  screenshotPath: './test-api-screenshot.png',
};

interface ApiResponse {
  success?: boolean;
  error?: string;
  message?: string;
  [key: string]: unknown;
}

async function callApi(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<ApiResponse> {
  const url = new URL(path, BASE_URL);
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body && method.toUpperCase() !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}`);
  }

  return data;
}

async function runApiTests() {
  console.log('🔍 开始 HTTP API 测试\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  const results: { name: string; passed: boolean; error?: string }[] = [];

  // 测试 1: 启动浏览器
  console.log('📋 测试 1: 启动浏览器 (POST /start)');
  try {
    const result = await callApi('POST', '/start', { profile: TEST_CONFIG.profile });
    console.log('✅ 通过');
    console.log(`   响应：${result.message}\n`);
    results.push({ name: '启动浏览器', passed: true });
  } catch (error) {
    console.log('❌ 失败');
    console.log(`   错误：${error instanceof Error ? error.message : 'Unknown error'}\n`);
    results.push({ 
      name: '启动浏览器', 
      passed: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }

  // 等待浏览器启动
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 测试 2: 获取状态
  console.log('📋 测试 2: 获取状态 (GET /status)');
  try {
    const result = await callApi('GET', `/status?profile=${TEST_CONFIG.profile}`);
    console.log('✅ 通过');
    console.log(`   浏览器运行状态：${result.running ? '运行中' : '已停止'}`);
    console.log(`   配置文件：${result.profile}\n`);
    results.push({ name: '获取状态', passed: true });
  } catch (error) {
    console.log('❌ 失败');
    console.log(`   错误：${error instanceof Error ? error.message : 'Unknown error'}\n`);
    results.push({ 
      name: '获取状态', 
      passed: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }

  // 测试 3: 打开网页
  console.log('📋 测试 3: 打开网页 (POST /tabs/open)');
  try {
    const result = await callApi('POST', '/tabs/open', {
      url: TEST_CONFIG.testUrl,
      profile: TEST_CONFIG.profile,
    });
    console.log('✅ 通过');
    console.log(`   Target ID: ${result.targetId}`);
    console.log(`   页面标题：${result.title}\n`);
    results.push({ name: '打开网页', passed: true, error: result.targetId as string });
  } catch (error) {
    console.log('❌ 失败');
    console.log(`   错误：${error instanceof Error ? error.message : 'Unknown error'}\n`);
    results.push({ 
      name: '打开网页', 
      passed: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }

  // 等待页面加载
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 测试 4: 列出标签页
  console.log('📋 测试 4: 列出标签页 (GET /tabs)');
  try {
    const result = await callApi('GET', `/tabs?profile=${TEST_CONFIG.profile}`);
    const tabs = result.tabs as Array<{ targetId: string; url: string; title: string }>;
    console.log('✅ 通过');
    console.log(`   标签页数量：${tabs.length}`);
    if (tabs.length > 0) {
      console.log('   标签页列表:');
      tabs.forEach((tab, i) => {
        console.log(`   ${i + 1}. [${tab.targetId}] ${tab.title}`);
        console.log(`      URL: ${tab.url}`);
      });
    }
    console.log();
    results.push({ name: '列出标签页', passed: true });
  } catch (error) {
    console.log('❌ 失败');
    console.log(`   错误：${error instanceof Error ? error.message : 'Unknown error'}\n`);
    results.push({ 
      name: '列出标签页', 
      passed: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }

  // 测试 5: 获取页面快照
  console.log('📋 测试 5: 获取页面快照 (GET /snapshot)');
  try {
    const result = await callApi('GET', `/snapshot?profile=${TEST_CONFIG.profile}&format=ai`);
    console.log('✅ 通过');
    console.log(`   页面标题：${result.title}`);
    console.log(`   页面 URL: ${result.url}`);
    const snapshot = result.snapshot as string;
    console.log(`   快照预览：${snapshot.substring(0, 100)}...\n`);
    results.push({ name: '获取页面快照', passed: true });
  } catch (error) {
    console.log('❌ 失败');
    console.log(`   错误：${error instanceof Error ? error.message : 'Unknown error'}\n`);
    results.push({ 
      name: '获取页面快照', 
      passed: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }

  // 测试 6: 截图
  console.log('📋 测试 6: 截图 (POST /screenshot)');
  try {
    const response = await fetch(`${BASE_URL}/screenshot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        profile: TEST_CONFIG.profile,
        fullPage: false,
        type: 'png',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const fs = await import('fs');
    fs.writeFileSync(TEST_CONFIG.screenshotPath, Buffer.from(buffer));
    
    console.log('✅ 通过');
    console.log(`   截图已保存到：${TEST_CONFIG.screenshotPath}`);
    console.log(`   文件大小：${(buffer.byteLength / 1024).toFixed(2)} KB\n`);
    results.push({ name: '截图', passed: true });
  } catch (error) {
    console.log('❌ 失败');
    console.log(`   错误：${error instanceof Error ? error.message : 'Unknown error'}\n`);
    results.push({ 
      name: '截图', 
      passed: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }

  // 测试 7: 导航
  console.log('📋 测试 7: 导航 (POST /navigate)');
  try {
    const result = await callApi('POST', '/navigate', {
      url: TEST_CONFIG.navigateUrl,
      profile: TEST_CONFIG.profile,
    });
    console.log('✅ 通过');
    console.log(`   新页面标题：${result.title}\n`);
    results.push({ name: '导航', passed: true });
  } catch (error) {
    console.log('❌ 失败');
    console.log(`   错误：${error instanceof Error ? error.message : 'Unknown error'}\n`);
    results.push({ 
      name: '导航', 
      passed: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }

  // 等待导航完成
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 测试 8: SSRF 防护测试
  console.log('📋 测试 8: SSRF 防护测试 (应该失败)');
  try {
    await callApi('POST', '/tabs/open', {
      url: 'http://192.168.1.1',
      profile: TEST_CONFIG.profile,
    });
    console.log('❌ 失败 - SSRF 防护未生效');
    results.push({ name: 'SSRF 防护', passed: false, error: 'Should have blocked private IP' });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid URL')) {
      console.log('✅ 通过 - SSRF 防护正常工作');
      console.log(`   错误信息：${error.message}\n`);
      results.push({ name: 'SSRF 防护', passed: true });
    } else {
      console.log('❌ 失败 - 错误类型不匹配');
      console.log(`   错误：${error instanceof Error ? error.message : 'Unknown error'}\n`);
      results.push({ 
        name: 'SSRF 防护', 
        passed: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  // 测试 9: 停止浏览器
  console.log('📋 测试 9: 停止浏览器 (POST /stop)');
  try {
    const result = await callApi('POST', '/stop', { profile: TEST_CONFIG.profile });
    console.log('✅ 通过');
    console.log(`   响应：${result.message}\n`);
    results.push({ name: '停止浏览器', passed: true });
  } catch (error) {
    console.log('❌ 失败');
    console.log(`   错误：${error instanceof Error ? error.message : 'Unknown error'}\n`);
    results.push({ 
      name: '停止浏览器', 
      passed: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }

  // 测试总结
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试总结');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`\n总计：${results.length} 个测试`);
  console.log(`✅ 通过：${passed}`);
  console.log(`❌ 失败：${failed}`);
  console.log(`成功率：${((passed / results.length) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.log('失败的测试:');
    results.filter(r => !r.passed).forEach((result, i) => {
      console.log(`  ${i + 1}. ${result.name}: ${result.error}`);
    });
    console.log();
  }

  console.log('='.repeat(50));
  console.log(passed === results.length ? '🎉 所有测试通过!' : '💥 部分测试失败\n');

  return passed === results.length;
}

// 运行测试
runApiTests().then((success) => {
  process.exit(success ? 0 : 1);
});

/**
 * Playwright CDP 控制测试脚本
 * 
 * 测试通过 Playwright 连接已存在的 Chrome 浏览器
 */

import { chromium } from 'playwright';

const CDP_URL = 'http://127.0.0.1:18800';

async function testPlaywrightCDP() {
  console.log('🔍 开始 Playwright CDP 控制测试...\n');
  console.log(`CDP URL: ${CDP_URL}\n`);

  let browser;

  try {
    // 步骤 1: 连接 CDP
    console.log('📌 步骤 1: 连接 CDP');
    browser = await chromium.connectOverCDP(CDP_URL);
    console.log('✅ CDP 连接成功\n');

    // 步骤 2: 获取浏览器信息
    console.log('📋 步骤 2: 获取浏览器信息');
    const browserContexts = browser.contexts();
    console.log(`   当前上下文数：${browserContexts.length}`);
    
    if (browserContexts.length > 0) {
      const context = browserContexts[0];
      const pages = context.pages();
      console.log(`   默认上下文页面数：${pages.length}\n`);
    }

    // 步骤 3: 创建新页面
    console.log('📄 步骤 3: 创建新页面');
    const context = browser.contexts()[0] || await browser.newContext();
    const page = await context.newPage();
    console.log('✅ 页面创建成功\n');

    // 步骤 4: 导航到网页
    console.log('🌐 步骤 4: 导航到 example.com');
    const response = await page.goto('https://example.com', {
      waitUntil: 'domcontentloaded',
    });
    console.log(`✅ 导航成功，状态码：${response?.status()}`);
    console.log(`   页面标题：${await page.title()}\n`);

    // 步骤 5: 获取页面内容
    console.log('📖 步骤 5: 获取页面内容');
    const content = await page.content();
    console.log(`✅ 页面 HTML 长度：${content.length} 字符\n`);

    // 步骤 6: 截图
    console.log('📸 步骤 6: 截图');
    await page.screenshot({ 
      path: './test-playwright-cdp.png',
      fullPage: false,
    });
    console.log('✅ 截图已保存到：./test-playwright-cdp.png\n');

    // 步骤 7: 执行 JavaScript
    console.log('⚡ 步骤 7: 执行 JavaScript');
    const dimensions = await page.evaluate(() => {
      return {
        width: window.innerWidth,
        height: window.innerHeight,
        userAgent: navigator.userAgent,
      };
    });
    console.log('✅ 执行结果:');
    console.log(`   窗口尺寸：${dimensions.width} x ${dimensions.height}`);
    console.log(`   User Agent: ${dimensions.userAgent.substring(0, 50)}...\n`);

    // 步骤 8: 测试元素查询
    console.log('🔍 步骤 8: 元素查询');
    const heading = page.locator('h1');
    const headingText = await heading.textContent();
    console.log(`✅ H1 元素内容：${headingText}\n`);

    // 步骤 9: 测试网络请求监控
    console.log('📡 步骤 9: 网络请求监控测试');
    const requests: string[] = [];
    page.on('request', request => {
      requests.push(request.url());
    });

    await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded' });
    console.log(`✅ 捕获 ${requests.length} 个网络请求`);
    console.log(`   前 3 个请求:`);
    requests.slice(0, 3).forEach((url, i) => {
      console.log(`   ${i + 1}. ${url.substring(0, 60)}...`);
    });
    console.log();

    // 步骤 10: 测试 Cookie 操作
    console.log('🍪 步骤 10: Cookie 操作测试');
    const cookies = await context.cookies();
    console.log(`✅ 当前 Cookie 数：${cookies.length}`);
    
    // 添加测试 Cookie
    await context.addCookies([{
      name: 'test_cookie',
      value: 'test_value',
      domain: '.google.com',
      path: '/',
    }]);
    console.log('   已添加测试 Cookie\n');

    // 步骤 11: 性能测试
    console.log('⏱️  步骤 11: 页面加载性能测试');
    const metrics = await page.metrics();
    console.log('✅ 性能指标:');
    console.log(`   JS Heap 大小：${(metrics.JSHeapUsedSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   文档数：${metrics.Documents}`);
    console.log(`   帧数：${metrics.Frames}`);
    console.log(`   节点数：${metrics.Nodes}`);
    console.log();

    // 步骤 12: 多标签页测试
    console.log('📑 步骤 12: 多标签页测试');
    const page2 = await context.newPage();
    await page2.goto('https://www.bing.com', { waitUntil: 'domcontentloaded' });
    
    const allPages = context.pages();
    console.log(`✅ 当前标签页数：${allPages.length}`);
    
    // 切换页面
    await page.bringToFront();
    console.log('   已切换到第一个页面\n');

    // 等待一段时间
    console.log('⏳ 等待 3 秒...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 清理
    console.log('\n🧹 清理资源');
    await page2.close();
    console.log('   已关闭第二个页面');
    
    await page.close();
    console.log('   已关闭第一个页面');
    
    await browser.close();
    console.log('   已关闭浏览器连接\n');

    console.log('✅ 所有测试完成!\n');
    return true;
  } catch (error) {
    console.error('\n❌ 测试失败:');
    console.error(error);
    
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      console.log('\n可能的原因:');
      console.log('1. 浏览器未启动');
      console.log('2. CDP 端口配置错误');
      console.log('\n解决方案:');
      console.log('1. 运行：pnpm dev 或 kline browser start');
      console.log('2. 检查 .kline/kline.json5 中的 cdpPort 配置（默认 18800）');
      console.log('3. 测试 CDP 端口：curl http://127.0.0.1:18800/json/version');
    }
    
    if (browser) {
      await browser.close().catch(() => {});
    }
    
    return false;
  }
}

// 运行测试
testPlaywrightCDP().then((success) => {
  console.log(success ? '🎉 测试成功!' : '💥 测试失败!');
  process.exit(success ? 0 : 1);
});

/**
 * CDP 连接测试脚本
 *
 * 测试步骤：
 * 1. 检查 CDP 端口是否可访问
 * 2. 获取浏览器版本信息
 * 3. 列出可用标签页
 * 4. 测试 WebSocket 连接
 */

import {
  fetchCdpJson,
  connectToCDP,
  sendCDPCommand,
} from '../../src/browser/cdp-helpers.js';

const CDP_PORT = 18800;
const CDP_URL = `http://127.0.0.1:${CDP_PORT}`;

async function testCdpConnection() {
  console.log('🔍 开始 CDP 连接测试...\n');
  console.log(`CDP URL: ${CDP_URL}\n`);

  try {
    // 测试 1: 检查浏览器版本信息
    console.log('📋 测试 1: 获取浏览器版本信息');
    console.log('请求:', `${CDP_URL}/json/version`);

    const version = await fetchCdpJson<{
      Browser: string;
      'Protocol-Version': string;
      'User-Agent': string;
      'V8-Version': string;
      'WebKit-Version': string;
      webSocketDebuggerUrl: string;
    }>(CDP_URL, '/json/version');

    console.log('✅ 成功获取版本信息:');
    console.log(`   浏览器：${version.Browser}`);
    console.log(`   协议版本：${version['Protocol-Version']}`);
    console.log(`   WebKit 版本：${version['WebKit-Version']}`);
    console.log(`   WebSocket URL: ${version.webSocketDebuggerUrl}\n`);

    // 测试 2: 列出可用标签页
    console.log('📑 测试 2: 列出可用标签页');
    console.log('请求:', `${CDP_URL}/json/list`);

    const targets = await fetchCdpJson<
      Array<{
        description: string;
        id: string;
        title: string;
        type: string;
        url: string;
        webSocketDebuggerUrl: string;
      }>
    >(CDP_URL, '/json/list');

    console.log(`✅ 找到 ${targets.length} 个标签页:`);

    for (const target of targets) {
      console.log(`   - [${target.type}] ${target.title || 'Untitled'}`);
      console.log(`     URL: ${target.url}`);
      console.log(`     ID: ${target.id}`);
    }
    console.log();

    // 测试 3: WebSocket 连接测试
    console.log('🔌 测试 3: WebSocket 连接测试');

    const ws = await connectToCDP(CDP_URL);
    console.log('✅ WebSocket 连接成功');

    // 测试 4: 发送 CDP 命令
    console.log('\n📤 测试 4: 发送 CDP 命令');
    console.log('命令: Page.enable');

    const enableResult = await sendCDPCommand(ws, 'Page.enable');
    console.log('✅ Page.enable 成功:', enableResult);

    // 测试 5: 获取页面信息
    console.log('\n📄 测试 5: 获取当前页面信息');
    console.log('命令: Runtime.evaluate (document.title)');

    const titleResult = await sendCDPCommand(ws, 'Runtime.evaluate', {
      expression: 'document.title',
    });

    console.log(`✅ 页面标题：${titleResult.result.value || 'N/A'}`);

    // 测试 6: 导航到指定 URL
    console.log('\n🌐 测试 6: 导航测试');
    console.log('命令: Page.navigate (https://example.com)');

    const navigateResult = await sendCDPCommand(ws, 'Page.navigate', {
      url: 'https://example.com',
    });

    console.log(`✅ 导航结果：${navigateResult.frameId ? '成功' : '失败'}`);
    console.log(`   Frame ID: ${navigateResult.frameId}`);

    // 等待页面加载
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 再次获取标题
    const newTitleResult = await sendCDPCommand(ws, 'Runtime.evaluate', {
      expression: 'document.title',
    });

    console.log(`   新页面标题：${newTitleResult.result.value || 'N/A'}`);

    // 关闭 WebSocket 连接
    ws.close();
    console.log('\n✅ 所有测试完成!\n');

    return true;
  } catch (error) {
    console.error('\n❌ 测试失败:');
    console.error(error);
    console.log('\n可能的原因:');
    console.log('1. 浏览器未启动');
    console.log(`2. CDP 端口 ${CDP_PORT} 未正确配置`);
    console.log('3. 防火墙阻止了连接');
    console.log('\n解决方案:');
    console.log('1. 运行：pnpm dev 启动浏览器服务');
    console.log('2. 检查 .kline/kline.json5 中的 cdpPort 配置');
    console.log('3. 使用 curl 测试：curl http://127.0.0.1:18800/json/version');

    return false;
  }
}

// 运行测试
testCdpConnection().then((success) => {
  process.exit(success ? 0 : 1);
});

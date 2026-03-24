import { getConfig } from '../config/index.js'
import type { BrowserConfig, BrowserProfile } from './types.js'

export function loadBrowserConfig(): BrowserConfig {
  try {
    // 从统一配置加载器获取
    const configLoader = getConfig()
    return configLoader.getBrowserConfig()
  } catch (error) {
    console.error('Failed to load browser config from loader:', error)
    return createDefaultConfig()
  }
}

function createDefaultConfig(): BrowserConfig {
  return {
    enabled: true,
    defaultProfile: 'default',
    profiles: {
      default: {
        name: 'default',
        cdpPort: 18800,
        userDataDir: './data/browsers/default/user-data',
        headless: false,
        extraArgs: ['--disable-gpu', '--no-sandbox'],
        color: '#FF4500',
      },
    },
  }
}

export async function saveBrowserConfig(config: BrowserConfig): Promise<void> {
  const configLoader = getConfig()
  configLoader.saveConfig({ browser: config })
}

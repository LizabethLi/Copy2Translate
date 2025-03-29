require('dotenv').config();
const { app, BrowserWindow, globalShortcut, clipboard, ipcMain, Notification } = require("electron");
const axios = require("axios");
const path = require("path");
const settings = require("electron-settings");
const { HttpsProxyAgent } = require('https-proxy-agent');
const https = require('https');

// 使用系统代理设置
app.commandLine.appendSwitch('proxy-server', process.env.HTTPS_PROXY);
app.commandLine.appendSwitch('ignore-certificate-errors');

let mainWindow;
let userShortcut = settings.getSync("shortcut") || (process.platform === 'darwin' ? "Shift+Command+T" : "Control+Shift+T");
let apiKey = settings.getSync("apiKey");
let userPrompt = settings.getSync("prompt") || "Translate the following Chinese text to English:";

// 修改通知函数，添加更多选项
function showNotification(title, body) {
  if (Notification.isSupported()) {
    try {
      const notification = new Notification({
        title,
        body,
        silent: false,
        subtitle: process.platform === 'darwin' ? 'Copy2translate' : undefined, // macOS特有属性
        icon: process.platform === 'darwin' ? undefined : path.join(__dirname, 'icon.png'),
        timeoutType: 'default'
      });
      
      // 确保在macOS上应用已注册可发送通知
      if (process.platform === 'darwin') {
        // 设置为告警型通知，确保显示横幅
        notification.urgency = 'critical';
      }
      
      notification.show();
      
      // 为macOS添加回调以确认通知已显示
      if (process.platform === 'darwin') {
        notification.on('show', () => {
          console.log('通知已显示');
        });
        
        notification.on('click', () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
          }
        });
      }
      
      // 如果是翻译完成的通知，让主窗口闪烁提醒用户
      if (title === "翻译完成" && mainWindow) {
        if (process.platform === 'darwin') {
          // macOS上使用dock弹跳作为辅助提醒
          try {
            if (app.dock && typeof app.dock.bounce === 'function') {
              const bounceId = app.dock.bounce('informational');
              // 3秒后停止弹跳
              setTimeout(() => {
                if (bounceId !== undefined) app.dock.cancelBounce(bounceId);
              }, 3000);
            }
          } catch (error) {
            console.error('Dock弹跳失败:', error);
            // 忽略失败，继续执行
          }
        } else if (process.platform === 'win32') {
          // Windows上闪烁任务栏图标
          mainWindow.flashFrame(true);
          setTimeout(() => {
            mainWindow.flashFrame(false);
          }, 2000);
        }
      }
    } catch (error) {
      console.error('显示通知失败:', error);
      // 如果通知失败，尝试通过窗口提醒用户
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('showTranslationComplete', { title, body });
      }
    }
  } else {
    console.warn('系统不支持通知，将使用窗口内提醒');
    // 通过窗口提醒用户
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('showTranslationComplete', { title, body });
    }
  }
}

// 注册快捷键
function registerShortcut(shortcut) {
  try {
    // 验证快捷键字符串是否只包含ASCII字符
    if (!/^[\x00-\x7F]+$/.test(shortcut)) {
      console.error(`快捷键字符串只能包含ASCII字符，无效的字符串: "${shortcut}"`);
      showNotification("快捷键错误", "快捷键包含无效字符，已重置为默认值");
      shortcut = process.platform === 'darwin' ? "Shift+Command+T" : "Control+Shift+T"; // 重置为默认值
      settings.setSync("shortcut", shortcut);
    }
    
    // 注册快捷键
    globalShortcut.register(shortcut, async () => {
      const textToTranslate = clipboard.readText();
      if (!textToTranslate) {
        showNotification("翻译提示", "剪切板为空，请先复制要翻译的文本");
        return;
      }

      console.log("翻译中:", textToTranslate);
      const translatedText = await translateText(textToTranslate);
      clipboard.writeText(translatedText);
      console.log("翻译完成，已复制到剪切板:", translatedText);

      showNotification("翻译完成", "译文已复制到剪切板");
      mainWindow.webContents.send("translatedText", translatedText);
    });
    
    return true;
  } catch (error) {
    console.error("注册快捷键失败:", error);
    showNotification("快捷键错误", "注册快捷键失败，请尝试其他组合");
    return false;
  }
}

// 翻译文本（调用 OpenRouter API）
async function translateText(text) {
  try {
    if (!apiKey) {
      showNotification("错误", "请先设置 API Key");
      mainWindow.webContents.send("showApiKeyPrompt");
      return "请先设置 API Key";
    }

    const instance = axios.create({
      proxy: false,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      timeout: 10000
    });

    console.log('Sending request to OpenRouter API...');
    const response = await instance.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "anthropic/claude-3-opus:2024-05-23", // 可以根据需要更换模型
        messages: [
          { role: "system", content: "You are a professional translator." },
          { role: "user", content: `${userPrompt}\n${text}` }
        ],
        temperature: 0.7,
        max_tokens: 800,
        top_p: 0.8,
        frequency_penalty: 0,
        presence_penalty: 0
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://copy2translate.app", // 替换为你的应用域名
          "X-Title": "Copy2Translate"
        }
      }
    );

    console.log('Response received:', response.status);
    return response.data.choices[0].message.content;

  } catch (error) {
    console.error("翻译失败:", error);
    if (error.response) {
      console.error("错误详情:", error.response.data);
      console.error("状态码:", error.response.status);
      console.error("响应头:", error.response.headers);
    } else {
      console.error("错误类型:", error.name);
      console.error("错误消息:", error.message);
      if (error.code) {
        console.error("错误代码:", error.code);
      }
    }
    return "翻译失败，请检查 API Key 或网络连接";
  }
}

app.whenReady().then(() => {
  // 请求通知权限（仅在 macOS 上需要）
  if (process.platform === 'darwin') {
    // macOS 不需要设置 AppUserModelId，这仅在 Windows 上才需要
    // 设置应用名称，这在 macOS 上对于通知很重要
    app.name = 'Copy2translate';
    
    // 如果使用Electron v9+，可以检查通知权限
    if (Notification.isSupported()) {
      // 检查权限
      Notification.requestPermission().then(permission => {
        console.log('通知权限状态:', permission);
      });
    }
  } else if (process.platform === 'win32') {
    // 在 Windows 上设置应用 ID
    app.setAppUserModelId('com.copy2translate.app');
  }

  // 创建主窗口
  createWindow();
  
  // 注册快捷键
  const registeredShortcut = registerShortcut(userShortcut);
  console.log("已注册快捷键:", registeredShortcut ? "成功" : "失败");
});

// 监听应用退出，释放快捷键
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

// 在应用准备就绪时创建窗口
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 定义创建窗口的函数
function createWindow() {
  // 创建窗口
  mainWindow = new BrowserWindow({
    width: 400,
    height: 350,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    },
  });

  // 加载HTML文件
  mainWindow.loadFile('index.html');
  
  // 设置 CSP 头
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self'; style-src 'self' 'unsafe-inline';"]
      }
    });
  });
  
  // 检查是否有通知权限
  if (Notification.isSupported()) {
    console.log('通知功能支持');
  } else {
    console.log('通知功能不支持');
  }

  // 监听提示词更新
  setupIPCListeners();

  // 在开发环境中打开开发者工具
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }
}

// 设置IPC监听器
function setupIPCListeners() {
  // 检查是否有 API key
  if (!apiKey) {
    mainWindow.webContents.send("showApiKeyPrompt");
  }

  // 监听快捷键更新
  ipcMain.on("updateShortcut", (event, newShortcut) => {
    // 验证快捷键字符串是否只包含ASCII字符
    if (!/^[\x00-\x7F]+$/.test(newShortcut)) {
      console.error(`快捷键字符串只能包含ASCII字符，无效的字符串: "${newShortcut}"`);
      showNotification("快捷键错误", "快捷键包含无效字符，请使用有效的组合");
      event.reply("shortcutUpdateFailed", "快捷键包含无效字符");
      return;
    }
    
    // 保存新的快捷键
    settings.setSync("shortcut", newShortcut);
    userShortcut = newShortcut;
    
    // 注销所有快捷键并注册新的快捷键
    globalShortcut.unregisterAll();
    const success = registerShortcut(newShortcut);
    
    if (success) {
      event.reply("shortcutUpdated", newShortcut);
    } else {
      event.reply("shortcutUpdateFailed", "注册快捷键失败");
    }
  });

  // 监听 API key 设置
  ipcMain.on("setApiKey", (event, newApiKey, provider) => {
    if (provider === 'openRouter') {
      apiKey = newApiKey;
      settings.setSync("apiKey", newApiKey);
    } else if (provider === 'deepSeek') {
      settings.setSync("deepSeekApiKey", newApiKey);
    }
    showNotification("设置成功", "API Key 已保存");
    event.reply("apiKeySaved");
  });

  // 监听模型设置
  ipcMain.on("setModel", (event, model, provider) => {
    if (provider === 'openRouter') {
      settings.setSync("model", model);
    } else if (provider === 'deepSeek') {
      settings.setSync("deepSeekModel", model);
    }
  });

  // 添加 IPC 监听器来获取快捷键
  ipcMain.handle('getShortcut', () => {
    return settings.getSync("shortcut") || (process.platform === 'darwin' ? "Shift+Command+T" : "Control+Shift+T");
  });

  // 添加 IPC 监听器来获取 prompt
  ipcMain.handle('getPrompt', () => {
    return settings.getSync("prompt") || "Translate the following Chinese text to English:";
  });

  // 添加 IPC 处理程序来获取 API Key
  ipcMain.handle('getApiKey', (event, provider) => {
    if (provider === 'openRouter') {
      return settings.getSync("apiKey") || "";
    } else if (provider === 'deepSeek') {
      return settings.getSync("deepSeekApiKey") || "";
    }
    return "";
  });

  // 添加 IPC 处理程序来获取模型
  ipcMain.handle('getModel', (event, provider) => {
    if (provider === 'openRouter') {
      return settings.getSync("model") || "openai/gpt-4o";
    } else if (provider === 'deepSeek') {
      return settings.getSync("deepSeekModel") || "deepseek-chat";
    }
    return "";
  });

  // 监听 prompt 更新
  ipcMain.on("updatePrompt", (event, newPrompt) => {
    userPrompt = newPrompt;
    settings.setSync("prompt", newPrompt);
    showNotification("设置成功", "翻译提示词已更新");
  });

  // 添加 IPC 处理程序来保存提示词列表
  ipcMain.on("savePrompts", (event, prompts) => {
    console.log("主进程保存提示词列表:", prompts);
    settings.setSync("prompts", prompts);
  });

  // 添加 IPC 处理程序来获取提示词列表
  ipcMain.handle("getPrompts", () => {
    const savedPrompts = settings.getSync("prompts");
    console.log("主进程获取提示词列表:", savedPrompts);
    
    // 如果没有保存的提示词，返回默认的三条基本提示词
    if (!savedPrompts || savedPrompts.length === 0) {
      const defaultPrompts = [
        {
          id: "default",
          name: "默认英文翻译",
          text: "Please translate this Chinese text to English, only return the translation:",
          isActive: true
        },
        {
          id: "formal",
          name: "正式商务",
          text: "Please translate this Chinese text to formal Business English. Use professional vocabulary, maintain a respectful tone, and ensure the language is appropriate for corporate communications or official documents,only return the translation:",
          isActive: false
        },
        {
          id: "casual",
          name: "日常口语",
          text: "Please translate this Chinese text to casual, conversational English. Use everyday expressions, contractions, and a friendly tone that would be appropriate for informal conversations with friends,only return the translation:",
          isActive: false
        }
      ];
      
      // 保存默认提示词到设置中
      settings.setSync("prompts", defaultPrompts);
      return defaultPrompts;
    }
    
    return savedPrompts;
  });

  // 添加 IPC 处理程序来清除提示词列表
  ipcMain.handle("clearPrompts", () => {
    console.log("清除主进程中的提示词列表");
    settings.unsetSync("prompts");
    return true;
  });
}
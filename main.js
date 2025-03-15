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
let userShortcut = settings.getSync("shortcut") || "Command+Alt+T";
let apiKey = settings.getSync("apiKey");
let userPrompt = settings.getSync("prompt") || "Translate the following Chinese text to English:";

// 修改通知函数，添加更多选项
function showNotification(title, body) {
  if (Notification.isSupported()) {
    new Notification({
      title,
      body,
      silent: false,
      timeoutType: 'default'
    }).show();
  }
}

// 注册快捷键
function registerShortcut(shortcut) {
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
          "HTTP-Referer": "https://tap2translate.app", // 替换为你的应用域名
          "X-Title": "Tap2Translate"
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
    app.setAppUserModelId(process.execPath);
  }

  // 创建窗口
  mainWindow = new BrowserWindow({
    width: 400,
    height: 350,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: true
    },
  });

  // 检查是否有通知权限
  if (Notification.isSupported()) {
    console.log('通知功能支持');
  } else {
    console.log('通知功能不支持');
  }

  mainWindow.loadFile("index.html");

  // 打开开发者工具
  mainWindow.webContents.openDevTools();

  // 检查是否有 API key
  if (!apiKey) {
    mainWindow.webContents.send("showApiKeyPrompt");
  }

  // 注册全局快捷键
  registerShortcut(userShortcut);

  // 监听快捷键更新
  ipcMain.on("updateShortcut", (event, newShortcut) => {
    settings.setSync("shortcut", newShortcut);
    globalShortcut.unregisterAll();
    registerShortcut(newShortcut);
  });

  // 监听 API key 设置
  ipcMain.on("setApiKey", (event, newApiKey) => {
    apiKey = newApiKey;
    settings.setSync("apiKey", newApiKey);
    showNotification("设置成功", "API Key 已保存");
  });

  // 添加 IPC 监听器来获取快捷键
  ipcMain.handle('getShortcut', () => {
    return settings.getSync("shortcut") || "Command+Alt+T";
  });

  // 添加 IPC 监听器来获取 prompt
  ipcMain.handle('getPrompt', () => {
    return settings.getSync("prompt") || "Translate the following Chinese text to English:";
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

  // 设置 CSP
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self';" +
          "script-src 'self';" +
          "style-src 'self'"
        ]
      }
    });
  });
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
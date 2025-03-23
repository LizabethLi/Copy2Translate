const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electron', {
  // 从主进程接收消息
  receive: (channel, func) => {
    const validChannels = [
      'translatedText',
      'showApiKeyPrompt',
      'shortcutUpdated',
      'shortcutUpdateFailed',
      'apiKeySaved',
      'apiKeyError'
    ];
    if (validChannels.includes(channel)) {
      // 删除 IPC 事件监听器以避免内存泄漏
      ipcRenderer.removeAllListeners(channel);
      // 添加新的监听器
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  
  // 一次性事件监听
  once: (channel, func) => {
    const validChannels = [
      'shortcutUpdated',
      'shortcutUpdateFailed',
      'apiKeySaved',
      'apiKeyError'
    ];
    if (validChannels.includes(channel)) {
      // 添加一次性监听器
      ipcRenderer.once(channel, (event, ...args) => func(...args));
    }
  },
  
  // 向主进程发送消息
  send: (channel, ...args) => {
    const validChannels = [
      'updateShortcut',
      'updatePrompt',
      'setApiKey',
      'setModel',
      'savePrompts'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },
  
  // 调用主进程方法并等待结果
  invoke: async (channel, ...args) => {
    const validChannels = [
      'getShortcut',
      'getPrompt',
      'getApiKey',
      'getModel',
      'getPrompts',
      'clearPrompts'
    ];
    if (validChannels.includes(channel)) {
      return await ipcRenderer.invoke(channel, ...args);
    }
    return Promise.reject(new Error(`Invalid channel: ${channel}`));
  }
});
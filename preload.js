const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electron', {
  // 从主进程接收消息
  receive: (channel, func) => {
    const validChannels = ['translatedText', 'showApiKeyPrompt'];
    if (validChannels.includes(channel)) {
      // 删除 IPC 事件监听器以避免内存泄漏
      ipcRenderer.removeAllListeners(channel);
      // 添加新的监听器
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  // 向主进程发送消息
  send: (channel, data) => {
    const validChannels = ['updateShortcut', 'updatePrompt', 'setApiKey'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  // 调用主进程方法并等待结果
  invoke: (channel, data) => {
    const validChannels = ['getShortcut', 'getPrompt'];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }
    return Promise.reject(new Error(`Invalid channel: ${channel}`));
  }
});
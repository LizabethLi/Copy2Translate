// 移除 require 语句，使用 window.electron API
// const { ipcRenderer } = require("electron");

// 常量定义
const AUDIO_SETTINGS = {
  HIGH_E: 1318.51,
  LOW_E: 659.25,
  DURATION: 0.5,
  INITIAL_GAIN: 0.1
};

const PROVIDERS = {
  OPEN_ROUTER: 'openRouter',
  DEEP_SEEK: 'deepSeek'
};

// 默认提示词配置
const DEFAULT_PROMPTS = [
  {
    id: "default",
    name: "默认英文翻译",
    text: "Please translate the following text to English, please make sure only return the translation:",
    isActive: true
  },
  {
    id: "formal",
    name: "正式商务",
    text: "Please translate the following text to formal Business English. Use professional vocabulary, maintain a respectful tone, and ensure the language is appropriate for corporate communications or official documents,please make sure only return the translation:",
    isActive: false
  },
  {
    id: "casual",
    name: "日常口语",
    text: "Please translate the following text to casual, conversational English. Use everyday expressions, contractions, and a friendly tone that would be appropriate for informal conversations with friends,please make sure only return the translation:",
    isActive: false
  }
];

// 初始化提示词列表
let prompts = [...DEFAULT_PROMPTS];

// 标记当前是否处于编辑模式
let isEditMode = false;
let editingPromptId = null;

// 当前选中的提供商
let currentProvider = PROVIDERS.OPEN_ROUTER;

document.addEventListener("DOMContentLoaded", () => {
  // 检查 localStorage 状态
  console.log("页面加载时的 localStorage 状态:");
  console.log("prompts:", localStorage.getItem('prompts'));
  
  // 初始化提示词列表
  loadPrompts();
  
  // 显示当前快捷键
  fetchShortcut();

  // 显示当前 prompt
  fetchPrompt();

  // 在页面关闭前保存提示词列表
  window.addEventListener('beforeunload', () => {
    console.log("页面关闭前保存提示词列表");
    savePrompts();
  });

  // 添加输入框事件监听
  document.getElementById("newShortcut").addEventListener("keydown", (e) => {
    e.preventDefault();
    const modifiers = [];
    if (e.ctrlKey) modifiers.push("Ctrl");
    if (e.shiftKey) modifiers.push("Shift");
    if (e.altKey) modifiers.push("Alt");
    if (e.metaKey) modifiers.push("Command");

    // 只接受ASCII字符
    const key = e.key.toUpperCase();
    if (key !== "CONTROL" && key !== "SHIFT" && key !== "ALT" && key !== "META") {
      // 检查是否为ASCII字符
      if (/^[\x00-\x7F]$/.test(e.key)) {
        const shortcut = [...modifiers, key].join("+");
        document.getElementById("newShortcut").value = shortcut;
      } else {
        console.warn(`忽略非ASCII字符: ${e.key}`);
      }
    }
  });

  // 监听显示 API key 输入提示
  window.electron.receive("showApiKeyPrompt", () => {
    document.getElementById("apiKeyModal").classList.remove('hidden');
  });

  // 翻译结果接收
  window.electron.receive("translatedText", (text) => {
    const translatedTextArea = document.getElementById("translatedText");
    translatedTextArea.value = text;
    
    // 添加动画效果以提醒用户翻译已完成
    translatedTextArea.classList.add("translation-complete");
    
    // 聚焦到翻译结果区域并选中所有文本
    translatedTextArea.focus();
    translatedTextArea.select();
    
    // 移除动画类，为下次翻译做准备
    setTimeout(() => {
      translatedTextArea.classList.remove("translation-complete");
    }, 2000);
  });

  // 添加应用内通知处理
  window.electron.receive("showTranslationComplete", (data) => {
    // 创建一个应用内通知元素
    showAppNotification(data.title, data.body);
  });

  // 添加按钮事件监听器
  document.getElementById("updateShortcutBtn").addEventListener("click", updateShortcut);
  document.getElementById("saveApiKeyBtn").addEventListener("click", saveApiKey);
  document.getElementById("addPromptBtn").addEventListener("click", showAddPromptModal);
  document.getElementById("resetPromptsBtn").addEventListener("click", resetPrompts);
  document.getElementById("savePromptBtn").addEventListener("click", handleSavePrompt);
  document.getElementById("cancelAddPromptBtn").addEventListener("click", hideAddPromptModal);
  document.getElementById("translateBtn").addEventListener("click", simulateTranslation);
  
  // 添加清除 localStorage 按钮事件监听（如果存在这个按钮）
  const clearLocalStorageBtn = document.getElementById("clearLocalStorageBtn");
  if (clearLocalStorageBtn) {
    clearLocalStorageBtn.addEventListener("click", clearLocalStoragePrompts);
  }
  
  // 顶部标题栏按钮事件监听
  document.getElementById("apiKeyBtn").addEventListener("click", showApiKeyModal);
  
  // API Key弹窗事件监听
  document.getElementById("saveApiKeyBtn").addEventListener("click", saveApiKey);
  document.getElementById("cancelApiKeyBtn").addEventListener("click", cancelApiKeySetting);
  document.getElementById("openRouterBtn").addEventListener("click", () => switchProvider('openRouter'));
  document.getElementById("deepSeekBtn").addEventListener("click", () => switchProvider('deepSeek'));
  
  // 密码显示/隐藏按钮
  document.addEventListener('click', function(e) {
    if (e.target.closest('.toggle-password-btn')) {
      const container = e.target.closest('.password-input-container');
      const input = container.querySelector('input');
      togglePasswordVisibility(input);
    }
  });
  
  // 提示词选择变更
  document.getElementById("promptSelect").addEventListener("change", handlePromptSelect);
});

// 读取并显示当前快捷键
async function fetchShortcut() {
  try {
    const shortcut = await window.electron.invoke('getShortcut');
    console.log("Current shortcut:", shortcut);
    document.getElementById("currentShortcut").innerText = shortcut;
  } catch (error) {
    console.error('Error fetching shortcut:', error);
  }
}

// 读取并显示当前 prompt
async function fetchPrompt() {
  try {
    const prompt = await window.electron.invoke('getPrompt');
    document.getElementById("promptInput").value = prompt;
  } catch (error) {
    console.error('Error fetching prompt:', error);
  }
}

// 更新快捷键
function updateShortcut() {
  const newShortcut = document.getElementById("newShortcut").value;
  if (newShortcut) {
    // 先设置监听器
    window.electron.receive("shortcutUpdated", (updatedShortcut) => {
      document.getElementById("currentShortcut").innerText = updatedShortcut;
      alert(`快捷键已更新为：${updatedShortcut}`);
    });
    
    window.electron.receive("shortcutUpdateFailed", (reason) => {
      alert(`快捷键更新失败：${reason}`);
      // 重新获取当前快捷键
      fetchShortcut();
    });
    
    // 然后发送更新请求
    window.electron.send("updateShortcut", newShortcut);
  }
}

// 显示API Key设置弹窗
function showApiKeyModal() {
  const modal = document.getElementById("apiKeyModal");
  modal.classList.remove('hidden');
  
  // 加载当前API Key和模型信息
  loadApiKeySettings();
}

// 加载API Key和模型设置
async function loadApiKeySettings() {
  try {
    let openRouterApiKey = '';
    let openRouterModel = '';
    let deepSeekApiKey = '';
    let deepSeekModel = '';
    
    // 尝试从主进程获取设置
    try {
      // 尝试从主进程获取OpenRouter设置
      openRouterApiKey = await window.electron.invoke('getApiKey', 'openRouter') || '';
      openRouterModel = await window.electron.invoke('getModel', 'openRouter') || '';
      
      // 尝试从主进程获取DeepSeek设置
      deepSeekApiKey = await window.electron.invoke('getApiKey', 'deepSeek') || '';
      deepSeekModel = await window.electron.invoke('getModel', 'deepSeek') || '';
    } catch (ipcError) {
      console.warn('无法从主进程获取API设置，将使用本地存储:', ipcError);
      
      // 从本地存储获取设置作为备选方案
      openRouterApiKey = localStorage.getItem('openRouterApiKey') || '';
      openRouterModel = localStorage.getItem('openRouterModel') || '';
      deepSeekApiKey = localStorage.getItem('deepSeekApiKey') || '';
      deepSeekModel = localStorage.getItem('deepSeekModel') || '';
    }
    
    // 更新OpenRouter显示
    updateProviderDisplay('openRouter', openRouterApiKey, openRouterModel);
    
    // 更新DeepSeek显示
    updateProviderDisplay('deepSeek', deepSeekApiKey, deepSeekModel);
    
    // 显示当前选中的提供商设置面板
    switchProvider(currentProvider);
  } catch (error) {
    console.error('Error loading API Key settings:', error);
  }
}

// 更新提供商显示
function updateProviderDisplay(provider, apiKey, model) {
  if (provider === 'openRouter') {
    const currentApiKeyInput = document.getElementById("currentApiKey");
    const currentModelInput = document.getElementById("currentModel");
    
    if (apiKey) {
      currentApiKeyInput.value = apiKey;
      currentApiKeyInput.placeholder = '';
    } else {
      currentApiKeyInput.value = '';
      currentApiKeyInput.placeholder = '尚未设置 API Key';
    }
    
    if (model) {
      currentModelInput.value = model;
      currentModelInput.placeholder = '';
    } else {
      currentModelInput.value = '';
      currentModelInput.placeholder = '尚未设置模型';
    }
    
    // 清空新输入框，只保留 placeholder
    document.getElementById("newApiKey").value = '';
    document.getElementById("newModel").value = '';
  } else if (provider === 'deepSeek') {
    const currentApiKeyInput = document.getElementById("currentDeepSeekApiKey");
    const currentModelInput = document.getElementById("currentDeepSeekModel");
    
    if (apiKey) {
      currentApiKeyInput.value = apiKey;
      currentApiKeyInput.placeholder = '';
    } else {
      currentApiKeyInput.value = '';
      currentApiKeyInput.placeholder = '尚未设置 API Key';
    }
    
    if (model) {
      currentModelInput.value = model;
      currentModelInput.placeholder = '';
    } else {
      currentModelInput.value = '';
      currentModelInput.placeholder = '尚未设置模型';
    }
    
    // 清空新输入框，只保留 placeholder
    document.getElementById("newDeepSeekApiKey").value = '';
    document.getElementById("newDeepSeekModel").value = '';
  }
  
  // 更新提供商状态
  updateProviderStatus(provider, apiKey);
}

// 更新提供商状态
function updateProviderStatus(provider, apiKey) {
  const openRouterBtn = document.getElementById("openRouterBtn");
  const deepSeekBtn = document.getElementById("deepSeekBtn");
  
  const statusSpan = provider === 'openRouter' 
    ? openRouterBtn.querySelector('.provider-status')
    : deepSeekBtn.querySelector('.provider-status');
  
  // 清除之前的状态类
  statusSpan.classList.remove('status-set', 'status-unset');
  
  if (apiKey) {
    statusSpan.textContent = '(已设置)';
    statusSpan.classList.add('status-set');
  } else {
    statusSpan.textContent = '(未设置)';
    statusSpan.classList.add('status-unset');
  }
}

// 保存 API Key 和模型设置
function saveApiKey() {
  let apiKey, model;
  
  if (currentProvider === 'openRouter') {
    apiKey = document.getElementById("newApiKey").value;
    model = document.getElementById("newModel").value;
    
    // 如果没有输入新的API Key，检查是否有现有的
    if (!apiKey) {
      apiKey = document.getElementById("currentApiKey").value;
    }
  } else if (currentProvider === 'deepSeek') {
    apiKey = document.getElementById("newDeepSeekApiKey").value;
    model = document.getElementById("newDeepSeekModel").value;
    
    // 如果没有输入新的API Key，检查是否有现有的
    if (!apiKey) {
      apiKey = document.getElementById("currentDeepSeekApiKey").value;
    }
  }
  
  if (apiKey) {
    // 发送到主进程保存
    window.electron.send("setApiKey", apiKey, currentProvider);
    if (model) {  // 只有当用户实际输入了模型时才保存
      window.electron.send("setModel", model, currentProvider);
    }
    
    // 同时保存到本地存储作为备选方案
    if (currentProvider === 'openRouter') {
      localStorage.setItem('openRouterApiKey', apiKey);
      if (model) {
        localStorage.setItem('openRouterModel', model);
      }
    } else if (currentProvider === 'deepSeek') {
      localStorage.setItem('deepSeekApiKey', apiKey);
      if (model) {
        localStorage.setItem('deepSeekModel', model);
      }
    }
    
    // 更新当前显示
    if (currentProvider === 'openRouter') {
      document.getElementById("currentApiKey").value = apiKey;
      document.getElementById("currentApiKey").placeholder = '';
      document.getElementById("currentModel").value = model;
    } else if (currentProvider === 'deepSeek') {
      document.getElementById("currentDeepSeekApiKey").value = apiKey;
      document.getElementById("currentDeepSeekApiKey").placeholder = '';
      document.getElementById("currentDeepSeekModel").value = model;
    }
    
    // 更新提供商状态
    updateProviderStatus(currentProvider, apiKey);
    
    // 关闭弹窗
    const modal = document.getElementById("apiKeyModal");
    modal.classList.add('hidden');
  } else {
    alert("请输入有效的 API Key");
  }
}

// 切换密码显示/隐藏
function togglePasswordVisibility(input) {
  if (input.type === "password") {
    input.type = "text";
  } else {
    input.type = "password";
  }
}

// 切换提供商
function switchProvider(provider) {
  const openRouterBtn = document.getElementById("openRouterBtn");
  const deepSeekBtn = document.getElementById("deepSeekBtn");
  const openRouterSettings = document.getElementById("openRouterSettings");
  const deepSeekSettings = document.getElementById("deepSeekSettings");
  
  // 保存当前选中的提供商
  currentProvider = provider;
  
  // 重置按钮状态
  openRouterBtn.classList.remove('active');
  deepSeekBtn.classList.remove('active');
  
  // 隐藏所有设置面板
  openRouterSettings.classList.add('hidden');
  deepSeekSettings.classList.add('hidden');
  
  // 激活选中的提供商
  if (provider === 'openRouter') {
    openRouterBtn.classList.add('active');
    openRouterSettings.classList.remove('hidden');
  } else if (provider === 'deepSeek') {
    deepSeekBtn.classList.add('active');
    deepSeekSettings.classList.remove('hidden');
  }
}

// 取消API Key设置
function cancelApiKeySetting() {
  const modal = document.getElementById("apiKeyModal");
  modal.classList.add('hidden');
}

// 加载提示词列表
function loadPrompts() {
  // 尝试从主进程获取提示词列表
  window.electron.invoke('getPrompts')
    .then(savedPrompts => {
      console.log("从主进程获取提示词:", savedPrompts);
      
      if (savedPrompts && savedPrompts.length > 0) {
        // 如果主进程中有提示词，使用它们
        prompts = savedPrompts;
        console.log("成功从主进程获取提示词:", prompts);
      } else {
        // 尝试从本地存储加载提示词列表
        const localPrompts = localStorage.getItem('prompts');
        console.log("从本地存储加载提示词:", localPrompts);
        
        if (localPrompts) {
          try {
            // 如果本地存储中有提示词，使用它们
            prompts = JSON.parse(localPrompts);
            console.log("成功解析本地存储中的提示词:", prompts);
            
            // 同步到主进程
            window.electron.send('savePrompts', prompts);
          } catch (error) {
            console.error("解析本地存储中的提示词时出错:", error);
            // 如果解析出错，使用默认提示词
            localStorage.setItem('prompts', JSON.stringify(prompts));
            // 同步到主进程
            window.electron.send('savePrompts', prompts);
          }
        } else {
          console.log("本地存储中没有提示词，使用默认提示词");
          // 如果本地存储中没有提示词，使用默认提示词并保存到本地存储
          localStorage.setItem('prompts', JSON.stringify(prompts));
          // 同步到主进程
          window.electron.send('savePrompts', prompts);
        }
      }
      
      // 确保至少有一个提示词是活跃的
      const hasActivePrompt = prompts.some(p => p.isActive);
      if (!hasActivePrompt && prompts.length > 0) {
        prompts[0].isActive = true;
        console.log("没有活跃的提示词，将第一个提示词设为活跃:", prompts[0]);
      }
      
      // 更新提示词下拉列表
      updatePromptSelect();
      
      // 更新提示词列表显示
      renderPromptsList();
    })
    .catch(error => {
      console.error("从主进程获取提示词时出错:", error);
      
      // 尝试从本地存储加载提示词列表
      const localPrompts = localStorage.getItem('prompts');
      console.log("从本地存储加载提示词:", localPrompts);
      
      if (localPrompts) {
        try {
          // 如果本地存储中有提示词，使用它们
          prompts = JSON.parse(localPrompts);
          console.log("成功解析本地存储中的提示词:", prompts);
        } catch (error) {
          console.error("解析本地存储中的提示词时出错:", error);
          // 如果解析出错，使用默认提示词
          localStorage.setItem('prompts', JSON.stringify(prompts));
        }
      } else {
        console.log("本地存储中没有提示词，使用默认提示词");
        // 如果本地存储中没有提示词，使用默认提示词并保存到本地存储
        localStorage.setItem('prompts', JSON.stringify(prompts));
      }
      
      // 确保至少有一个提示词是活跃的
      const hasActivePrompt = prompts.some(p => p.isActive);
      if (!hasActivePrompt && prompts.length > 0) {
        prompts[0].isActive = true;
        console.log("没有活跃的提示词，将第一个提示词设为活跃:", prompts[0]);
      }
      
      // 更新提示词下拉列表
      updatePromptSelect();
      
      // 更新提示词列表显示
      renderPromptsList();
    });
}

// 更新提示词下拉列表
function updatePromptSelect() {
  const select = document.getElementById("promptSelect");
  select.innerHTML = '';
  
  prompts.forEach(prompt => {
    const option = document.createElement('option');
    option.value = prompt.id;
    option.textContent = prompt.name;
    if (prompt.isActive) {
      option.selected = true;
    }
    select.appendChild(option);
  });
}

// 渲染提示词列表
function renderPromptsList() {
  const promptsList = document.getElementById("promptsList");
  promptsList.innerHTML = '';
  
  console.log("渲染提示词列表，共", prompts.length, "个提示词");
  
  prompts.forEach(prompt => {
    console.log("渲染提示词:", prompt.id, prompt.name, prompt.isActive ? "(活跃)" : "");
    
    const promptItem = document.createElement('div');
    promptItem.className = 'prompt-item';
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'prompt-item-name';
    nameDiv.textContent = prompt.name;
    
    const textDiv = document.createElement('div');
    textDiv.className = 'prompt-item-text';
    textDiv.textContent = prompt.text;
    
    const statusDiv = document.createElement('div');
    statusDiv.className = 'prompt-item-status';
    if (prompt.isActive) {
      statusDiv.textContent = '当前使用中';
    } else {
      statusDiv.style.display = 'none';
    }
    
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'prompt-item-actions';
    
    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16.4745 5.40801L18.5917 7.52524M17.8358 3.54289L11.6716 9.70711C11.2725 10.1062 11.0251 10.3556 10.8216 10.6428C10.6181 10.93 10.4633 11.2463 10.1536 11.8789L9.71961 12.7456M17.8358 3.54289C19.0191 4.72618 19.0191 6.64193 17.8358 7.82522L11.6716 14.0894C11.2725 14.4886 11.0251 14.738 10.8216 15.0252C10.6181 15.3124 10.4633 15.6287 10.1536 16.2612L9.71961 17.128C9.30073 17.9843 9.09129 18.4125 8.71734 18.5167C8.34338 18.6209 7.9269 18.3837 7.09393 17.9095L6.2697 17.4417C5.63714 17.132 5.32086 16.9772 5.03366 16.7737C4.74647 16.5702 4.49707 16.3228 3.99816 15.8239L3.99815 15.8239C3.49924 15.325 3.25183 15.0756 3.04831 14.7884C2.84478 14.5012 2.68999 14.1849 2.38041 13.5524L1.91246 12.6857C1.43824 11.8527 1.20113 11.4362 1.30537 11.0622C1.40961 10.6883 1.83783 10.4789 2.69426 10.06L3.56094 9.62599C4.19349 9.31641 4.50977 9.16162 4.79697 8.95809C5.08416 8.75456 5.33357 8.50715 5.83247 8.00824L5.83248 8.00823L12.0533 1.78737C13.2366 0.604076 15.1523 0.604076 16.3356 1.78737L17.8358 3.54289Z" stroke="#666666" stroke-width="1.5" stroke-linecap="round"/></svg>';
    editBtn.onclick = () => editPrompt(prompt.id);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 3H15M3 6H21M19 6L18.2987 16.5193C18.1935 18.0975 18.1409 18.8867 17.8 19.485C17.4999 20.0118 17.0472 20.4353 16.5017 20.6997C15.882 21 15.0911 21 13.5093 21H10.4907C8.90891 21 8.11803 21 7.49834 20.6997C6.95276 20.4353 6.50009 20.0118 6.19998 19.485C5.85911 18.8867 5.8065 18.0975 5.70129 16.5193L5 6" stroke="#666666" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    deleteBtn.onclick = () => deletePrompt(prompt.id);
    
    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);
    
    promptItem.appendChild(nameDiv);
    promptItem.appendChild(textDiv);
    promptItem.appendChild(statusDiv);
    promptItem.appendChild(actionsDiv);
    
    promptsList.appendChild(promptItem);
  });
}

// 显示添加提示词弹窗
function showAddPromptModal() {
  isEditMode = false;
  editingPromptId = null;
  document.getElementById("addPromptModal").classList.remove('hidden');
  document.getElementById("newPromptName").value = "";
  document.getElementById("newPromptText").value = "";
}

// 隐藏添加提示词弹窗
function hideAddPromptModal() {
  document.getElementById("addPromptModal").classList.add('hidden');
  isEditMode = false;
  editingPromptId = null;
}

// 处理保存提示词（新增或更新）
function handleSavePrompt() {
  const name = document.getElementById("newPromptName").value;
  const text = document.getElementById("newPromptText").value;
  
  if (!name || !text) {
    alert("请填写提示词名称和内容");
    return;
  }
  
  if (isEditMode && editingPromptId) {
    console.log("更新现有提示词:", editingPromptId);
    // 更新现有提示词
    const prompt = prompts.find(p => p.id === editingPromptId);
    if (prompt) {
      prompt.name = name;
      prompt.text = text;
      
      // 如果编辑的是当前活跃的提示词，同时更新当前翻译提示词的文本框
      if (prompt.isActive) {
        document.getElementById("promptInput").value = text;
        // 保存到主进程
        window.electron.send("updatePrompt", text);
      }
    }
  } else {
    console.log("添加新提示词:", name);
    // 添加新提示词
    const newPrompt = {
      id: Date.now().toString(),
      name,
      text,
      isActive: false
    };
    prompts.push(newPrompt);
  }
  
  savePrompts();
  hideAddPromptModal();
}

// 编辑提示词
function editPrompt(id) {
  const prompt = prompts.find(p => p.id === id);
  if (!prompt) return;
  
  isEditMode = true;
  editingPromptId = id;
  
  // 显示弹窗并填充数据
  document.getElementById("addPromptModal").classList.remove('hidden');
  document.getElementById("newPromptName").value = prompt.name;
  document.getElementById("newPromptText").value = prompt.text;
}

// 删除提示词
function deletePrompt(id) {
  if (prompts.length <= 1) {
    alert("至少保留一个提示词");
    return;
  }
  
  const prompt = prompts.find(p => p.id === id);
  if (!prompt) return;
  
  if (prompt.isActive) {
    alert("无法删除当前使用中的提示词");
    return;
  }
  
  if (confirm(`确定要删除提示词"${prompt.name}"吗？`)) {
    console.log("删除提示词:", id, prompt.name);
    prompts = prompts.filter(p => p.id !== id);
    console.log("删除后的提示词列表:", prompts);
    savePrompts();
  }
}

// 保存提示词列表到本地存储和主进程
function savePrompts() {
  console.log("保存提示词列表:", prompts);
  
  // 保存到本地存储
  localStorage.setItem('prompts', JSON.stringify(prompts));
  console.log("保存到本地存储完成");
  
  // 保存到主进程
  window.electron.send('savePrompts', prompts);
  console.log("保存到主进程完成");
  
  // 更新界面
  updatePromptSelect();
  renderPromptsList();
}

// 更新提示词UI（在修改prompts后调用此函数立即更新界面）
function updatePromptsUI() {
  console.log("更新提示词UI");
  
  // 更新提示词下拉列表
  updatePromptSelect();
  
  // 更新提示词列表显示
  renderPromptsList();
  
  // 更新当前活跃提示词的输入框
  const activePrompt = prompts.find(p => p.isActive);
  if (activePrompt) {
    document.getElementById("promptInput").value = activePrompt.text;
  }
  
  // 保存更改
  savePrompts();
}

// 处理提示词选择变更
function handlePromptSelect() {
  const selectElement = document.getElementById("promptSelect");
  const selectedId = selectElement.value;
  
  // 更新活跃状态
  prompts.forEach(prompt => {
    prompt.isActive = (prompt.id === selectedId);
  });
  
  // 更新提示词输入框
  const activePrompt = prompts.find(p => p.isActive);
  if (activePrompt) {
    document.getElementById("promptInput").value = activePrompt.text;
    // 保存到主进程
    window.electron.send("updatePrompt", activePrompt.text);
  }
  
  // 更新列表显示
  renderPromptsList();
  savePrompts();
}

// 模拟翻译
function simulateTranslation() {
  const promptText = document.getElementById("promptInput").value;
  const modelSelect = document.getElementById("modelSelect").value;
  
  // 这里只是模拟，实际应用中应该调用真实的翻译API
  const sampleText = "这是一个模拟的翻译结果。在实际应用中，这里会显示通过选定的模型（" + modelSelect + "）翻译的文本。";
  
  // 直接调用与真实翻译相同的处理方式
  const translatedTextArea = document.getElementById("translatedText");
  translatedTextArea.value = sampleText;
  
  // 添加动画效果以提醒用户翻译已完成
  translatedTextArea.classList.add("translation-complete");
  
  // 聚焦到翻译结果区域并选中所有文本
  translatedTextArea.focus();
  translatedTextArea.select();
  
  // 移除动画类，为下次翻译做准备
  setTimeout(() => {
    translatedTextArea.classList.remove("translation-complete");
  }, 2000);
  
  // 也可以通过IPC调用主进程进行实际翻译
  // ipcRenderer.send("translate", { text: "要翻译的文本", model: modelSelect });
}

// 重置提示词列表为预设值
function resetPrompts() {
  if (!confirm("确定要重置提示词列表吗？这将删除所有自定义提示词。")) {
    return;
  }
  
  prompts = [...DEFAULT_PROMPTS];
  
  // 保存到本地存储和主进程
  localStorage.setItem('prompts', JSON.stringify(prompts));
  window.electron.send('savePrompts', prompts);
  
  // 更新界面
  updatePromptSelect();
  renderPromptsList();
  
  alert("提示词列表已重置为预设值。");
}

// 应用内通知函数
function showAppNotification(title, message) {
  // 检查是否存在通知容器，如果不存在则创建
  let notificationContainer = document.getElementById('app-notification-container');
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'app-notification-container';
    notificationContainer.style.position = 'fixed';
    notificationContainer.style.top = '20px';
    notificationContainer.style.right = '20px';
    notificationContainer.style.zIndex = '9999';
    document.body.appendChild(notificationContainer);
  }
  
  // 创建通知元素
  const notification = document.createElement('div');
  notification.className = 'app-notification';
  notification.style.backgroundColor = 'rgba(60, 60, 60, 0.9)';
  notification.style.color = 'white';
  notification.style.padding = '12px 16px';
  notification.style.marginBottom = '10px';
  notification.style.borderRadius = '8px';
  notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  notification.style.width = '300px';
  notification.style.maxWidth = '100%';
  notification.style.transition = 'all 0.3s ease';
  notification.style.opacity = '0';
  notification.style.transform = 'translateX(20px)';
  
  // 创建标题
  const titleElement = document.createElement('div');
  titleElement.textContent = title;
  titleElement.style.fontWeight = 'bold';
  titleElement.style.marginBottom = '5px';
  notification.appendChild(titleElement);
  
  // 创建消息
  const messageElement = document.createElement('div');
  messageElement.textContent = message;
  messageElement.style.fontSize = '14px';
  notification.appendChild(messageElement);
  
  // 添加到容器
  notificationContainer.appendChild(notification);
  
  // 触发过渡动画
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateX(0)';
  }, 10);
  
  // 自动消失
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(20px)';
    
    // 移除元素
    setTimeout(() => {
      notificationContainer.removeChild(notification);
    }, 300);
  }, 3000);
}
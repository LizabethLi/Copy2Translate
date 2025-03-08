const { ipcRenderer } = require("electron");

document.addEventListener("DOMContentLoaded", () => {
  ipcRenderer.on("translatedText", (event, text) => {
    document.getElementById("translatedText").value = text;
  });

  // 显示当前快捷键
  fetchShortcut();

  // 显示当前 prompt
  fetchPrompt();

  // 添加输入框事件监听
  document.getElementById("newShortcut").addEventListener("keydown", (e) => {
    e.preventDefault();
    const modifiers = [];
    if (e.ctrlKey) modifiers.push("Ctrl");
    if (e.shiftKey) modifiers.push("Shift");
    if (e.altKey) modifiers.push("Alt");
    if (e.metaKey) modifiers.push("Command");

    const key = e.key.toUpperCase();
    if (key !== "CONTROL" && key !== "SHIFT" && key !== "ALT" && key !== "META") {
      const shortcut = [...modifiers, key].join("+");
      document.getElementById("newShortcut").value = shortcut;
    }
  });

  // 监听显示 API key 输入提示
  ipcRenderer.on("showApiKeyPrompt", () => {
    document.getElementById("apiKeyModal").style.display = "block";
  });

  // 添加按钮事件监听器
  document.getElementById("updateShortcutBtn").addEventListener("click", updateShortcut);
  document.getElementById("updatePromptBtn").addEventListener("click", updatePrompt);
  document.getElementById("saveApiKeyBtn").addEventListener("click", saveApiKey);
});

// 读取并显示当前快捷键
async function fetchShortcut() {
  try {
    const shortcut = await ipcRenderer.invoke('getShortcut');
    console.log("Current shortcut:", shortcut);
    document.getElementById("currentShortcut").innerText = shortcut;
  } catch (error) {
    console.error('Error fetching shortcut:', error);
  }
}

// 读取并显示当前 prompt
async function fetchPrompt() {
  try {
    const prompt = await ipcRenderer.invoke('getPrompt');
    document.getElementById("promptInput").value = prompt;
  } catch (error) {
    console.error('Error fetching prompt:', error);
  }
}

// 更新快捷键
function updateShortcut() {
  const newShortcut = document.getElementById("newShortcut").value;
  if (newShortcut) {
    ipcRenderer.send("updateShortcut", newShortcut);
    document.getElementById("currentShortcut").innerText = newShortcut;
    alert(`快捷键已更新为：${newShortcut}`);
  }
}

// 更新 prompt
function updatePrompt() {
  const newPrompt = document.getElementById("promptInput").value;
  if (newPrompt) {
    ipcRenderer.send("updatePrompt", newPrompt);
  } else {
    alert("请输入有效的提示词");
  }
}

// 保存 API key
function saveApiKey() {
  const apiKey = document.getElementById("apiKeyInput").value;
  if (apiKey) {
    ipcRenderer.send("setApiKey", apiKey);
    document.getElementById("apiKeyModal").style.display = "none";
  } else {
    alert("请输入有效的 API Key");
  }
}
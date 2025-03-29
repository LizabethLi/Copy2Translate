# Copy2Translate

[中文](#chinese) | [English](#english)

<a name="chinese"></a>
Copy2Translate 是一个简单高效的翻译工具，旨在通过复制文本和按下快捷键来简化翻译过程。无论您是学生、专业人士，还是经常需要翻译的人，Copy2Translate 都能简化流程，为您节省时间和精力。

## 功能特点

- **快捷键翻译**: 通过简单的快捷键组合即可快速翻译文本，提升工作效率。
- **多种翻译提示词**: 支持多种预设翻译提示词，满足不同场景的翻译需求。
- **OpenRouter API 支持**: 利用 OpenRouter API 提供的强大翻译能力。
- **DeepSeek API 支持**: 集成 DeepSeek API，提供更精准的翻译结果。
- **自动复制到剪贴板**: 翻译结果自动复制到剪贴板，方便后续使用。


![Copy2Translate界面截图](./images/tool.png)



## 开发环境设置

如果您想在本地开发或修改此项目，请确保已安装 Node.js 和 npm。然后按照以下步骤操作：

1. 克隆仓库
   ```bash
   git clone https://github.com/LizabethLi/Copy2Translate.git
   cd copy2translate
   ```

2. 安装依赖
   ```bash
   npm install
   ```

3. 运行程序
   ```bash
   npm start
   ```
   

4. 构建应用(如果想要自己封装成应用)
   ```bash
   npm run dist        # 构建所有平台
   npm run dist:mac    # 仅构建 macOS
   npm run dist:win    # 仅构建 Windows
   ```

## 软件安装说明（如果自己封装成了应用，或者获取了已经封装好的应用）

### Windows 用户
1. 下载最新的 `Copy2Translate-Setup.exe`
2. 双击运行安装程序
3. 按照提示完成安装

### macOS 用户
1. 下载最新的 `Copy2Translate.dmg`
2. 双击打开 DMG 文件
3. 将应用程序拖到 Applications 文件夹

> **注意**：由于应用未经 Apple 开发者签名认证，macOS 可能会阻止应用运行。您可以在"系统偏好设置">"安全性与隐私"中允许应用运行。


## 使用方法

1. 首次运行时，需要设置 API Key
2. 默认快捷键为 `Command+Alt+T`（macOS）或 `Ctrl+Alt+T`（Windows/Linux）
3. 选中要翻译的文本并复制
4. 按下快捷键即可翻译
5. 翻译结果会自动复制到剪贴板，直接粘贴即可，不需要离开当前的编辑页面


## API 密钥申请


### OpenRouter API 申请步骤
1. 访问 [OpenRouter 官网](https://openrouter.ai/)
2. 注册并登录您的账户
3. 导航到 API 密钥页面
4. 创建新的 API 密钥
5. 复制 API 密钥并添加到应用的设置中

### DeepSeek API 申请步骤
1. 访问 [DeepSeek 官网](https://platform.deepseek.com/)
2. 注册并登录您的账户
3. 导航到开发者或 API 页面
4. 申请 API 访问权限并创建密钥
5. 复制 API 密钥并添加到应用的设置中

## 配置说明

### API Key 设置
1. 点击顶部的 API Key 按钮
2. 选择翻译服务提供商
3. 输入对应的 API Key，填写模型名称，参见两个网站的模型卡
4. 点击保存

### 快捷键设置
1. 在设置界面中点击"更改快捷键"
2. 按下新的快捷键组合
3. 点击确认保存

### 翻译提示词
- 可以添加、编辑、删除翻译提示词
- 支持多种预设提示词模板
- 可以随时切换不同的翻译风格

## 问题反馈

如果你在使用过程中遇到任何问题，请通过以下方式反馈：
1. 提交 Issue

---

## English

Copy2Translate is a simple and efficient translation tool designed to streamline the translation process by copying text and pressing a hotkey. Whether you are a student, professional, or someone who frequently needs translations, Copy2Translate simplifies the workflow, saving you time and effort.

## Features

- **Hotkey Translation**: Quickly translate text with a simple hotkey combination, improving work efficiency.
- **Multiple Translation Prompts**: Supports multiple preset translation prompts to meet different translation needs in various scenarios.
- **OpenRouter API Support**: Utilizes the powerful translation capabilities provided by the OpenRouter API.
- **DeepSeek API Support**: Integrates DeepSeek API for more accurate translation results.
- **Automatic Copy to Clipboard**: Translation results are automatically copied to the clipboard for convenient subsequent use.

![Copy2Translate Interface Screenshot](./images/tool.png)

## Development Environment Setup

If you want to develop or modify this project locally, make sure you have Node.js and npm installed. Then follow these steps:

1. Clone the repository
   ```bash
   git clone https://github.com/LizabethLi/Copy2Translate.git
   cd copy2translate
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Run the environment
   ```bash
   npm start
   ```

4. Build the application (if you want to package it yourself)
   ```bash
   npm run dist        # Build for all platforms
   npm run dist:mac    # Build for macOS only
   npm run dist:win    # Build for Windows only
   ```

## Software Installation Instructions (if you have packaged it yourself or obtained a pre-packaged application)

### Windows Users
1. Download the latest `Copy2Translate-Setup.exe`
2. Double-click to run the installer
3. Follow the prompts to complete the installation

### macOS Users
1. Download the latest `Copy2Translate.dmg`
2. Double-click to open the DMG file
3. Drag the application to the Applications folder

> **Note**: Since the application is not signed by an Apple developer, macOS may block the application from running. You can allow the application to run in "System Preferences" > "Security & Privacy". 

## Usage

1. When running for the first time, you need to set the API Key
2. The default hotkey is `Command+Alt+T` (macOS) or `Ctrl+Alt+T` (Windows/Linux)
3. Select the text you want to translate and copy it
4. Press the hotkey to translate
5. The translation result will be automatically copied to the clipboard, simply paste it without leaving the current editing page

## API Key Application

### OpenRouter API Application Steps
1. Visit the [OpenRouter official website](https://openrouter.ai/)
2. Register and log in to your account
3. Navigate to the API Key page
4. Create a new API Key
5. Copy the API Key and add it to the application settings

### DeepSeek API Application Steps
1. Visit the [DeepSeek official website](https://platform.deepseek.com/)
2. Register and log in to your account
3. Navigate to the Developer or API page





# DeepFold

DeepFold 是一个专为 [DeepSeek Chat](https://chat.deepseek.com/) 设计的轻量 Chrome 扩展。在翻看DeepSeek对话历史时，有大量的思考过程占据了超大半的篇幅，非常影响阅读效率，于是制作了该 Chrome 扩展，让你自由控制思考过程的展开与折叠(若未来官方支持"思考过程"折叠功能后，会删除该库)。

## 快速使用

1. 从 [最新 Release](https://github.com/Ubehind/DeepFold/releases/latest) 下载 `deepseek-auto-fold.zip`。
2. 解压下载的 ZIP 文件。
3. 在 Chrome 地址栏打开 `chrome://extensions/`。
4. 打开右上角的“开发者模式”。
5. 点击“加载未打包的扩展程序”，选择刚刚解压完的文件夹。
6. 打开或刷新 [DeepSeek Chat](https://chat.deepseek.com/)，点击工具栏中的 DeepFold 图标选择折叠方式。

## 三种模式

- **思考过程永远折叠**：思考内容开始输出后立即收起。
- **输出完立即折叠**：思考完成并开始输出最终回答时收起。
- **思考过程不折叠**：保持 DeepSeek 的默认行为。

无论选择哪种自动模式，用户手动展开某个思考过程后，DeepFold 都不会再次自动收起当前思考过程。

## 特点

- 不关闭深度思考，不影响回答质量。
- 不依赖 DeepSeek 经常变化的混淆 CSS 类名。
- 同时识别中文和英文思考状态。
- 使用 DOM 变化监听，不轮询页面。
- 不读取、保存或上传对话内容。
- 仅在 `https://chat.deepseek.com/*` 页面运行。

## 权限

- `storage`：保存用户选择的折叠模式。
- `chat.deepseek.com`：监听页面中的思考状态并触发折叠。

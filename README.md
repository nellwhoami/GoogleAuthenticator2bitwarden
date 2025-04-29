# Google Authenticator 二维码解析器

这是一个基于 Cloudflare Workers 的 Web 应用，用于将 Google Authenticator 的备份二维码转换为 Bitwarden 可导入的格式。

## 功能特点

- 简洁美观的用户界面
- 支持拖拽上传(多张)二维码图片
- 自动解析二维码内容
- 转换为 Bitwarden 兼容的 JSON 格式
- 一键复制结果

## 使用方法

1. 从 Google Authenticator 导出二维码：
   - 打开 Google Authenticator 应用
   - 点击右上角菜单
   - 选择"导出账户"
   - 扫描显示的二维码并保存为图片

2. 使用本工具：
   - 访问部署的网站
   - 点击上传区域或拖拽二维码图片到指定区域
   - 等待解析完成
   - 复制生成的 JSON 结果

3. 导入到 Bitwarden：
   - 打开 Bitwarden 网页版
   - 进入设置 -> 导入数据
   - 选择"Bitwarden (json)"格式
   - 粘贴之前复制的 JSON 内容
   - 点击导入

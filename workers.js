// 前端 HTML 模板
const HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Google Authenticator 二维码解析器</title>
    <script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/protobufjs@7.2.4/dist/protobuf.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/base32-encode@2.0.0/+esm" type="module"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        .upload-area {
            border: 2px dashed #ccc;
            padding: 40px;
            text-align: center;
            margin-bottom: 20px;
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .upload-area:hover {
            border-color: #4CAF50;
            background-color: #f8f8f8;
        }
        .result-area {
            display: none;
            margin-top: 20px;
        }
        pre {
            background-color: #f8f8f8;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
        }
        button {
            background-color: #4CAF50;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 10px;
        }
        button:hover {
            background-color: #45a049;
        }
        button:disabled {
            background-color: #cccccc;
            cursor: not-allowed;
        }
        .loading {
            display: none;
            text-align: center;
            margin: 20px 0;
        }
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #4CAF50;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .preview-area {
            margin-top: 20px;
            display: none;
        }
        .preview-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 10px;
            margin-top: 10px;
        }
        .preview-item {
            position: relative;
            border: 1px solid #ddd;
            border-radius: 5px;
            overflow: hidden;
        }
        .preview-item img {
            width: 100%;
            height: 150px;
            object-fit: cover;
        }
        .preview-item .remove-btn {
            position: absolute;
            top: 5px;
            right: 5px;
            background: rgba(255, 0, 0, 0.7);
            color: white;
            border: none;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
        }
        .preview-item .remove-btn:hover {
            background: rgba(255, 0, 0, 0.9);
        }
        .status {
            margin-top: 10px;
            text-align: center;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Google Authenticator 二维码解析器</h1>
        <div class="upload-area" id="uploadArea">
            <p>点击或拖拽二维码图片到这里</p>
            <input type="file" id="fileInput" accept="image/*" multiple style="display: none;">
        </div>
        <div class="preview-area" id="previewArea">
            <h3>已选择的图片</h3>
            <div class="preview-grid" id="previewGrid"></div>
            <div class="status" id="status"></div>
            <button id="convertButton" disabled>开始转换</button>
        </div>
        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>正在解析中...</p>
        </div>
        <div class="result-area" id="resultArea">
            <h2>解析结果</h2>
            <pre id="result"></pre>
            <button id="copyButton">复制结果</button>
        </div>
    </div>
    <script>
        // 定义 base32 编码函数
        function base32Encode(data) {
            const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
            const SHIFT = 5;
            const MASK = 31;
            
            let buffer;
            if (data instanceof Uint8Array) {
                buffer = data;
            } else if (typeof data === 'object' && Object.prototype.toString.call(data) === '[object Object]') {
                // 如果是对象格式，转换为数组
                const values = Object.values(data);
                buffer = new Uint8Array(values.length);
                for (let i = 0; i < values.length; i++) {
                    buffer[i] = values[i];
                }
            } else {
                throw new Error('Invalid input data for base32 encoding');
            }

            let output = '';
            let bits = 0;
            let value = 0;
            let index = 0;

            // 处理每个字节
            while (index < buffer.length) {
                value = (value << 8) | buffer[index++];
                bits += 8;

                // 当我们有足够的位来生成一个 base32 字符时
                while (bits >= SHIFT) {
                    output += ALPHABET[(value >>> (bits - SHIFT)) & MASK];
                    bits -= SHIFT;
                }
            }

            // 处理剩余的位
            if (bits > 0) {
                output += ALPHABET[(value << (SHIFT - bits)) & MASK];
            }

            // 添加填充
            while (output.length % 8) {
                output += '=';
            }

            return output;
        }

        // 定义 protobuf 消息格式
        const protobufSchema = \`syntax = "proto3";

message MigrationPayload {
  enum Algorithm {
    ALGO_INVALID = 0;
    ALGO_SHA1 = 1;
  }

  enum OtpType {
    OTP_INVALID = 0;
    OTP_HOTP = 1;
    OTP_TOTP = 2;
  }

  message OtpParameters {
    bytes secret = 1;
    string name = 2;
    string issuer = 3;
    Algorithm algorithm = 4;
    int32 digits = 5;
    OtpType type = 6;
    int64 counter = 7;
  }

  repeated OtpParameters otp_parameters = 1;
  int32 version = 2;
  int32 batch_size = 3;
  int32 batch_index = 4;
  int32 batch_id = 5;
}\`;

        // URL 解码函数
        function queryUnescape(str) {
            return decodeURIComponent(str.replace(/\\+/g, " "));
        }

        // 解码 base64url 格式的字符串
        function base64urlDecode(input) {
            try {
                // 移除 URL 中可能存在的其他参数
                let inputBase64 = input.replace("otpauth-migration://offline?data=", "");
                inputBase64 = queryUnescape(inputBase64);
                
                console.log('处理后的 base64 数据:', inputBase64);

                // 解码 base64 为二进制字符串
                const inputUtf8str = window.atob(inputBase64);
                console.log('解码后的字符串长度:', inputUtf8str.length);

                // 转换为 Uint8Array
                const buf = new Uint8Array(inputUtf8str.length);
                for (let i = 0; i < inputUtf8str.length; i++) {
                    buf[i] = inputUtf8str.charCodeAt(i);
                }
                
                console.log('转换为 Uint8Array 后的长度:', buf.length);
                return buf;
            } catch (e) {
                console.error('Base64 解码错误:', e);
                throw new Error('无效的 base64 字符串: ' + e.message);
            }
        }

        // 生成 UUID v4
        function generateUUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16).toUpperCase();
            });
        }

        // 解析 Google Authenticator 数据
        async function parseGoogleAuthData(qrData) {
            try {
                console.log('收到的 QR 数据:', qrData);
                
                if (!qrData.startsWith('otpauth-migration://offline?data=')) {
                    throw new Error('不支持的二维码格式');
                }

                // 解码 base64url 数据
                const binaryData = base64urlDecode(qrData);
                console.log('解码后的二进制数据长度:', binaryData.length);
                
                if (!binaryData || binaryData.length === 0) {
                    throw new Error('解码后的数据为空');
                }

                // 解析 protobuf 数据
                const parsed = protobuf.parse(protobufSchema);
                console.log('解析的 protobuf schema:', parsed);

                const decoded = parsed.root.MigrationPayload.decode(binaryData);
                console.log('解码的 protobuf 消息:', decoded);

                const data = parsed.root.MigrationPayload.toObject(decoded, {
                    enums: String,
                    longs: String,
                    defaults: true,
                    arrays: true,
                    objects: true,
                    oneofs: true
                });
                
                console.log('转换后的数据:', JSON.stringify(data, null, 2));

                if (!data.otpParameters || !data.otpParameters.length) {
                    throw new Error('未找到有效的 OTP 参数');
                }

                // 处理每个 OTP 参数
                return data.otpParameters.map(param => {
                    if (!param.secret) {
                        console.warn('警告: 发现空的 secret:', param);
                        return null;
                    }

                    try {
                        const secret = base32Encode(param.secret);
                        console.log('处理的参数:', {
                            name: param.name,
                            issuer: param.issuer,
                            algorithm: param.algorithm,
                            digits: param.digits,
                            secret: secret
                        });
                        
                        // 确保 digits 是有效值
                        let digits = 6; // 默认使用 6 位
                        if (param.digits === 8) {
                            digits = 8;
                        }
                        
                        return {
                            type: param.type === 'OTP_HOTP' ? 'hotp' : 'totp',
                            label: param.name || '',
                            secret: secret,
                            issuer: param.issuer || '',
                            name: param.name || '',
                            algorithm: 'SHA1', // Google Authenticator 主要使用 SHA1
                            digits: digits,
                            period: 30
                        };
                    } catch (e) {
                        console.error('处理 secret 时出错:', e);
                        return null;
                    }
                }).filter(Boolean); // 移除空值

            } catch (e) {
                console.error('解析错误:', e);
                throw new Error('无法解析 OTP 数据: ' + e.message);
            }
        }

        // 全局函数声明
        window.removeFile = function(index) {
            selectedFiles.splice(index, 1);
            updatePreview();
            updateStatus();
            convertButton.disabled = selectedFiles.length === 0;
        };

        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const previewArea = document.getElementById('previewArea');
        const previewGrid = document.getElementById('previewGrid');
        const status = document.getElementById('status');
        const convertButton = document.getElementById('convertButton');
        const loading = document.getElementById('loading');
        const resultArea = document.getElementById('resultArea');
        const result = document.getElementById('result');
        const copyButton = document.getElementById('copyButton');

        let selectedFiles = [];

        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#4CAF50';
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = '#ccc';
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#ccc';
            const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
            if (files.length > 0) {
                handleFiles(files);
            }
        });

        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
            if (files.length > 0) {
                handleFiles(files);
            }
        });

        convertButton.addEventListener('click', async () => {
            loading.style.display = 'block';
            resultArea.style.display = 'none';
            convertButton.disabled = true;

            try {
                const allOtpData = [];
                for (const file of selectedFiles) {
                    const imageData = await loadImage(file);
                    const qrData = await decodeQRCode(imageData);
                    
                    if (!qrData) {
                        throw new Error(\`无法解析图片: \${file.name}\`);
                    }

                    const otpDataList = await parseGoogleAuthData(qrData);
                    allOtpData.push(...otpDataList);
                }

                if (allOtpData.length === 0) {
                    throw new Error('没有找到有效的二维码数据');
                }

                const bitwardenData = convertToBitwardenFormat(allOtpData);
                result.textContent = JSON.stringify(bitwardenData, null, 2);
                resultArea.style.display = 'block';
            } catch (error) {
                result.textContent = '解析失败：' + error.message;
                resultArea.style.display = 'block';
            } finally {
                loading.style.display = 'none';
                convertButton.disabled = false;
            }
        });

        copyButton.addEventListener('click', () => {
            navigator.clipboard.writeText(result.textContent)
                .then(() => {
                    copyButton.textContent = '已复制！';
                    setTimeout(() => {
                        copyButton.textContent = '复制结果';
                    }, 2000);
                });
        });

        function handleFiles(files) {
            selectedFiles = [...selectedFiles, ...files];
            updatePreview();
            updateStatus();
            convertButton.disabled = selectedFiles.length === 0;
        }

        function updatePreview() {
            previewGrid.innerHTML = '';
            selectedFiles.forEach((file, index) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const previewItem = document.createElement('div');
                    previewItem.className = 'preview-item';
                    previewItem.innerHTML = \`
                        <img src="\${e.target.result}" alt="预览">
                        <button class="remove-btn" onclick="removeFile(\${index})">×</button>
                    \`;
                    previewGrid.appendChild(previewItem);
                };
                reader.readAsDataURL(file);
            });
            previewArea.style.display = selectedFiles.length > 0 ? 'block' : 'none';
        }

        function updateStatus() {
            status.textContent = \`已选择 \${selectedFiles.length} 张图片\`;
        }

        // 将字节数组转换为 base32 字符串
        function bytesToBase32(bytes) {
            if (!bytes || !bytes.length) return '';
            
            // 使用标准的 base32 字符集
            const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
            let bits = 0;
            let value = 0;
            let output = '';

            // 处理每个字节
            for (let i = 0; i < bytes.length; i++) {
                value = (value << 8) | bytes[i];
                bits += 8;

                // 每 5 位生成一个 base32 字符
                while (bits >= 5) {
                    output += ALPHABET[(value >>> (bits - 5)) & 31];
                    bits -= 5;
                }
            }

            // 处理剩余的位
            if (bits > 0) {
                output += ALPHABET[(value << (5 - bits)) & 31];
            }

            // 添加填充
            while (output.length % 8) {
                output += '=';
            }

            return output;
        }

        // 转换为 Bitwarden 格式
        function convertToBitwardenFormat(otpDataList) {
            return {
                encrypted: false,
                items: otpDataList.map(otpData => {
                    // 从 label 中提取用户名
                    let username = '';
                    let name = otpData.issuer || '';
                    
                    if (otpData.label) {
                        const labelParts = otpData.label.split(':');
                        if (labelParts.length > 1) {
                            username = labelParts[1].trim();
                            if (!name) {
                                name = labelParts[0].trim();
                            }
                        } else {
                            username = labelParts[0].trim();
                        }
                    }

                    // 如果 issuer 为空但有 name，使用 name
                    if (!name && otpData.name) {
                        name = otpData.name;
                    }

                    // 确保 digits 是有效值（6 或 8）
                    let digits = 6; // 默认使用 6 位
                    if (otpData.digits === 8) {
                        digits = 8;
                    }

                    // 构建 TOTP URI
                    const totpUri = \`otpauth://totp/\${encodeURIComponent(name)}:\${encodeURIComponent(username)}?secret=\${otpData.secret}&issuer=\${encodeURIComponent(name)}&algorithm=\${otpData.algorithm}&digits=\${digits}&period=\${otpData.period}\`;

                    return {
                        favorite: false,
                        id: generateUUID(),
                        type: 1,
                        name: name || 'Unknown',
                        login: {
                            username: username,
                            totp: totpUri
                        }
                    };
                })
            };
        }

        function loadImage(file) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const imageData = ctx.getImageData(0, 0, img.width, img.height);
                    resolve(imageData);
                };
                img.onerror = reject;
                img.src = URL.createObjectURL(file);
            });
        }

        function decodeQRCode(imageData) {
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            return code ? code.data : null;
        }
    </script>
</body>
</html>`;

// Cloudflare Worker 处理函数
export default {
    async fetch(request) {
        if (request.method === 'GET') {
            return new Response(HTML_TEMPLATE, {
                headers: { 
                    'Content-Type': 'text/html',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                },
            });
        }

        return new Response('Method not allowed', { status: 405 });
    },
}; 

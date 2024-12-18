const chatContainer = document.getElementById('chatContainer');
const inputText = document.getElementById('inputText');
const sendButton = document.getElementById('sendButton');

// 创建一个全局变量来存储当前的消息框
let currentMessageDiv = null;

// 获取当前时间字符串
function getCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// 添加消息到聊天窗口
function addMessage(content, type) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message', type);

  const avatarImg = document.createElement('img');
  avatarImg.classList.add('avatar');
  avatarImg.src = type === 'user' ? 'image/user.jpg' : 'image/server.jpg'; // 替换为实际头像路径

  const contentDiv = document.createElement('div');
  contentDiv.classList.add('content');
  contentDiv.textContent = content;

  const timestampDiv = document.createElement('div');
  timestampDiv.classList.add('timestamp');
  timestampDiv.textContent = getCurrentTime();

  messageDiv.appendChild(avatarImg);
  messageDiv.appendChild(contentDiv);
  messageDiv.appendChild(timestampDiv);

  chatContainer.appendChild(messageDiv);

  // 自动滚动到底部
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// 创建 Web Worker 实例
const worker = new Worker('worker.js');

// 监听 Worker 返回的消息
worker.onmessage = function (e) {
  const { action, message } = e.data;

  if (action === 'printMessage') {
    if (!currentMessageDiv) {
      // 如果当前消息框尚未创建，则创建一个新的
      currentMessageDiv = createMessageDiv('server');
    }
    typeWriter(message, currentMessageDiv).then(() => {
      worker.postMessage({ action: 'finishWriting' });  // 通知 Worker 打印完成
    });
  } else if (action === 'finish') {
    console.log('所有消息已打印完毕');
  }
};

// 发送消息
sendButton.addEventListener('click', () => {
  const userInput = inputText.value.trim();
  if (!userInput) return;

  // 显示用户消息
  addMessage(userInput, 'user');
  inputText.value = '';

  // 发送请求到服务端
  fetch('http://10.77.110.170:5000/api/respond', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: userInput }),
  })
    .then((response) => {
      currentMessageDiv = null;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // 逐步读取流中的数据
      reader.read().then(function processText({ done, value }) {
        if (done) return;

        // 解码流数据
        let now_read = decoder.decode(value, { stream: true });
        now_read = now_read.replace(/data: /g, '');
        let json_array = now_read.split(/\n\s*\n/);

        try {
          for (let i = 0; i < json_array.length; i++) {
            if (json_array[i] === '[DONE]' || json_array[i].length === 0) break;
            const parsedData = JSON.parse(json_array[i]);
            if (parsedData && parsedData.choices && parsedData.choices[0].delta) {
              const aiContent = parsedData.choices[0].delta.content;
              if (aiContent) {
                // 将新消息加入到队列
                worker.postMessage({ action: 'enqueue', data: aiContent });
              }
            }
          }
        } catch (error) {
          console.error('JSON解析错误:', error);
        }

        // 继续读取数据流
        reader.read().then(processText);
      });
    })
    .catch((error) => {
      console.error('请求失败:', error);
      addMessage('请求失败，请稍后再试。', 'server');
    });
});

// 打字机效果
function typeWriter(text, messageDiv) {
  return new Promise((resolve) => {
    const contentDiv = messageDiv.querySelector('.content');
    let i = 0;
    const interval = setInterval(() => {
      contentDiv.textContent += text[i];
      i++;
      if (i === text.length) {
        clearInterval(interval);
        resolve(); // 打字机效果结束，调用 resolve
      }
    }, 50); // 每50毫秒显示一个字符
  });
}

// 创建消息框
function createMessageDiv(type) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message', type);

  const avatarImg = document.createElement('img');
  avatarImg.classList.add('avatar');
  avatarImg.src = type === 'user' ? 'image/user.jpg' : 'image/server.jpg'; // 替换为实际头像路径

  const contentDiv = document.createElement('div');
  contentDiv.classList.add('content');
  messageDiv.appendChild(avatarImg);
  messageDiv.appendChild(contentDiv);

  const timestampDiv = document.createElement('div');
  timestampDiv.classList.add('timestamp');
  timestampDiv.textContent = getCurrentTime();
  messageDiv.appendChild(timestampDiv);

  chatContainer.appendChild(messageDiv);

  // 自动滚动到底部
  chatContainer.scrollTop = chatContainer.scrollHeight;

  return messageDiv;
}

// 按 Enter 键发送消息
inputText.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendButton.click();
  }
});


// 定义背景图片数组
const backgrounds = [
  'image/background2.jpg',
  'image/background3.webp'
];

// 当前背景图片索引
let currentBackgroundIndex = 0;

// 函数：切换背景
function changeBackground() {
  // 设置新的背景图片，并使用 cover 保证背景图片自适应容器
  chatContainer.style.backgroundImage = `url(${backgrounds[currentBackgroundIndex]})`;
  chatContainer.style.backgroundSize = 'cover';         // 使图片覆盖整个容器
  chatContainer.style.backgroundPosition = 'center';    // 背景居中显示
  chatContainer.style.backgroundRepeat = 'no-repeat';   // 防止背景图重复
  
  // 循环背景图片索引
  currentBackgroundIndex = (currentBackgroundIndex + 1) % backgrounds.length;
}

// 设置每隔 5 秒切换一次背景
setInterval(changeBackground, 5000);

// 初始背景设置
changeBackground();

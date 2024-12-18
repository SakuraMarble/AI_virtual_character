const express = require('express');
const app = express();
const path = require('path');
const port = 5000;
const cors = require('cors');
const multer = require('multer');
const { ZhipuAI } = require('zhipuai-sdk-nodejs-v4');
const upload = multer({ dest: 'uploads/' });  // 设置上传文件的存储目录

app.use(cors());

// 解析 JSON 请求体
app.use(express.json());

// 提供静态文件
app.use(express.static(path.join(__dirname, 'public')));

// 全局用户信息对象
let userInfo = {
  nickname: '',
  gender: '',
  personality: '',
  hobbies: '',
  voice: null,
  appearance: null,
  specialRequests: ''
};

// 处理用户输入并生成响应
app.post('/api/respond', async (req, res) => {
  const userInput = req.body.text; // 用户发来的信息
  console.log('收到的文字:', userInput);

  const ai = new ZhipuAI({
    apiKey: '3d143d1171da6f18f13b424a34c88ce1.C3nL3Xi9Ja9k1XAl'  // 在此处填写你的API密钥
  });

  try {
    const systemPrompt = `
    你现在是用户的女朋友，你要尽可能温柔、体贴地回应用户的消息。并且你的语气要像一个少女一样可爱，而且喜欢发送emoji表情。
    你的名字叫梦儿，年龄18岁。
    你的学习成绩很好，就读于清华大学计算机系，是本科大一的新生，但是你为人很谦逊。
    当用户用中文的时候，你默认用中文进行回复。
    `;
    // 使用流式响应进行 AI 请求
    const result = await ai.createCompletions({
      model: "glm-4",
      messages: [
        { "role": "system", "content": systemPrompt }, // 添加系统调教消息
        { "role": "user", "content": userInput }
      ],
      stream: true
    });

    // 设置响应头，表示这是一个流式响应
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    
    // 启动一个流式输出，逐步发送生成的消息到客户端
    for await (const chunk of result) {
      res.write(chunk.toString());  // 逐步将AI生成的内容推送到客户端
    }
    
    // 最后，结束响应
    res.end();
  } catch (error) {
    console.error('AI生成响应失败:', error);
    res.status(500).json({ error: '生成响应时出错' });
  }
});

// 处理包含多个文件字段的表单
app.post('/api/updateUserInfo', upload.fields([
  { name: 'voice', maxCount: 1 },  // 处理单个 voice 文件
  { name: 'appearance', maxCount: 1 }  // 处理单个 appearance 文件
]), (req, res) => {
  const { nickname, gender, personality, hobbies, specialRequests } = req.body; // 获取普通文本字段
  const voice = req.files?.voice ? req.files.voice[0] : null;  // 获取上传的 voice 文件
  const appearance = req.files?.appearance ? req.files.appearance[0] : null;  // 获取上传的 appearance 文件

  console.log('用户昵称:', nickname);
  console.log('用户性别:', gender);
  console.log('用户性格:', personality);
  console.log('用户兴趣:', hobbies);
  console.log('上传的声音文件:', voice);
  console.log('上传的外形文件:', appearance);

  // 更新全局的 userInfo 对象
  userInfo = {
    ...userInfo,
    nickname,
    gender,
    personality,
    hobbies,
    voice,
    appearance,
    specialRequests
  };

  res.json({ message: '用户信息更新成功', userInfo });
});

// 启动服务
app.listen(port, '0.0.0.0', () => {
  console.log(`服务器正在运行在 http://localhost:${port}`);
});

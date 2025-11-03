const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const axios = require("axios");                 // ← 新增
const { init: initDB, Counter } = require("./db");

const logger = morgan("tiny");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(logger);

// 首页
app.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 更新计数
app.post("/api/count", async (req, res) => {
  const { action } = req.body;
  if (action === "inc") {
    await Counter.create();
  } else if (action === "clear") {
    await Counter.destroy({
      truncate: true,
    });
  }
  res.send({
    code: 0,
    data: await Counter.count(),
  });
});

// 获取计数
app.get("/api/count", async (req, res) => {
  const result = await Counter.count();
  res.send({
    code: 0,
    data: result,
  });
});

// 小程序调用，获取微信 Open ID
app.get("/api/wx_openid", async (req, res) => {
  if (req.headers["x-wx-source"]) {
    res.send(req.headers["x-wx-openid"]);
  } else {
    res.status(400).send("not in wechat cloudrun");
  }
});

/** =========================
 *  反向代理到你的后端
 *  云托管： https://你的域名/api/proxy/**  →  http://103.69.129.124/**
 *  支持 GET/POST/PUT/DELETE… 及 Body/Query/Headers 透传
 *  可在“服务设置 → 环境变量”里设 ORIGIN 覆盖默认地址
 *  ========================= */
app.all("/api/proxy/*", async (req, res) => {
  const base = process.env.ORIGIN || "http://103.69.129.124";
  const upstreamPath = req.path.replace(/^\/api\/proxy/, "") || "/";
  const url = base + upstreamPath;

  // 复制并清理请求头
  const headers = { ...req.headers };
  delete headers.host;

  try {
    const r = await axios({
      url,
      method: req.method,
      headers,
      params: req.query,
      data: req.body,
      timeout: 15000,
      validateStatus: () => true, // 按上游原样返回
    });

    // 透传响应头（排除分块头）
    Object.entries(r.headers || {}).forEach(([k, v]) => {
      if (k.toLowerCase() !== "transfer-encoding") res.setHeader(k, v);
    });

    res.status(r.status).send(r.data);
  } catch (e) {
    res.status(502).json({ code: -1, msg: "upstream error", error: String(e.message || e) });
  }
});

const port = process.env.PORT || 80;

async function bootstrap() {
  await initDB();
  app.listen(port, () => {
    console.log("启动成功", port);
  });
}

bootstrap();

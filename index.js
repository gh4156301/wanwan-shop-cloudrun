const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

// 首页健康检查（用于你自己或微信审核）
app.get("/", (req, res) => {
  res.send("CloudRun OK");
});

// 反向代理：把 /api/** 转到你的后端
app.use(
  "/api",
  createProxyMiddleware({
    target: "http://103.69.129.124",   // 你的后端
    changeOrigin: true,
    xfwd: true,                        // 透传真实IP
    ws: true,                          // 如需 WebSocket
    pathRewrite: { "^/api": "/api" },  // 如后端没有 /api 前缀可改成 { "^/api": "" }
    onProxyReq(proxyReq, req, res) {
      // 视情况加鉴权头
      // proxyReq.setHeader("X-From", "wx-cloudrun");
    }
  })
);

// 云托管会注入 PORT
const port = process.env.PORT || 80;
app.listen(port, () => console.log("RUNNING on", port));

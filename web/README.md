# 血染钟楼 · Web

基于 Vite + React + TypeScript + Tailwind + shadcn/ui 的前端页面，
对接同仓库后端的 `/api/*` 接口。

## 开发

```bash
cd web
npm install
npm run dev          # http://localhost:5173，自动代理 /api -> http://localhost:8090
```

同时启动后端（另一个终端）：

```bash
docker compose up -d --build
```

## 构建

```bash
npm run build        # 产物输出到 web/dist
npm run preview
```

## 功能

- 按 **角色集 / 角色类别 / 名称** 筛选角色
- 分页（每页 50）
- 点击卡片查看角色详情（图片 + wiki 小节 + 外链）

# IBAN DevTools

一款为开发者设计的 IBAN 测试数据生成、批量导出与校验工具。所有计算都在浏览器本地完成，不上传、不存储任何输入。

[![Live Demo](https://img.shields.io/badge/Live_Demo-open-c9f46b?style=flat-square&labelColor=111817)](https://iban-devtools-lab.tian-r-king.chatgpt.site)
[![Vercel Ready](https://img.shields.io/badge/Vercel-ready-000000?style=flat-square&logo=vercel)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftianrking%2Fiban-devtools)
[![Cloudflare Ready](https://img.shields.io/badge/Cloudflare-Workers-F48120?style=flat-square&logo=cloudflare&logoColor=white)](https://deploy.workers.cloudflare.com/?url=https://github.com/tianrking/iban-devtools)
[![CI](https://img.shields.io/github/actions/workflow/status/tianrking/iban-devtools/ci.yml?style=flat-square&label=build)](https://github.com/tianrking/iban-devtools/actions)

![IBAN DevTools social preview](public/og.png)

## 功能

- 支持德国、法国、英国、荷兰、西班牙、意大利、瑞士等 15 个国家
- 使用 ISO 13616 / MOD-97 算法生成合法校验码
- 单条生成、自定义 BBAN、格式化与 Raw 输出
- 一次生成 5–1000 条数据，支持 JSON、CSV 和剪贴板导出
- 实时校验 IBAN，并拆解国家代码、校验码、银行代码与账号
- 纯前端计算，无接口请求、Cookie 或持久化存储
- 同一套源码可部署到 Vercel、Cloudflare Workers 和 OpenAI Sites

## 本地开发

需要 Node.js 22.13 或更高版本。

```bash
git clone git@github.com:tianrking/iban-devtools.git
cd iban-devtools
npm ci
npm run dev
```

访问终端输出的本地地址即可使用。

## 构建与检查

```bash
# Cloudflare / vinext 构建
npm run build:cloudflare

# Vercel / 原生 Next.js 构建
npm run build:vercel

# 运行完整检查
npm run check
```

GitHub Actions 会在每次推送与 Pull Request 时同时验证两个目标平台。

## 一键部署

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftianrking%2Fiban-devtools)

也可以导入本仓库。根目录的 `vercel.json` 会选择 Next.js 并执行 `npm run build:vercel`，无需环境变量。

### Cloudflare Workers

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/tianrking/iban-devtools)

使用 Wrangler 部署：

```bash
npm run deploy:cloudflare
```

`wrangler.jsonc` 已配置 Worker 入口、静态资源目录和可观测性，无需数据库或其他绑定。

## 项目结构

```text
app/
├── page.tsx         # 生成器、批量导出与校验交互
├── globals.css      # 产品视觉与响应式样式
└── layout.tsx       # 页面元数据与社交分享
public/
└── og.png           # GitHub / Open Graph 分享预览
worker/
└── index.ts         # Cloudflare Worker 入口
vercel.json          # Vercel 构建配置
wrangler.jsonc       # Cloudflare Workers 配置
```

## 算法说明

IBAN 校验基于 ISO 13616：

1. 将前四位移动到字符串末尾。
2. 把字母转换为数字，`A = 10`，…，`Z = 35`。
3. 使用逐位分段求模，避免依赖 `BigInt`。
4. 合法 IBAN 的 MOD-97 余数为 `1`。

生成结果只保证格式和校验算法合法，不代表真实银行账户。

## 免责声明

本工具生成的 IBAN 仅供软件开发与测试使用，符合 ISO 13616 标准校验算法，但不代表真实的银行账户。

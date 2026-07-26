# IBAN DevTools

一款为开发者设计的完整跨国测试身份、IBAN、KYC 与支付测试数据工作台。网页生成默认完全在浏览器本地完成，也提供可选的 Edge API 与 CLI。

[![Vercel Ready](https://img.shields.io/badge/Vercel-ready-000000?style=flat-square&logo=vercel)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftianrking%2Fiban-devtools)
[![Cloudflare Ready](https://img.shields.io/badge/Cloudflare-Workers-F48120?style=flat-square&logo=cloudflare&logoColor=white)](https://deploy.workers.cloudflare.com/?url=https://github.com/tianrking/iban-devtools)
[![CI](https://img.shields.io/github/actions/workflow/status/tianrking/iban-devtools/ci.yml?style=flat-square&label=build)](https://github.com/tianrking/iban-devtools/actions)

![IBAN DevTools social preview](public/og.png)

## 功能

- 内置 89 个 IBAN 国家/地区结构，覆盖 SEPA 与全球 IBAN 注册格式
- 使用 ISO 13616 / MOD-97 算法生成合法校验码
- 支持合法、错误校验码、错误长度、非法字符、错误 BBAN、小写和连字符测试用例
- 单条生成、自定义 BBAN、格式化与 Raw 输出，并支持分层错误诊断
- 国家、州/地区、城市三级联动，确保本地化数据落在所选区域
- 国家搜索、SEPA/全球筛选、币种与注册表结构提示
- 支持随机、指定与区间年龄策略，以及性别、姓名、街道和邮编覆盖
- 支持固定随机种子，可稳定复现同一套回归测试数据
- 完整身份包含证件、护照、地址、保险、税务、IBAN、BIC、沙盒银行卡、企业、薪资和 KYC 字段
- 支付字段包含 SCT/LOCAL、End-to-End ID、RF Creditor Reference、Purpose Code、VoP 与结构化地址
- 完整身份支持 1–1000 条批量生成，25 条分页预览
- 内置 KYC、支付、薪资、电商、SEPA、API 边界和数据库种子场景
- 整批导出 JSON、NDJSON、完整字段 CSV、TypeScript、Zod、JSON Schema、Playwright、Cypress、Postman、`.env`、SQL 与 Python
- 跟随当前国家的上下文场景预设、配置恢复/重置、可复现 URL、深色模式与 `⌘K` 命令面板
- 移动端固定生成操作栏，长表单中无需反复滚动寻找生成按钮
- 支持离线安装的 PWA；浏览器工作台不上传输入，仅在本地保存最后一次配置
- 提供 CORS Edge API、命令行工具与每月 SWIFT 注册表版本提醒
- 同一套源码可部署到 Vercel 和 Cloudflare Workers

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

# CLI
npm run cli -- generate --country DE --count 10 --seed qa-01 --format json
npm run cli -- validate DE89370400440532013000
npm run cli -- countries
```

GitHub Actions 会在每次推送与 Pull Request 时同时验证两个目标平台。

## API

三个 Route Handler 可直接运行在 Vercel Edge 或 Cloudflare Workers：

```bash
# 生成一条或一个批次（最大 1000）
curl 'http://localhost:3000/api/generate?country=FR&count=10&seed=qa-01&scenario=sepa'

# 分层校验
curl 'http://localhost:3000/api/validate?iban=DE89370400440532013000'

# 获取国家注册表
curl 'http://localhost:3000/api/countries'
```

`/api/generate` 与 `/api/validate` 同时支持 JSON `POST`，并返回 `Access-Control-Allow-Origin: *`，便于 Postman、Cypress 和 Playwright 直接调用。

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
├── api/             # Edge generate / validate / countries 接口
├── page.tsx         # 身份工作台、场景、批量导出与校验交互
├── globals.css      # 产品视觉与响应式样式
├── pwa-register.tsx # 离线应用注册
└── layout.tsx       # 页面元数据、PWA 与社交分享
lib/
├── iban-core.ts        # 89 国注册表、MOD-97、生成与分层校验
├── exporters.ts        # 12 种完整批量开发者导出格式
├── global-test-data.ts # 完整测试身份、KYC 与支付数据
└── german-test-data.ts # 德国 Steuer-ID 校验算法
bin/
└── iban-devtools.mjs   # Node.js CLI
public/
├── manifest.webmanifest
├── sw.js
└── og.png
scripts/
└── check-iban-registry.mjs
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

德国 Steuer-ID 使用 ISO/IEC 7064 MOD 11,10 校验算法，并采用经典的十位主体数字重复规则。其他国家的税务与保险字段明确标记为格式测试值。沙盒银行卡为公开测试卡，不能用于真实扣款。

## 免责声明

本工具生成的跨国身份、IBAN、保险与银行卡字段仅供软件开发、测试和教学使用。格式或校验码通过不代表真实账户、真实个人或官方签发记录。

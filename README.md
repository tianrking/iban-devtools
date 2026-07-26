# IBAN DevTools

一款为开发者设计的完整跨国测试身份与 IBAN 生成、批量导出及校验工具。所有计算都在浏览器本地完成，不上传、不存储任何输入。

[![Vercel Ready](https://img.shields.io/badge/Vercel-ready-000000?style=flat-square&logo=vercel)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftianrking%2Fiban-devtools)
[![Cloudflare Ready](https://img.shields.io/badge/Cloudflare-Workers-F48120?style=flat-square&logo=cloudflare&logoColor=white)](https://deploy.workers.cloudflare.com/?url=https://github.com/tianrking/iban-devtools)
[![CI](https://img.shields.io/github/actions/workflow/status/tianrking/iban-devtools/ci.yml?style=flat-square&label=build)](https://github.com/tianrking/iban-devtools/actions)

![IBAN DevTools social preview](public/og.png)

## 功能

- 支持德国、法国、英国、荷兰、西班牙、意大利、瑞士等 15 个国家
- 使用 ISO 13616 / MOD-97 算法生成合法校验码
- 单条生成、自定义 BBAN、格式化与 Raw 输出
- 国家、州/地区、城市三级联动，确保本地化数据落在所选区域
- 支持随机、指定与区间年龄策略，以及性别、姓名、街道和邮编覆盖
- 支持固定随机种子，可稳定复现同一套回归测试数据
- 实时校验 IBAN，并拆解国家代码、校验码、银行代码与账号
- 覆盖 15 个 IBAN 国家，并同步本地化姓名、城市、邮编、街道、电话和税务字段
- 同一份身份包含测试证件号、保险号、合法 IBAN、账户号、BIC、沙盒银行卡和雇佣信息
- 完整身份支持 1–50 条批量生成及 JSON、CSV 导出
- 纯前端计算，无接口请求、Cookie 或持久化存储
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
├── page.tsx         # 完整身份、IBAN、批量导出与校验交互
├── globals.css      # 产品视觉与响应式样式
└── layout.tsx       # 页面元数据与社交分享
lib/
├── global-test-data.ts # 15 国本地化完整测试身份生成
└── german-test-data.ts # 德国 Steuer-ID 校验算法
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

德国 Steuer-ID 使用 ISO/IEC 7064 MOD 11,10 校验算法，并采用经典的十位主体数字重复规则。其他国家的税务与保险字段明确标记为格式测试值。沙盒银行卡为公开测试卡，不能用于真实扣款。

## 免责声明

本工具生成的跨国身份、IBAN、保险与银行卡字段仅供软件开发、测试和教学使用。格式或校验码通过不代表真实账户、真实个人或官方签发记录。

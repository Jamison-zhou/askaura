# 此镜部署说明

此镜前端是纯静态站点，没有构建步骤。部署时把仓库根目录作为发布目录即可。

## 推荐路径

### Cloudflare Pages

1. 连接 GitHub 仓库。
2. Framework preset 选择 `None`。
3. Build command 留空。
4. Output directory 填 `/` 或留空。
5. 部署完成后记录公网域名，例如 `https://cijing.pages.dev`。

仓库根目录的 `_headers` 会被 Cloudflare Pages 读取，用于基础安全响应头。

### Vercel

1. 导入 GitHub 仓库。
2. Framework preset 选择 `Other`。
3. Build command 留空。
4. Output directory 留空。
5. 部署完成后记录公网域名，例如 `https://cijing.vercel.app`。

## Supabase Auth 配置

进入 Supabase Dashboard：

`Authentication` -> `URL Configuration`

设置：

- Site URL：正式公网地址，例如 `https://cijing.pages.dev`
- Redirect URLs：
  - `https://cijing.pages.dev`
  - `https://cijing.pages.dev/`
  - `http://127.0.0.1:4173`
  - `http://127.0.0.1:4173/`

本地调试时可以保留 `127.0.0.1`；正式给用户使用时必须使用公网 HTTPS 地址。

## 开发阶段账号建议

当前 Supabase 内置邮件服务有很低的邮件发送限流。开发阶段建议：

1. 在 `Authentication` -> `Providers` -> `Email` 里关闭 `Confirm email`。
2. 用新邮箱重新注册，注册后直接登录。
3. 等正式上线后再接自定义 SMTP。

正式上线建议接 Resend、Postmark、阿里云邮件或腾讯企业邮 SMTP，再打开邮箱确认。

## 部署后检查

1. 打开公网首页，确认三种模式可切换。
2. 抽一次塔罗，确认有结果并进入回看。
3. 打开当下，刷新后确认当天锚点不变。
4. 注册/登录账号，确认回看记录可以同步。
5. 在 Supabase Dashboard 确认 `rill_reflection_records` 只出现当前用户自己的记录。

## Edge Function

前端部署不需要重新部署 Edge Function。只有修改 `supabase/functions/**/*.ts` 时才需要执行：

```bash
supabase functions deploy reading --project-ref icvegpfnpkyrebtojoca --no-verify-jwt
```

数据库迁移修改后执行：

```bash
supabase db push --linked
```

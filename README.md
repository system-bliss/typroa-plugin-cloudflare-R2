# typroa-plugin-cloudflare-R2

Typora `Custom Command` 图片上传插件，将本地图片自动上传到 Cloudflare R2 图床，并替换为自定义域名 URL。

## 功能特性

- 支持 Typora 自动上传和手动补传共用同一条上传链路
- 基于 Cloudflare R2 S3 兼容接口上传图片
- 可自定义对象命名模板（支持日期、文件名、内容哈希等变量）
- 批量上传保持输入顺序，支持可配置并发数
- 可配置上传重试次数
- 区分配置错误、文件错误和上传错误，返回对应退出码
- 支持 `env:` 语法从环境变量读取密钥，避免明文写入配置文件

## 快速开始

```bash
npm install
npm run build
```

### 配置

复制示例配置并编辑：

```bash
cp config.example.json config.json
```

配置项说明：

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `bucket` | R2 Bucket 名称 | — |
| `endpoint` | R2 S3 API 端点 | — |
| `region` | 区域 | `auto` |
| `accessKeyId` | R2 API 密钥 ID（支持 `env:R2_ACCESS_KEY_ID`） | — |
| `secretAccessKey` | R2 API 密钥（支持 `env:R2_SECRET_ACCESS_KEY`） | — |
| `publicBaseUrl` | 自定义域名（如 `https://img.example.com`） | — |
| `keyPrefix` | 对象键前缀 | `typora/` |
| `namingTemplate` | 对象命名模板 | `{keyPrefix}/{YYYY}/{MM}/{DD}/{filename}-{hash8}.{ext}` |
| `cacheControl` | 缓存策略 | `public, max-age=31536000, immutable` |
| `timeoutMs` | 上传超时（毫秒） | `20000` |
| `retryTimes` | 上传失败重试次数 | `2` |

密钥建议通过环境变量注入：

```bash
export R2_ACCESS_KEY_ID="your-access-key-id"
export R2_SECRET_ACCESS_KEY="your-secret-access-key"
```

然后在 `config.json` 中引用：

```json
{
  "accessKeyId": "env:R2_ACCESS_KEY_ID",
  "secretAccessKey": "env:R2_SECRET_ACCESS_KEY"
}
```

### 命名模板变量

| 变量 | 说明 | 示例值 |
|------|------|--------|
| `{keyPrefix}` | 配置中的 keyPrefix | `typora` |
| `{YYYY}` | 四位年份 | `2026` |
| `{MM}` | 两位月份 | `03` |
| `{DD}` | 两位日期 | `27` |
| `{filename}` | 清洗后的文件名（去扩展名） | `screenshot` |
| `{hash}` / `{hash8}` | 文件内容 MD5 前 8 位 | `4fa91c2d` |
| `{ext}` | 文件扩展名 | `png` |

## Typora 接入

在 Typora 的「偏好设置 → 图片 → 上传服务设定」中选择 **Custom Command**，命令填写：

```bash
node /path/to/typroa-plugin-cloudflare-R2/dist/cli/index.js --config /path/to/config.json
```

支持的上传场景：
- 粘贴/拖拽图片自动上传
- 右键图片 → 上传图片
- 格式 → 图片 → 上传所有本地图片

## 退出码

| 退出码 | 含义 |
|--------|------|
| `0` | 整批上传成功 |
| `1` | 未收到图片路径参数 |
| `2` | 配置错误 |
| `3` | 文件错误（不存在或不可读） |
| `4` | 上传错误 |
| `5` | 未知错误 |

## 开发

```bash
# 运行测试
npm test

# 监听模式
npm run test:watch

# 构建
npm run build
```

## 项目结构

```
src/
  core/      上传核心逻辑（配置、哈希、键生成、上传、URL）
  cli/       Typora 命令行适配层
  shared/    通用类型定义
tests/       测试用例（Vitest）
```

## 许可证

MIT
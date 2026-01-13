# GitFlow 流程概述

## 简介

本项目实现了一个完整的 GitFlow 自动化流程，用于管理项目的代码版本、分支管理和自动化发布。该流程基于语义化版本控制（Semantic Versioning）和标准的 GitFlow 工作流。

## 核心特性

- ✅ **自动化分支管理**：自动创建和管理开发分支和发布分支
- ✅ **语义化版本控制**：支持 major.minor.patch 版本号管理
- ✅ **多平台支持**：支持 GitHub 和 Gitee
- ✅ **自动冲突检测**：自动检测和处理代码冲突
- ✅ **云构建发布**：集成云构建和自动化发布流程
- ✅ **智能版本升级**：根据线上版本自动升级版本号

## 主要流程

### 1. 初始化流程 (prepare + init)

**入口方法**: `git.prepare()` → `git.init()`

- 配置 Git 服务器（GitHub/Gitee）
- 创建或检查远程仓库
- 初始化本地 Git 仓库
- 配置远程仓库地址
- 完成初始提交并同步到远程 master 分支

详见：[GitFlow初始化流程.md](./GitFlow初始化流程.md)

### 2. 提交流程 (commit)

**入口方法**: `git.commit()`

- 自动生成开发分支（基于版本号）
- 检查和处理 stash
- 检测代码冲突
- 合并远程 master 分支
- 合并远程开发分支（如果存在）
- 推送开发分支到远程

详见：[GitFlow提交流程.md](./GitFlow提交流程.md)

### 3. 发布流程 (publish)

**入口方法**: `git.publish()`

- 准备发布环境
- 触发云构建
- 执行云发布

详见：[GitFlow发布流程.md](./GitFlow发布流程.md)

## 分支策略

### 分支类型

1. **master 分支**
   - 主分支，存放稳定代码
   - 每次发布后会在此分支打 tag

2. **开发分支 (dev/x.y.z)**
   - 格式：`dev/版本号`
   - 例如：`dev/1.0.0`、`dev/1.2.3`
   - 用于日常开发

3. **发布分支 (release/x.y.z)**
   - 格式：`release/版本号`（以 tag 形式存在）
   - 例如：`release/1.0.0`
   - 用于版本发布

详见：
- [GitFlow分支管理.md](./GitFlow分支管理.md) - 分支策略和命名规范
- [GitFlow版本管理.md](./GitFlow版本管理.md) - 版本管理规则和逻辑

## 版本管理规则

### 版本号格式

遵循 [Semantic Versioning](https://semver.org/) 规范：

- **格式**：`MAJOR.MINOR.PATCH`
- **示例**：`1.0.0`、`2.1.3`、`0.1.0`

### 版本升级规则

- **Major (主版本号)**：不兼容的 API 修改
- **Minor (次版本号)**：向下兼容的功能性新增
- **Patch (修订号)**：向下兼容的问题修正

### 版本比较逻辑

系统会自动比较本地版本和线上最新版本：

1. 如果本地版本 > 线上版本：使用本地版本
2. 如果本地版本 < 线上版本：提示用户选择升级类型（patch/minor/major）
3. 如果是新项目：使用初始版本号

## 使用示例

### 完整发布流程

```javascript
const Git = require('@imooc-cli-dev-gd/git');

// 1. 初始化
const git = new Git({
  name: 'my-project',
  version: '1.0.0',
  dir: './project'
}, {
  refreshServer: false,
  refreshToken: false,
  refreshOwner: false,
  buildCmd: 'npm run build'
});

// 2. 准备环境（首次执行）
await git.prepare();

// 3. 提交代码
await git.commit();

// 4. 发布（可选）
await git.publish();
```

### CLI 命令

```bash
# 初始化项目（在项目目录下执行）
imooc init

# 发布项目（在项目目录下执行）
imooc publish

# 强制刷新 Git 服务器配置
imooc publish --refreshServer

# 强制刷新 Token
imooc publish --refreshToken

# 指定构建命令
imooc publish --buildCmd "npm run build:prod"
```

## 目录结构

```
models/git/lib/
├── index.js          # Git 类主文件
├── GitServer.js      # Git 服务器基类
├── Github.js         # GitHub 实现
├── Gitee.js          # Gitee 实现
├── GithubRequest.js  # GitHub API 请求
└── GiteeRequest.js   # Gitee API 请求
```

## 相关文档

- [GitFlow初始化流程.md](./GitFlow初始化流程.md) - 详细的初始化流程说明
- [GitFlow提交流程.md](./GitFlow提交流程.md) - 详细的提交流程说明
- [GitFlow发布流程.md](./GitFlow发布流程.md) - 详细的发布流程说明
- [GitFlow分支管理.md](./GitFlow分支管理.md) - 分支策略和命名规范
- [GitFlow版本管理.md](./GitFlow版本管理.md) - 版本管理规则和逻辑

## 注意事项

1. **首次使用需要配置 Token**
   - GitHub: https://github.com/settings/tokens
   - Gitee: https://gitee.com/personal_access_tokens

2. **确保项目有 package.json**
   - 必须包含 `name`、`version` 字段
   - 必须包含 `scripts.build` 命令（用于发布）

3. **版本号必须符合语义化规范**
   - 格式：`x.y.z`（x、y、z 为数字）

4. **代码冲突需要手动处理**
   - 系统检测到冲突时会抛出错误，需要手动解决后重新执行


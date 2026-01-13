# GitFlow 发布流程

## 概述

发布流程负责将代码进行云构建和云发布，这是整个 GitFlow 流程的最后一步。发布流程会触发远程构建服务，完成代码的编译、打包和部署。

## 流程入口

```javascript
await git.publish();
```

## 详细步骤

### 1. 准备发布环境 (preparePublish)

```javascript
preparePublish()
```

在发布之前，需要准备和验证构建命令。

#### 1.1 验证构建命令

```javascript
if (this.buildCmd) {
  const buildCmdArray = this.buildCmd.split(' ');
  if (buildCmdArray[0] !== 'npm' && buildCmdArray[0] !== 'cnpm') {
    throw new Error('Build命令非法，必须使用npm或cnpm！');
  }
} else {
  this.buildCmd = 'npm run build';  // 默认构建命令
}
```

- **功能**：验证构建命令的合法性
- **要求**：
  - 必须以 `npm` 或 `cnpm` 开头
  - 示例：`npm run build`、`cnpm run build:prod`
- **默认值**：如果没有指定，默认使用 `npm run build`
- **配置方式**：可通过构造函数的 `buildCmd` 参数指定

#### 1.2 支持的构建命令格式

✅ **合法命令**：
- `npm run build`
- `cnpm run build`
- `npm run build:prod`
- `cnpm install && cnpm run build`

❌ **非法命令**：
- `yarn build`（必须以 npm 或 cnpm 开头）
- `pnpm build`
- `make build`

### 2. 初始化云构建 (CloudBuild.init)

```javascript
const cloudBuild = new CloudBuild(this, {
  buildCmd: this.buildCmd,
});
await cloudBuild.init();
```

- **功能**：初始化云构建服务
- **参数**：
  - `this`：Git 实例（包含项目信息）
  - `buildCmd`：构建命令
- **作用**：建立与云构建服务的连接

### 3. 执行云构建 (CloudBuild.build)

```javascript
await cloudBuild.build();
```

- **功能**：触发远程构建和发布流程
- **流程**：
  1. 连接到云构建服务器
  2. 提交构建任务
  3. 等待构建完成
  4. 处理构建结果

## 完整流程图

```
publish()
  ├── preparePublish()           # 准备发布环境
  │    ├── 验证构建命令
  │    │    ├── 指定了 buildCmd → 验证格式
  │    │    └── 未指定 → 使用默认值 'npm run build'
  │    └── 构建命令必须为 npm 或 cnpm
  │
  ├── new CloudBuild()           # 创建云构建实例
  │
  ├── cloudBuild.init()          # 初始化云构建服务
  │    └── 建立连接
  │
  └── cloudBuild.build()         # 执行云构建
       ├── 提交构建任务
       ├── 等待构建完成
       └── 返回构建结果
```

## 使用示例

### 基本使用

```javascript
const git = new Git({
  name: 'my-project',
  version: '1.0.0',
  dir: './my-project'
}, {});

// 完整的发布流程
await git.prepare();
await git.commit();
await git.publish();  // 使用默认构建命令
```

### 指定构建命令

```javascript
const git = new Git({
  name: 'my-project',
  version: '1.0.0',
  dir: './my-project'
}, {
  buildCmd: 'npm run build:prod'  // 指定生产环境构建命令
});

await git.prepare();
await git.commit();
await git.publish();
```

### CLI 命令

```bash
# 使用默认构建命令
imooc publish

# 指定构建命令
imooc publish --buildCmd "npm run build:prod"

# 完整发布流程（包含 prepare、commit、publish）
imooc publish --buildCmd "cnpm run build"
```

## 云构建服务

云构建服务（CloudBuild）负责：

1. **接收构建请求**
   - 获取项目信息
   - 获取构建命令
   - 获取代码仓库信息

2. **执行构建任务**
   - 克隆代码仓库
   - 安装依赖
   - 执行构建命令
   - 处理构建产物

3. **返回构建结果**
   - 构建成功/失败状态
   - 构建日志
   - 构建产物地址

## 前提条件

在执行 `publish()` 之前，必须确保：

1. ✅ **已完成 prepare()**
   - Git 仓库已初始化
   - 远程仓库已配置

2. ✅ **已完成 commit()**
   - 代码已提交到远程仓库
   - 开发分支已推送

3. ✅ **项目包含构建脚本**
   - `package.json` 中必须包含 `scripts.build` 命令
   - 或者通过 `buildCmd` 参数指定

4. ✅ **云构建服务可用**
   - 云构建服务器运行正常
   - 网络连接正常

## 注意事项

1. **构建命令限制**
   - 必须以 `npm` 或 `cnpm` 开头
   - 不支持 `yarn`、`pnpm` 等

2. **构建时间**
   - 云构建可能需要较长时间
   - 请耐心等待构建完成

3. **网络要求**
   - 需要连接到云构建服务器
   - 需要访问代码仓库（GitHub/Gitee）

4. **构建失败处理**
   - 如果构建失败，需要检查构建日志
   - 修复问题后重新执行 `publish()`

5. **构建命令建议**
   - 生产环境：使用 `npm run build:prod`
   - 开发环境：使用 `npm run build:dev`
   - 测试环境：使用 `npm run build:test`

## 错误处理

### 构建命令非法

```javascript
// 错误：构建命令不是 npm 或 cnpm
throw new Error('Build命令非法，必须使用npm或cnpm！');
```

**解决方案**：
```javascript
// 使用合法的构建命令
const git = new Git({
  name: 'my-project',
  version: '1.0.0',
  dir: './my-project'
}, {
  buildCmd: 'npm run build'  // ✅ 正确
  // buildCmd: 'yarn build'  // ❌ 错误
});
```

### 云构建服务连接失败

如果无法连接到云构建服务，会抛出连接错误。

**解决方案**：
1. 检查网络连接
2. 确认云构建服务运行状态
3. 检查防火墙设置

### 构建失败

如果云构建执行失败，需要查看构建日志定位问题。

**解决方案**：
1. 检查构建日志
2. 修复代码问题
3. 重新执行 `publish()`

## 相关文档

- [GitFlow流程概述.md](./GitFlow流程概述.md)
- [GitFlow初始化流程.md](./GitFlow初始化流程.md)
- [GitFlow提交流程.md](./GitFlow提交流程.md)
- [GitFlow方法详解.md](./GitFlow方法详解.md)


# GitFlow 初始化流程

## 概述

初始化流程负责配置 Git 环境、创建远程仓库、初始化本地仓库，并完成首次代码提交。这是整个 GitFlow 流程的第一步。

## 流程入口

```javascript
const git = new Git(projectInfo, options);
await git.prepare();  // 执行完整的准备流程
await git.init();     // 执行初始化流程
```

## 详细步骤

### 1. prepare() - 准备阶段

`prepare()` 方法会依次执行以下步骤：

#### 1.1 检查缓存主目录 (checkHomePath)

```javascript
checkHomePath()
```

- **功能**：创建和检查本地缓存目录
- **目录位置**：
  - 优先使用环境变量 `CLI_HOME_PATH`
  - 否则使用 `~/.imooc-cli-dev`
- **存储内容**：
  - Git 服务器配置（`.git_server`）
  - Token 配置（`.git_token`）
  - 仓库所有者配置（`.git_own`、`.git_login`）

#### 1.2 检查 Git 服务器 (checkGitServer)

```javascript
await checkGitServer()
```

- **功能**：选择或读取 Git 平台配置
- **支持平台**：GitHub、Gitee
- **交互提示**：首次使用会提示选择平台
- **缓存机制**：配置会保存到本地，下次直接使用
- **刷新选项**：可通过 `--refreshServer` 强制重新选择

#### 1.3 检查 Git Token (checkGitToken)

```javascript
await checkGitToken()
```

- **功能**：获取或输入 Git 平台的访问 Token
- **Token 获取地址**：
  - GitHub: https://github.com/settings/tokens
  - Gitee: https://gitee.com/personal_access_tokens
- **交互提示**：首次使用会提示输入 Token
- **缓存机制**：Token 会加密保存到本地
- **刷新选项**：可通过 `--refreshToken` 强制重新输入

#### 1.4 获取用户和组织信息 (getUserAndOrgs)

```javascript
await getUserAndOrgs()
```

- **功能**：通过 API 获取当前用户信息和所属组织列表
- **获取信息**：
  - 用户基本信息（login、name 等）
  - 用户所属的组织列表
- **用途**：用于后续选择仓库归属（个人或组织）

#### 1.5 检查 Git 所有者 (checkGitOwner)

```javascript
await checkGitOwner()
```

- **功能**：选择仓库的归属（个人或组织）
- **选项**：
  - **个人**：仓库归属于当前用户
  - **组织**：从组织列表中选择一个组织
- **交互提示**：首次使用会提示选择
- **刷新选项**：可通过 `--refreshOwner` 强制重新选择

#### 1.6 检查仓库 (checkRepo)

```javascript
await checkRepo()
```

- **功能**：检查远程仓库是否存在，不存在则创建
- **检查逻辑**：
  1. 通过 API 查询仓库是否存在
  2. 如果不存在，自动创建新仓库
  3. 如果存在，获取仓库信息
- **创建类型**：
  - 个人仓库：`gitServer.createRepo(name)`
  - 组织仓库：`gitServer.createOrgRepo(name, login)`

#### 1.7 检查 .gitignore (checkGitIgnore)

```javascript
checkGitIgnore()
```

- **功能**：检查项目是否有 `.gitignore` 文件，没有则自动创建
- **默认内容**：
  ```
  .DS_Store
  node_modules
  /dist
  
  # local env files
  .env.local
  .env.*.local
  
  # Log files
  npm-debug.log*
  yarn-debug.log*
  yarn-error.log*
  pnpm-debug.log*
  
  # Editor directories and files
  .idea
  .vscode
  *.suo
  *.ntvs*
  *.njsproj
  *.sln
  *.sw?
  ```

#### 1.8 初始化 Git 仓库 (init)

```javascript
await init()
```

详见下面的 `init()` 方法说明。

### 2. init() - 初始化阶段

`init()` 方法负责初始化本地 Git 仓库：

```javascript
async init() {
  if (await this.getRemote()) {
    return;  // 如果已初始化，直接返回
  }
  await this.initAndAddRemote();  // 初始化并添加远程仓库
  await this.initCommit();        // 完成初始提交
}
```

#### 2.1 检查远程仓库 (getRemote)

```javascript
getRemote()
```

- **功能**：检查本地是否已经初始化了 Git 仓库
- **检查方式**：检查 `.git` 目录是否存在
- **返回值**：
  - `true`：已初始化，跳过后续步骤
  - `undefined`：未初始化，继续执行

#### 2.2 初始化并添加远程仓库 (initAndAddRemote)

```javascript
async initAndAddRemote()
```

**步骤 1：初始化本地 Git 仓库**
```javascript
await this.git.init(this.dir);
```
- 在当前项目目录执行 `git init`

**步骤 2：添加远程仓库**
```javascript
const remotes = await this.git.getRemotes();
if (!remotes.find(item => item.name === 'origin')) {
  await this.git.addRemote('origin', this.remote);
}
```

- 检查是否已存在 `origin` 远程仓库
- 如果不存在，添加 `origin` 远程仓库
- 远程仓库地址格式：
  - GitHub: `git@github.com:username/repo.git`
  - Gitee: `git@gitee.com:username/repo.git`

#### 2.3 初始提交 (initCommit)

```javascript
async initCommit()
```

详见：[GitFlow方法详解.md](./GitFlow方法详解.md#initcommit)

**主要步骤**：
1. 检查代码冲突
2. 检查并提交未提交的更改
3. 检查远程 master 分支是否存在
   - 存在：拉取远程 master 分支（使用 `--allow-unrelated-histories`）
   - 不存在：推送本地代码到远程 master 分支

## 流程图

```
prepare()
  ├── checkHomePath()          # 创建缓存目录
  ├── checkGitServer()         # 选择 Git 平台
  ├── checkGitToken()          # 获取 Token
  ├── getUserAndOrgs()         # 获取用户和组织信息
  ├── checkGitOwner()          # 选择仓库归属
  ├── checkRepo()              # 检查/创建远程仓库
  ├── checkGitIgnore()         # 检查/创建 .gitignore
  └── init()                   # 初始化本地仓库
       ├── getRemote()         # 检查是否已初始化
       ├── initAndAddRemote()  # 初始化并添加远程
       └── initCommit()        # 初始提交
            ├── checkConflicted()
            ├── checkNotCommitted()
            └── checkRemoteMaster()
                 ├── 存在 → pullRemoteRepo('master')
                 └── 不存在 → pushRemoteRepo('master')
```

## 使用示例

### 首次初始化

```javascript
const git = new Git({
  name: 'my-project',
  version: '1.0.0',
  dir: './my-project'
}, {});

// 完整准备流程
await git.prepare();
```

### 使用缓存配置

如果之前已经配置过，系统会直接使用缓存：

```javascript
// 直接使用之前的配置，无需重新选择
await git.prepare();
```

### 强制刷新配置

```javascript
const git = new Git({
  name: 'my-project',
  version: '1.0.0',
  dir: './my-project'
}, {
  refreshServer: true,  // 强制重新选择 Git 平台
  refreshToken: true,   // 强制重新输入 Token
  refreshOwner: true    // 强制重新选择仓库归属
});

await git.prepare();
```

## 配置缓存文件

所有配置都会保存在 `~/.imooc-cli-dev/.git/` 目录下：

- `.git_server` - Git 平台（github/gitee）
- `.git_token` - 访问 Token
- `.git_own` - 仓库归属类型（user/org）
- `.git_login` - 仓库所有者登录名

## 注意事项

1. **首次使用必须配置 Token**
   - Token 需要有创建仓库的权限
   - GitHub 需要 `repo` 权限
   - Gitee 需要 `projects` 权限

2. **仓库名称限制**
   - 必须符合 Git 平台的命名规范
   - 不能与已有仓库重名

3. **本地仓库状态**
   - 如果本地已经有 Git 仓库，系统会检测并跳过初始化
   - 但会确保远程仓库已正确配置

4. **初始提交**
   - 如果有未提交的更改，会提示输入 commit 信息
   - 确保所有文件都已正确添加到版本控制

## 相关文档

- [GitFlow流程概述.md](./GitFlow流程概述.md)
- [GitFlow提交流程.md](./GitFlow提交流程.md)
- [GitFlow方法详解.md](./GitFlow方法详解.md)


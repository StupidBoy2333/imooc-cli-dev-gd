# GitFlow 提交流程

## 概述

提交流程是 GitFlow 的核心流程，负责自动创建开发分支、合并远程代码、处理冲突，并将代码推送到远程仓库。这个流程确保了代码的一致性和版本管理的规范性。

## 流程入口

```javascript
await git.commit();
```

## 详细步骤

### 1. 生成开发分支 (getCorrectVersion)

```javascript
await getCorrectVersion()
```

这是整个提交流程的第一步，也是最关键的一步。

#### 1.1 获取远程最新发布版本

```javascript
const remoteBranchList = await this.getRemoteBranchList(VERSION_RELEASE);
let releaseVersion = null;
if (remoteBranchList && remoteBranchList.length > 0) {
  releaseVersion = remoteBranchList[0];  // 获取最新版本
}
```

- **功能**：从远程仓库获取所有 release tag
- **格式**：`release/x.y.z`
- **排序**：按版本号降序排列，取第一个（最新版本）
- **示例**：`release/1.2.3`、`release/1.0.0`

#### 1.2 版本比较和分支生成

根据本地版本和远程最新版本的比较，生成对应的开发分支：

**情况 1：没有发布版本（新项目）**
```javascript
if (!releaseVersion) {
  this.branch = `${VERSION_DEVELOP}/${devVersion}`;
  // 例如：dev/1.0.0
}
```

**情况 2：本地版本 >= 远程版本**
```javascript
else if (semver.gt(this.version, releaseVersion)) {
  this.branch = `${VERSION_DEVELOP}/${devVersion}`;
  // 例如：本地 1.2.0 >= 远程 1.1.0 → dev/1.2.0
}
```

**情况 3：本地版本 < 远程版本**
```javascript
else {
  // 提示用户选择升级类型
  const incType = await inquirer.prompt({
    type: 'list',
    name: 'incType',
    message: '自动升级版本，请选择升级版本类型',
    choices: [
      { name: '小版本（patch）', value: 'patch' },
      { name: '中版本（minor）', value: 'minor' },
      { name: '大版本（major）', value: 'major' }
    ]
  });
  
  const incVersion = semver.inc(releaseVersion, incType);
  this.branch = `${VERSION_DEVELOP}/${incVersion}`;
  this.version = incVersion;
  // 例如：远程 1.2.0 > 本地 1.0.0
  // 用户选择 patch → dev/1.2.1
  // 用户选择 minor → dev/1.3.0
  // 用户选择 major → dev/2.0.0
}
```

#### 1.3 同步版本号到 package.json

```javascript
syncVersionToPackageJson()
```

- **功能**：将确定的版本号同步到 `package.json`
- **逻辑**：如果 `package.json` 中的版本号与当前版本不一致，则更新

### 2. 检查 Stash (checkStash)

```javascript
await checkStash()
```

- **功能**：检查是否有暂存的更改
- **处理**：如果有 stash 记录，自动执行 `git stash pop`
- **目的**：恢复之前暂存的更改，避免代码丢失

### 3. 检查代码冲突 (checkConflicted)

```javascript
await checkConflicted()
```

- **功能**：检查当前工作区是否有代码冲突
- **检测方式**：检查 `git status` 中的 `conflicted` 文件列表
- **处理**：如果有冲突，抛出错误，要求手动解决
- **注意**：冲突必须手动解决后才能继续

### 4. 切换开发分支 (checkoutBranch)

```javascript
await checkoutBranch(this.branch)
```

- **功能**：切换到开发分支
- **逻辑**：
  - 如果分支已存在：直接切换
  - 如果分支不存在：创建新分支并切换
- **分支格式**：`dev/x.y.z`
- **示例**：`dev/1.2.3`

### 5. 合并远程分支 (pullRemoteMasterAndBranch)

```javascript
await pullRemoteMasterAndBranch()
```

这是代码同步的关键步骤。

#### 5.1 合并远程 master 分支

```javascript
log.info(`合并 [master] -> [${this.branch}]`);
await this.pullRemoteRepo('master');
log.success('合并远程 [master] 分支代码成功');
await this.checkConflicted();  // 再次检查冲突
```

- **功能**：将远程 master 分支的最新代码合并到当前开发分支
- **目的**：确保开发分支包含 master 的最新代码
- **冲突处理**：合并后检查冲突，如有冲突需要手动解决

#### 5.2 合并远程开发分支（如果存在）

```javascript
const remoteBranchList = await this.getRemoteBranchList();
if (remoteBranchList.indexOf(this.version) >= 0) {
  log.info(`合并 [${this.branch}] -> [${this.branch}]`);
  await this.pullRemoteRepo(this.branch);
  log.success(`合并远程 [${this.branch}] 分支代码成功`);
  await this.checkConflicted();
} else {
  log.success(`不存在远程分支 [${this.branch}]`);
}
```

- **功能**：如果远程存在同名的开发分支，合并远程分支代码
- **场景**：多人协作或跨机器开发时使用
- **检查方式**：通过 `getRemoteBranchList()` 获取所有远程开发分支
- **分支格式**：`dev/x.y.z`

### 6. 推送开发分支 (pushRemoteRepo)

```javascript
await pushRemoteRepo(this.branch)
```

- **功能**：将当前开发分支推送到远程仓库
- **命令**：`git push origin dev/x.y.z`
- **目的**：保存代码到远程，便于协作和备份

## 完整流程图

```
commit()
  ├── getCorrectVersion()          # 生成开发分支
  │    ├── 获取远程最新 release 版本
  │    ├── 比较本地和远程版本
  │    │    ├── 无版本 → 使用本地版本
  │    │    ├── 本地 >= 远程 → 使用本地版本
  │    │    └── 本地 < 远程 → 提示升级版本
  │    └── 同步版本到 package.json
  │
  ├── checkStash()                 # 检查并恢复 stash
  │
  ├── checkConflicted()            # 检查代码冲突
  │    └── 有冲突 → 抛出错误
  │
  ├── checkoutBranch()             # 切换到开发分支
  │    ├── 分支存在 → 切换
  │    └── 分支不存在 → 创建并切换
  │
  ├── pullRemoteMasterAndBranch()  # 合并远程分支
  │    ├── 合并 master 分支
  │    ├── 检查冲突
  │    ├── 检查远程开发分支
  │    ├── 如果存在 → 合并远程开发分支
  │    └── 检查冲突
  │
  └── pushRemoteRepo()             # 推送到远程
       └── git push origin dev/x.y.z
```

## 使用示例

### 基本使用

```javascript
const git = new Git({
  name: 'my-project',
  version: '1.0.0',
  dir: './my-project'
}, {});

// 确保已完成 prepare()
await git.prepare();

// 执行提交流程
await git.commit();
```

### 版本升级场景

假设远程最新版本是 `1.2.0`，本地版本是 `1.0.0`：

```javascript
// 执行 commit() 时
// 1. 检测到本地版本 < 远程版本
// 2. 提示用户选择升级类型
// 选择 patch → 版本升级为 1.2.1，分支 dev/1.2.1
// 选择 minor → 版本升级为 1.3.0，分支 dev/1.3.0
// 选择 major → 版本升级为 2.0.0，分支 dev/2.0.0
await git.commit();
```

### 冲突处理

```javascript
try {
  await git.commit();
} catch (error) {
  if (error.message.includes('冲突')) {
    // 1. 手动解决冲突
    // 2. git add .
    // 3. git commit
    // 4. 重新执行 git.commit()
  }
}
```

## 分支命名规则

### 开发分支

- **格式**：`dev/x.y.z`
- **示例**：`dev/1.0.0`、`dev/2.1.3`
- **用途**：日常开发使用

### 发布分支（Tag）

- **格式**：`release/x.y.z`（以 tag 形式存在）
- **示例**：`release/1.0.0`
- **用途**：标记正式发布的版本

## 注意事项

1. **版本号必须符合语义化规范**
   - 格式：`x.y.z`（三个数字）
   - 遵循 [Semver](https://semver.org/) 规范

2. **代码冲突必须手动解决**
   - 系统检测到冲突时会停止执行
   - 需要手动解决后重新执行

3. **确保网络连接正常**
   - 需要访问远程仓库（GitHub/Gitee）
   - 需要推送和拉取代码

4. **Stash 会自动恢复**
   - 如果有 stash 记录，会自动恢复
   - 恢复后可能会产生冲突，需要处理

5. **版本号会自动更新**
   - 如果选择了版本升级，`package.json` 会自动更新
   - 确保项目能正常运行

## 相关文档

- [GitFlow流程概述.md](./GitFlow流程概述.md)
- [GitFlow初始化流程.md](./GitFlow初始化流程.md)
- [GitFlow分支管理.md](./GitFlow分支管理.md)
- [GitFlow方法详解.md](./GitFlow方法详解.md)


# GitFlow 分支管理

## 概述

本文档介绍 GitFlow 流程中的分支策略、分支类型和分支管理规则。

## 分支类型

### 1. master 分支

**作用**：主分支，存放稳定可发布的代码

**特点**：
- 始终处于可发布状态
- 每次发布后会打 tag
- 不允许直接在此分支开发
- 代码来自开发分支的合并

**操作**：
- 初始化时自动创建
- 首次提交时推送代码到远程
- 后续通过合并开发分支来更新

### 2. 开发分支 (dev/x.y.z)

**命名格式**：`dev/版本号`

**示例**：
- `dev/1.0.0`
- `dev/1.2.3`
- `dev/2.0.0`

**作用**：日常开发分支，用于功能开发和bug修复

**特点**：
- 基于版本号自动创建
- 从 master 分支创建
- 开发完成后推送到远程
- 可以同时存在多个开发分支（不同版本）

**创建时机**：
- 执行 `git.commit()` 时自动创建
- 根据版本号比较逻辑决定创建哪个版本的分支

### 3. 发布分支 (release/x.y.z)

**命名格式**：`release/版本号`（以 tag 形式存在）

**示例**：
- `release/1.0.0`
- `release/1.2.3`

**作用**：标记已发布的版本

**特点**：
- 以 Git tag 形式存在，不是实际分支
- 用于版本管理和回滚
- 发布成功后会创建对应的 release tag

## 分支关系图

```
master (主分支)
  │
  ├── dev/1.0.0 (开发分支)
  │   │
  │   └── (开发中...)
  │
  ├── dev/1.1.0 (开发分支)
  │   │
  │   └── (开发中...)
  │
  └── release/1.0.0 (发布标签)
      └── (已发布版本)
```

## 分支管理流程

### 初始化阶段

```javascript
// 1. 初始化本地仓库
git init

// 2. 添加远程仓库
git remote add origin <remote-url>

// 3. 首次提交到 master
git add .
git commit -m "init"
git push origin master
```

### 开发阶段

```javascript
// 1. 自动生成开发分支名（如 dev/1.0.0）
await getCorrectVersion()

// 2. 切换到开发分支（如果不存在则创建）
git checkout -b dev/1.0.0

// 3. 合并远程 master
git pull origin master

// 4. 合并远程开发分支（如果存在）
git pull origin dev/1.0.0

// 5. 推送开发分支
git push origin dev/1.0.0
```

### 发布阶段

```javascript
// 1. 在开发分支完成开发
// 2. 执行发布流程
await git.publish()

// 3. 发布成功后会创建 release tag
// git tag release/1.0.0
```

## 分支切换逻辑

### checkoutBranch 方法

```javascript
async checkoutBranch(branch) {
  const localBranchList = await this.git.branchLocal();
  
  // 如果分支已存在，切换到该分支
  if (localBranchList.all.indexOf(branch) >= 0) {
    await this.git.checkout(branch);
  } 
  // 如果分支不存在，创建新分支
  else {
    await this.git.checkoutLocalBranch(branch);
  }
}
```

**逻辑说明**：
1. 检查本地是否已存在该分支
2. 存在：直接切换
3. 不存在：创建新分支（从当前分支创建）

## 远程分支同步

### pullRemoteMasterAndBranch 方法

```javascript
async pullRemoteMasterAndBranch() {
  // 1. 合并远程 master 分支
  await this.pullRemoteRepo('master');
  
  // 2. 检查远程开发分支是否存在
  const remoteBranchList = await this.getRemoteBranchList();
  
  // 3. 如果远程开发分支存在，合并它
  if (remoteBranchList.indexOf(this.version) >= 0) {
    await this.pullRemoteRepo(this.branch);
  }
}
```

**同步策略**：
1. 总是从 master 分支拉取最新代码
2. 如果远程存在同版本开发分支，也进行合并
3. 确保本地代码包含所有远程更新

## 分支命名规范

### 开发分支命名

- **格式**：`dev/x.y.z`
- **规则**：
  - 必须以 `dev/` 开头
  - 版本号必须符合语义化版本规范（x.y.z）
  - 版本号只能包含数字和点号

**正确示例**：
- ✅ `dev/1.0.0`
- ✅ `dev/2.1.3`
- ✅ `dev/0.1.0`

**错误示例**：
- ❌ `dev/1.0`（缺少补丁号）
- ❌ `dev/v1.0.0`（包含 v 前缀）
- ❌ `dev/1.0.0-beta`（包含非数字字符）

### 发布标签命名

- **格式**：`release/x.y.z`
- **规则**：
  - 必须以 `release/` 开头
  - 版本号格式与开发分支相同

## 分支生命周期

### 开发分支生命周期

```
创建 → 开发 → 合并远程 → 推送 → 发布 → (可选)删除
```

1. **创建**：执行 `commit()` 时自动创建
2. **开发**：在此分支进行代码开发
3. **合并**：合并远程 master 和开发分支代码
4. **推送**：推送到远程仓库
5. **发布**：通过 `publish()` 发布后创建 release tag
6. **删除**：发布后可以删除（可选，通常保留用于回滚）

### master 分支生命周期

```
初始化 → 首次提交 → 接收合并 → 持续更新
```

- master 分支从初始化开始一直存在
- 通过合并开发分支来更新
- 每次更新都应该是稳定可发布的代码

## 相关文档

- [GitFlow版本管理.md](./GitFlow版本管理.md) - 版本管理规则和逻辑
- [GitFlow提交流程.md](./GitFlow提交流程.md) - 分支创建的详细流程
- [GitFlow流程概述.md](./GitFlow流程概述.md) - 整体流程概述


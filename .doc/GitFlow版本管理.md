# GitFlow 版本管理

## 概述

本文档介绍 GitFlow 流程中的版本管理规则、版本号生成逻辑和版本升级策略。

## 版本号规范

### Semantic Versioning

遵循 [Semantic Versioning 2.0.0](https://semver.org/) 规范：

**格式**：`MAJOR.MINOR.PATCH`

- **MAJOR（主版本号）**：不兼容的 API 修改
- **MINOR（次版本号）**：向下兼容的功能性新增
- **PATCH（修订号）**：向下兼容的问题修正

**示例**：
- `1.0.0` - 初始版本
- `1.0.1` - 修复 bug
- `1.1.0` - 新增功能
- `2.0.0` - 重大更新（不兼容）

### 版本号验证

系统使用 `semver` 库进行版本号验证：

```javascript
semver.valid('1.0.0')  // true
semver.valid('1.0')    // false
semver.valid('v1.0.0') // false
```

## 版本来源

### 1. 本地版本（package.json）

**来源**：项目的 `package.json` 文件

```json
{
  "name": "my-project",
  "version": "1.0.0"
}
```

**用途**：
- 作为初始版本号
- 如果本地版本 >= 远程版本，使用本地版本
- 版本确定后会同步回 `package.json`

### 2. 远程版本（release tags）

**来源**：远程仓库的 release tags

**格式**：`release/x.y.z`

**获取方式**：
```javascript
const remoteBranchList = await this.getRemoteBranchList(VERSION_RELEASE);
// 返回：['1.2.3', '1.2.0', '1.0.0'] （已排序，降序）
const latestVersion = remoteBranchList[0]; // '1.2.3'
```

**用途**：
- 确定线上最新发布版本
- 用于版本比较和升级判断

## 版本比较逻辑

### getCorrectVersion 方法

这是版本管理的核心方法，决定使用哪个版本号创建开发分支。

#### 流程步骤

```javascript
async getCorrectVersion() {
  // 1. 获取远程最新发布版本
  const remoteBranchList = await this.getRemoteBranchList(VERSION_RELEASE);
  let releaseVersion = remoteBranchList[0]; // 最新版本或 null
  
  // 2. 获取本地版本
  const devVersion = this.version; // 来自 package.json
  
  // 3. 版本比较和分支生成
  // ...
}
```

#### 三种情况

**情况 1：新项目（无远程发布版本）**

```javascript
if (!releaseVersion) {
  this.branch = `dev/${devVersion}`;
  // 例如：dev/1.0.0
}
```

**场景**：
- 首次发布
- 远程仓库没有 release tag

**结果**：直接使用本地版本号

---

**情况 2：本地版本 >= 远程版本**

```javascript
else if (semver.gt(this.version, releaseVersion)) {
  this.branch = `dev/${devVersion}`;
  // 例如：本地 1.2.0 >= 远程 1.1.0 → dev/1.2.0
}
```

**场景**：
- 本地已升级版本号
- 本地版本大于远程最新版本

**结果**：使用本地版本号（通常表示本地已手动升级）

---

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
  this.branch = `dev/${incVersion}`;
  this.version = incVersion;
}
```

**场景**：
- 远程已有新版本发布
- 本地版本落后于远程版本

**交互提示**：
- 小版本（patch）：`1.2.0` → `1.2.1`
- 中版本（minor）：`1.2.0` → `1.3.0`
- 大版本（major）：`1.2.0` → `2.0.0`

**结果**：基于远程最新版本进行升级

## 版本升级示例

### 示例 1：新项目

```
本地版本：1.0.0
远程版本：无

结果：dev/1.0.0
```

### 示例 2：本地版本领先

```
本地版本：1.2.0
远程版本：1.1.0

结果：dev/1.2.0（使用本地版本）
```

### 示例 3：远程版本领先 - 选择 patch

```
本地版本：1.0.0
远程版本：1.2.0
用户选择：patch

结果：dev/1.2.1（远程版本 + patch）
```

### 示例 4：远程版本领先 - 选择 minor

```
本地版本：1.0.0
远程版本：1.2.0
用户选择：minor

结果：dev/1.3.0（远程版本 + minor）
```

### 示例 5：远程版本领先 - 选择 major

```
本地版本：1.0.0
远程版本：1.2.0
用户选择：major

结果：dev/2.0.0（远程版本 + major）
```

## 版本同步

### syncVersionToPackageJson 方法

版本确定后，会同步到 `package.json`：

```javascript
syncVersionToPackageJson() {
  const pkg = fse.readJsonSync(`${this.dir}/package.json`);
  if (pkg && pkg.version !== this.version) {
    pkg.version = this.version;
    fse.writeJsonSync(`${this.dir}/package.json`, pkg, { spaces: 2 });
  }
}
```

**触发时机**：
- `getCorrectVersion()` 执行完成后

**逻辑**：
- 读取 `package.json`
- 如果版本不一致，更新版本号
- 写回文件（保持格式，2 空格缩进）

**目的**：
- 确保代码中的版本号与实际使用的版本号一致
- 避免版本不一致导致的混淆

## 远程版本获取

### getRemoteBranchList 方法

```javascript
async getRemoteBranchList(type) {
  const remoteList = await this.git.listRemote(['--refs']);
  
  let reg;
  if (type === VERSION_RELEASE) {
    // 匹配 release tags
    reg = /.+?refs\/tags\/release\/(\d+\.\d+\.\d+)/g;
  } else {
    // 匹配 dev 分支
    reg = /.+?refs\/heads\/dev\/(\d+\.\d+\.\d+)/g;
  }
  
  // 提取版本号
  return remoteList.split('\n')
    .map(remote => {
      const match = reg.exec(remote);
      reg.lastIndex = 0;
      if (match && semver.valid(match[1])) {
        return match[1];
      }
    })
    .filter(_ => _)
    // 按版本号降序排序
    .sort((a, b) => {
      if (semver.lte(b, a)) {
        if (a === b) return 0;
        return -1;
      }
      return 1;
    });
}
```

**功能**：
- 获取远程仓库的所有 release tags 或 dev 分支
- 提取版本号
- 验证版本号格式
- 按版本号降序排序

**返回格式**：
```javascript
// release tags
['1.2.3', '1.2.0', '1.0.0']

// dev 分支
['1.2.3', '1.1.0', '1.0.0']
```

## 版本管理最佳实践

### 1. 版本号升级建议

- **Patch（小版本）**：bug 修复、安全补丁
- **Minor（中版本）**：新功能、功能增强
- **Major（大版本）**：重大变更、不兼容更新

### 2. 版本号管理

- ✅ 遵循语义化版本规范
- ✅ 每次发布前确认版本号
- ✅ 保持本地和远程版本同步
- ❌ 不要随意修改版本号
- ❌ 不要跳过版本号

### 3. 版本冲突处理

当本地版本 < 远程版本时：

1. **先拉取远程代码**：了解远程变更
2. **选择合适的升级类型**：
   - 如果只是修复 bug → patch
   - 如果有新功能 → minor
   - 如果有重大变更 → major
3. **确认版本号**：确保版本号符合预期

## 相关文档

- [GitFlow分支管理.md](./GitFlow分支管理.md) - 分支策略和命名规范
- [GitFlow提交流程.md](./GitFlow提交流程.md) - 版本管理的实际应用
- [GitFlow流程概述.md](./GitFlow流程概述.md) - 整体流程概述


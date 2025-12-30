'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const Package = require('@imooc-cli-dev-gd/package');
const log = require('@imooc-cli-dev-gd/log');
const { exec: spawn } = require('@imooc-cli-dev-gd/utils');

const SETTINGS = {
  init: '@imooc-cli/init',
  publish: '@imooc-cli/publish',
};

const CACHE_DIR = 'dependencies';

async function exec() {
  let targetPath = process.env.CLI_TARGET_PATH;
  const homePath = process.env.CLI_HOME_PATH;
  let storeDir = '';
  let pkg;
  log.verbose('targetPath', targetPath);
  log.verbose('homePath', homePath);

  const cmdObj = arguments[arguments.length - 1];
  const cmdName = cmdObj.name();
  const packageName = SETTINGS[cmdName];
  const packageVersion = 'latest';

  if (!targetPath) {
    targetPath = path.resolve(homePath, CACHE_DIR); // 生成缓存路径
    storeDir = path.resolve(targetPath, 'node_modules');
    log.verbose('targetPath', targetPath);
    log.verbose('storeDir', storeDir);
    pkg = new Package({
      targetPath,
      storeDir,
      packageName,
      packageVersion,
    });
    if (await pkg.exists()) {
      // 更新package
      await pkg.update();
    } else {
      // 安装package
      await pkg.install();
    }
  } else {
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion,
    });
  }
  const rootFile = pkg.getRootFilePath();
  log.verbose('rootFile', rootFile);
  if (rootFile) {
    try {
      // 在当前进程中调用
      // require(rootFile).call(null, Array.from(arguments));
      // 在node子进程中调用
      const args = Array.from(arguments);
      const cmd = args[args.length - 1];
      const o = Object.create(null);
      Object.keys(cmd).forEach(key => {
        if (cmd.hasOwnProperty(key) &&
          !key.startsWith('_') &&
          key !== 'parent') {
          o[key] = cmd[key];
        }
      });
      args[args.length - 1] = o;
      // 使用临时文件来执行代码，避免 Windows 上命令行长度限制和转义问题
      const code = `require(${JSON.stringify(rootFile)}).call(null, ${JSON.stringify(args)})`;
      log.verbose('exec code', code);
      
      // 创建临时文件
      const tmpFile = path.join(os.tmpdir(), `imooc-cli-exec-${Date.now()}.js`);
      fs.writeFileSync(tmpFile, code);
      
      const child = spawn('node', [tmpFile], {
        cwd: process.cwd(),
        stdio: 'inherit',
      });
      
      // 清理临时文件
      const cleanup = () => {
        try {
          if (fs.existsSync(tmpFile)) {
            fs.unlinkSync(tmpFile);
          }
        } catch (e) {
          // 忽略清理错误
        }
      };
      
      child.on('error', e => {
        cleanup();
        log.error(e.message);
        process.exit(1);
      });
      child.on('exit', e => {
        cleanup();
        log.verbose('命令执行成功:' + e);
        process.exit(e);
      });
    } catch (e) {
      log.error(e.message);
    }
  }
}

module.exports = exec;

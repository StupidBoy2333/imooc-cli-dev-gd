# Webpack 构建速度优化

## 概述

Webpack 构建速度优化是前端工程化中的重要环节。本文档介绍各种优化策略和最佳实践，帮助提升 Webpack 的构建速度。

## 一、优化策略概览

### 优化方向

1. **减少文件搜索范围**
2. **使用缓存机制**
3. **并行处理**
4. **减少文件处理量**
5. **优化解析和编译**

## 二、具体优化方案

### 1. 使用 resolve 配置优化模块解析

#### 1.1 配置 resolve.alias

通过别名减少模块解析时间：

```javascript
module.exports = {
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'components': path.resolve(__dirname, 'src/components'),
      'utils': path.resolve(__dirname, 'src/utils'),
      // 避免 webpack 去查找 node_modules
      'react': path.resolve(__dirname, 'node_modules/react'),
    }
  }
}
```

**效果**：直接定位文件，避免递归查找

#### 1.2 配置 resolve.modules

指定模块查找目录：

```javascript
module.exports = {
  resolve: {
    modules: [
      path.resolve(__dirname, 'src'),
      path.resolve(__dirname, 'node_modules'),
      'node_modules' // 最后查找默认位置
    ]
  }
}
```

**效果**：减少查找路径，提升解析速度

#### 1.3 配置 resolve.extensions

减少文件扩展名尝试：

```javascript
module.exports = {
  resolve: {
    extensions: ['.js', '.jsx', '.json'], // 按使用频率排序
    // 避免尝试过多扩展名
  }
}
```

**效果**：减少文件系统查询次数

#### 1.4 配置 resolve.mainFields

指定 package.json 中的入口字段：

```javascript
module.exports = {
  resolve: {
    mainFields: ['browser', 'module', 'main'], // 按优先级排序
  }
}
```

### 2. 使用 cache 缓存机制

#### 2.1 Webpack 5 持久化缓存

```javascript
module.exports = {
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename], // 配置文件变化时重新构建
    },
    cacheDirectory: path.resolve(__dirname, 'node_modules/.cache/webpack'),
  }
}
```

**效果**：二次构建速度提升 80%+

#### 2.2 Webpack 4 使用 cache-loader

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [
          'cache-loader', // 放在最前面
          'babel-loader'
        ]
      }
    ]
  }
}
```

### 3. 使用多进程并行处理

#### 3.1 thread-loader（推荐）

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [
          {
            loader: 'thread-loader',
            options: {
              workers: 2, // 进程数
              poolTimeout: 2000,
            }
          },
          'babel-loader'
        ]
      }
    ]
  }
}
```

**注意**：不要对小型项目使用，进程启动有开销

#### 3.2 HappyPack（Webpack 4）

```javascript
const HappyPack = require('happypack');

module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        use: 'happypack/loader?id=js'
      }
    ]
  },
  plugins: [
    new HappyPack({
      id: 'js',
      loaders: ['babel-loader']
    })
  ]
}
```

### 4. 优化 loader 配置

#### 4.1 使用 include/exclude 限制处理范围

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/, // 排除 node_modules
        include: path.resolve(__dirname, 'src'), // 只处理 src 目录
        use: ['babel-loader']
      }
    ]
  }
}
```

**效果**：减少不必要的文件处理

#### 4.2 减少 loader 处理时间

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true, // 启用 babel 缓存
              cacheCompression: false, // 禁用压缩以提升速度
            }
          }
        ]
      }
    ]
  }
}
```

### 5. 使用 DllPlugin 预编译

#### 5.1 创建 Dll 配置文件（webpack.dll.js）

```javascript
const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'production',
  entry: {
    vendor: ['react', 'react-dom', 'lodash'], // 第三方库
  },
  output: {
    path: path.resolve(__dirname, 'dll'),
    filename: '[name].dll.js',
    library: '[name]_[hash]'
  },
  plugins: [
    new webpack.DllPlugin({
      name: '[name]_[hash]',
      path: path.resolve(__dirname, 'dll/[name].manifest.json')
    })
  ]
}
```

#### 5.2 在主配置中使用 DllReferencePlugin

```javascript
const webpack = require('webpack');

module.exports = {
  plugins: [
    new webpack.DllReferencePlugin({
      manifest: require('./dll/vendor.manifest.json')
    })
  ]
}
```

**效果**：第三方库只编译一次，后续构建跳过

### 6. 优化插件使用

#### 6.1 合理使用 SourceMap

```javascript
module.exports = {
  devtool: process.env.NODE_ENV === 'production' 
    ? 'source-map'      // 生产环境使用完整 source-map
    : 'eval-cheap-module-source-map' // 开发环境使用快速模式
}
```

**SourceMap 速度对比**（从快到慢）：
- `eval` - 最快
- `eval-cheap-module-source-map` - 较快
- `cheap-module-source-map` - 中等
- `source-map` - 最慢但最准确

#### 6.2 生产环境禁用不必要的插件

```javascript
module.exports = {
  plugins: [
    // 只在开发环境使用
    ...(process.env.NODE_ENV === 'development' 
      ? [new webpack.HotModuleReplacementPlugin()] 
      : []
    )
  ]
}
```

### 7. 使用 externals 排除依赖

```javascript
module.exports = {
  externals: {
    'react': 'React',
    'react-dom': 'ReactDOM',
    'lodash': '_'
  }
}
```

**适用场景**：通过 CDN 引入的库，减少打包体积和构建时间

### 8. 优化文件监听

#### 8.1 配置 watchOptions

```javascript
module.exports = {
  watchOptions: {
    ignored: /node_modules/, // 忽略 node_modules
    aggregateTimeout: 300, // 防抖延迟
    poll: false, // 不使用轮询
  }
}
```

#### 8.2 使用 webpack-dev-middleware 的 watchOptions

```javascript
app.use(webpackDevMiddleware(compiler, {
  watchOptions: {
    ignored: /node_modules/,
    poll: false,
  }
}))
```

### 9. 代码分割优化

#### 9.1 合理使用 SplitChunksPlugin

```javascript
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
        },
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        }
      }
    }
  }
}
```

**效果**：减少重复打包，提升增量构建速度

### 10. 使用 HardSourceWebpackPlugin（Webpack 4）

```javascript
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');

module.exports = {
  plugins: [
    new HardSourceWebpackPlugin({
      cacheDirectory: 'node_modules/.cache/hard-source/[confighash]',
      configHash: function(webpackConfig) {
        return require('node-object-hash')({sort: false}).hash(webpackConfig);
      },
    })
  ]
}
```

**注意**：Webpack 5 已内置文件系统缓存，无需此插件

## 三、性能分析工具

### 1. 使用 speed-measure-webpack-plugin

```javascript
const SpeedMeasurePlugin = require('speed-measure-webpack-plugin');
const smp = new SpeedMeasurePlugin();

module.exports = smp.wrap({
  // webpack 配置
})
```

**效果**：显示每个 loader 和插件的耗时

### 2. 使用 webpack-bundle-analyzer

```javascript
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
    })
  ]
}
```

**效果**：分析打包体积，找出优化点

### 3. 使用 webpack --profile --progress

```bash
webpack --profile --progress
```

**效果**：显示构建过程的详细时间信息

## 四、优化效果对比

### 优化前
- 首次构建：60s
- 增量构建：15s
- 热更新：3s

### 优化后
- 首次构建：25s（提升 58%）
- 增量构建：3s（提升 80%）
- 热更新：0.5s（提升 83%）

## 五、最佳实践总结

### 1. 开发环境优化重点

- ✅ 使用 `eval-cheap-module-source-map`
- ✅ 启用缓存（cache）
- ✅ 使用 `include/exclude` 限制处理范围
- ✅ 合理配置 `watchOptions`
- ✅ 使用 `thread-loader` 并行处理

### 2. 生产环境优化重点

- ✅ 使用 `DllPlugin` 预编译第三方库
- ✅ 使用 `externals` 排除 CDN 库
- ✅ 禁用开发相关插件
- ✅ 使用 `source-map` 生成准确映射
- ✅ 优化 `splitChunks` 配置

### 3. 通用优化建议

1. **按需引入**：使用 tree-shaking 和按需加载
2. **减少依赖**：定期清理未使用的依赖
3. **升级工具**：使用最新版本的 webpack 和 loader
4. **监控分析**：定期使用分析工具检查性能
5. **渐进优化**：不要一次性应用所有优化，逐步测试效果

## 六、常见问题

### Q1: 为什么使用了缓存后构建还是很慢？

**A**: 检查缓存是否生效，确保 `cacheDirectory` 路径正确，首次构建会创建缓存。

### Q2: thread-loader 什么时候使用？

**A**: 项目较大（>1000 模块）时使用，小型项目反而会变慢。

### Q3: DllPlugin 和 SplitChunksPlugin 的区别？

**A**: 
- DllPlugin：预编译第三方库，提升后续构建速度
- SplitChunksPlugin：代码分割，优化加载性能

### Q4: Webpack 5 还需要 DllPlugin 吗？

**A**: 不需要，Webpack 5 的持久化缓存已经足够强大。

## 七、参考资源

- [Webpack 官方文档 - 性能优化](https://webpack.js.org/guides/performance/)
- [Webpack 5 缓存机制](https://webpack.js.org/configuration/cache/)
- [Speed Measure Webpack Plugin](https://github.com/stephencookdev/speed-measure-webpack-plugin)

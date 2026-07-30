const definePluginConfig = (options: any) => {
  console.log(options)
}

export { definePluginConfig as defineConfig }

/**
 * 插件体系准备采用类似npm包+远程组件的方式动态注入
 *
 * # 插件的开发
 * 第三方插件开发者可以通过 import { defineConfig } from '@ai-workflow/plugin'，
 * 去代替一堆的json配置，并且还有类型提示
 * 获取一些自定义数据的话，可以通过类似nextjs这样，export const nodexxx 来获取默认暴露的内容
 * cli通过本地化开发能力（包含模版），也可以通过配置改变文件路径规则（类似vscode plugin cli）
 *
 * 提供nodes-ui、form、shadcn-ui/icon等base组件，便于样式的统一，当然也可以自定义组件
 * 也提供skill或者cli让ai来帮忙创建plugin，包括提供发布插件、等其他能力
 *
 * # 插件的发布和使用
 * 默认发布的插件是仅自己项目使用（私有），而且需要安装才能使用，也可以设置为公开
 * #
 */

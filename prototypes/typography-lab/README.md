# AskAura 字体试衣间

这是一个独立的字体比较原型，不会影响 `index.html` 或现有业务逻辑。

## 查看方式

启动项目本地静态服务后打开：

`http://127.0.0.1:5174/prototypes/typography-lab/`

页面提供三套方案：

- 玄夜叙事：霞鹜新致宋屏幕版 + IBM Plex Sans SC + IBM Plex Sans Condensed。
- 观测协议：IBM Plex Sans SC + IBM Plex Sans Condensed。
- 当前对照：项目原有的系统宋体与系统黑体回退。

支持桌面与 390 × 844 移动视图。快捷键 `1`、`2`、`3` 切换字体，`4`、`5`、`6` 切换字标，`D`、`M` 切换视图。

页面还包含三套第二轮游戏向 SVG 品牌标题：

- 裂月之门：月蚀、门碑与重画字骨组成的叙事游戏主标。
- 双象协议：双重观测框、信号核心与空心字骨组成的科幻阵营标识。
- 夜航刻印：月面坐标、航线与断续字骨组成的独立游戏标题。

三个 SVG 都是自绘矢量结构，不包含 `<text>` 或系统字体依赖。选定方向后再制作完整的主标题、紧凑标、图标、卡背与加载动画套件。

## 字体说明

- IBM Plex 使用 SIL Open Font License 1.1，协议副本位于 `fonts/LICENSE-IBM-PLEX.txt`。
- 霞鹜新致宋使用 IPA Font License 1.0，协议副本位于 `fonts/LICENSE-LXGW-NEO-ZHISONG.md`。
- 原型字体已经按当前样张文字进行子集化，只用于该字体比较页面，不能直接当作完整产品字体文件。

# 待上新

这 32 个动效还没做完。编辑器文件还在仓库里，方便接着改；CellMotion 官网不把它们当成已经可以打开的动效。

## 官网怎么显示

- 「全部动效」和原来的内容分类里不出现。
- 组件库、首页分类、编辑器目录的侧栏最后一项是「待上新」。点开能看到封面、中文名和英文名。
- 封面上有一层很浅的白罩，写着「待上新，未完成」。整张卡片不能点击，也没有进入编辑器的链接。
- 每条记录的 `category` 仍是它原来的内容分类。从下面的名单里删掉对应 slug，再重建目录，它会自己回到那个分类，同时从「待上新」消失。

内容分类对应：

| 分类 id | 官网名称 |
| --- | --- |
| `type` | 文字排版 |
| `graphic` | 图标与图形 |
| `media` | 图片与媒体 |
| `flow` | 流动与路径 |
| `space` | 立体空间 |
| `physics` | 物理粒子 |

## 名单从哪里来

唯一名单是 `site/gallery.js` 里的 `pendingRelease`。`node scripts/build-cellmotion-catalog.mjs` 把它写成 `site/cellmotion-catalog.json` 的 `status: "pending"`，并保留原来的 `category`。不要另做一份分类，也不要改 `category` 来表示未完成。

做好一个之后：

1. 从 `pendingRelease` 删除它的 slug。
2. 运行 `node scripts/build-cellmotion-catalog.mjs`。
3. 跑 `node scripts/check-cellmotion-website.mjs`。

直接打开 `site/<slug>.html` 仍可在本地继续改。官网卡片在它离开这份名单之前保持不可点。

## 当前未完成

名单里的三个叫法和仓库条目不一样，按下表对应，没有多藏别的动效。

| 中文名 | English | slug | 完成后回到 |
| --- | --- | --- | --- |
| 线圈 | Coil | `coil` | 流动与路径 |
| 散 | Scatter | `liquidtype` | 文字排版 |
| 字位剧场 | Slot Stories | `slotstories` | 图标与图形 |
| 镜头铺展 | Media Cascade | `mediacascade` | 图片与媒体 |
| 动令 | Verb Cue | `verbcue` | 文字排版 |
| 收距 | Tighten | `tighten` | 文字排版 |
| 标卡 | Title Card | `titlecard` | 文字排版 |
| 夹图 | Lockup | `lockup` | 文字排版 |
| 退远 | Pullback | `pullback` | 文字排版 |
| 翻词 | Word Flip | `wordflip` | 文字排版 |
| 垒词 | Text Build | `textbuild` | 文字排版 |
| 换句 | Text Swap | `textswap` | 文字排版 |
| 显句 | Text Reveal | `textreveal` | 文字排版 |
| 机框 | Phone Frame | `phoneframe` | 图片与媒体 |
| 本框 | Laptop Frame | `laptopframe` | 图片与媒体 |
| 旋廊 | Orbit Gallery | `orbitgallery` | 图片与媒体 |
| 涌粉 | Follower Rush | `followerrush` | 图标与图形 |
| 标聚 | Logo Assemble | `logoassemble` | 图标与图形 |
| 图墙 | Moodboard | `moodboard` | 图片与媒体 |
| 碰撞时钟 | Crash Clock | `crashclock` | 物理粒子 |
| 警示 | Danger | `danger` | 文字排版 |
| 场域 | Field | `field` | 流动与路径 |
| 闪光 | Flash | `flash` | 文字排版 |
| 圆柱 | Cylinder | `index` | 立体空间 |
| 森泽 | Morisawa | `morisawa` | 文字排版 |
| 砰 | Pow | `pow` | 图标与图形 |
| 棱镜 | Prism | `prism` | 立体空间 |
| 丝带 | Ribbon | `ribbon` | 流动与路径 |
| 闪耀 | Shine | `shine` | 图标与图形 |
| 琴弦 | String | `string` | 流动与路径 |
| 器皿 | Vessel | `vessel` | 立体空间 |
| 层叠 | Layers | `layers` | 文字排版 |

对应说明：所说的「相框」是仓库里的「机框」，「围墙」是「图墙」，「琴炫」是「琴弦」。

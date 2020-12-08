import Lucky from './lucky';
import { isExpectType, removeEnter } from '../utils/index';
import { getAngle, drawSector } from '../utils/math';
import { quad } from '../utils/tween';
export default class LuckyWheel extends Lucky {
  /**
     * 大转盘构造器
     * @param el 元素标识
     * @param data 抽奖配置项
     */
  constructor(el, data = {}) {
    super();
    this.blocks = [];
    this.prizes = [];
    this.buttons = [];
    this.defaultConfig = {
      gutter: '0px',
      offsetDegree: 0,
      speed: 20,
      accelerationTime: 2500,
      decelerationTime: 2500
    };
    this.defaultStyle = {
      fontSize: '18px',
      fontColor: '#000',
      fontStyle: 'microsoft yahei ui,microsoft yahei,simsun,sans-serif',
      fontWeight: '400',
      background: '#fff',
      wordWrap: true,
      lengthLimit: '90%'
    };
    this.Radius = 0; // 大转盘半径
    this.prizeRadius = 0; // 奖品区域半径
    this.prizeDeg = 0; // 奖品数学角度
    this.prizeRadian = 0; // 奖品运算角度
    this.rotateDeg = 0; // 转盘旋转角度
    this.maxBtnRadius = 0; // 最大按钮半径
    this.startTime = 0; // 开始时间戳
    this.endTime = 0; // 停止时间戳
    this.stopDeg = 0; // 刻舟求剑
    this.endDeg = 0; // 停止角度
    this.animationId = 0; // 帧动画id
    this.FPS = 16.6; // 屏幕刷新率
    this.prizeImgs = [[]];
    this.btnImgs = [[]];
    // console.log(">>>", document.querySelector('.luck-draw'));
    this.box = el
    this.canvas = document.createElement('canvas');
    this.box.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.setData(data);
    // 收集首次渲染的图片
    let willUpdate = [[]];
    this.prizes && (willUpdate = this.prizes.map(prize => prize.imgs));
    this.buttons && (willUpdate.push(...this.buttons.map(btn => btn.imgs)));
    this.init(willUpdate);
  }
  /**
     * 初始化数据
     * @param data
     */
  setData(data) {
    this.blocks = data.blocks || [];
    this.prizes = data.prizes || [];
    this.buttons = data.buttons || [];
    this.startCallback = data.start;
    this.endCallback = data.end;
    for (const key in data.defaultConfig) {
      this.defaultConfig[key] = data.defaultConfig[key];
    }
    for (const key in data.defaultStyle) {
      this.defaultStyle[key] = data.defaultStyle[key];
    }
  }
  /**
     * 初始化 canvas 抽奖
     * @param { Array<ImgType[]> } willUpdateImgs 需要更新的图片
     */
  init(willUpdateImgs) {
    this.setDpr();
    this.setHTMLFontSize();
    const { box, canvas, ctx, dpr } = this;
    if (!box) {
      return;
    }
    canvas.width = canvas.height = box.offsetWidth * dpr;
    this.Radius = canvas.width / 2;
    this.optimizeClarity(canvas, this.Radius * 2, this.Radius * 2);
    ctx.translate(this.Radius, this.Radius);
    const endCallBack = () => {
      // 开始绘制
      this.draw();
      // 防止多次绑定点击事件
      canvas.onclick = e => {
        ctx.beginPath();
        ctx.arc(0, 0, this.maxBtnRadius, 0, Math.PI * 2, false);
        if (!ctx.isPointInPath(e.offsetX, e.offsetY)) {
          return;
        }
        if (this.startTime) {
          return;
        }
        this.startCallback(e);
      };
    };
    // 同步加载图片
    let num = 0, sum = 0;
    if (isExpectType(willUpdateImgs, 'array')) {
      this.draw(); // 先画一次防止闪烁, 因为加载图片是异步的
      willUpdateImgs.forEach((imgs, cellIndex) => {
        if (!imgs) {
          return false;
        }
        imgs.forEach((imgInfo, imgIndex) => {
          sum++;
          this.loadAndCacheImg(cellIndex, imgIndex, () => {
            num++;
            if (sum === num) {
              endCallBack.call(this);
            }
          });
        });
      });
    }
    if (!sum) {
      endCallBack.call(this);
    }
  }
  /**
     * 单独加载某一张图片并计算其实际渲染宽高
     * @param { number } cellIndex 奖品索引
     * @param { number } imgIndex 奖品图片索引
     * @param { Function } callBack 图片加载完毕回调
     */
  loadAndCacheImg(cellIndex, imgIndex, callBack) {
    // 先判断index是奖品图片还是按钮图片, 并修正index的值
    const isPrize = cellIndex < this.prizes.length;
    const cellName = isPrize ? 'prizes' : 'buttons';
    const imgName = isPrize ? 'prizeImgs' : 'btnImgs';
    cellIndex = isPrize ? cellIndex : cellIndex - this.prizes.length;
    // 获取图片信息
    const cell = this[cellName][cellIndex];
    if (!cell || !cell.imgs) {
      return;
    }
    const imgInfo = cell.imgs[imgIndex];
    if (!imgInfo) {
      return;
    }
    // 创建图片
    const imgObj = new Image();
    if (!this[imgName][cellIndex]) {
      this[imgName][cellIndex] = [];
    }
    // 创建缓存
    this[imgName][cellIndex][imgIndex] = imgObj;
    imgObj.src = imgInfo.src;
    imgObj.onload = () => callBack.call(this);
  }
  /**
     * 计算图片的渲染宽高
     * @param imgObj 图片标签元素
     * @param imgInfo 图片信息
     * @param computedWidth 宽度百分比
     * @param computedHeight 高度百分比
     * @return [渲染宽度, 渲染高度]
     */
  computedWidthAndHeight(imgObj, imgInfo, computedWidth, computedHeight) {
    // 根据配置的样式计算图片的真实宽高
    if (!imgInfo.width && !imgInfo.height) {
      // 如果没有配置宽高, 则使用图片本身的宽高
      return [imgObj.width, imgObj.height];
    }
    else if (imgInfo.width && !imgInfo.height) {
      // 如果只填写了宽度, 没填写高度
      const trueWidth = this.getWidth(imgInfo.width, computedWidth);
      // 那高度就随着宽度进行等比缩放
      return [trueWidth, imgObj.height * (trueWidth / imgObj.width)];
    }
    else if (!imgInfo.width && imgInfo.height) {
      // 如果只填写了宽度, 没填写高度
      const trueHeight = this.getHeight(imgInfo.height, computedHeight);
      // 那宽度就随着高度进行等比缩放
      return [imgObj.width * (trueHeight / imgObj.height), trueHeight];
    }
    // 如果宽度和高度都填写了, 就如实计算
    return [
      this.getWidth(imgInfo.width, computedWidth),
      this.getHeight(imgInfo.height, computedHeight)
    ];
  }
  /**
     * 开始绘制
     */
  draw() {
    const { ctx, dpr, defaultConfig, defaultStyle } = this;
    ctx.clearRect(-this.Radius, -this.Radius, this.Radius * 2, this.Radius * 2);
    // 绘制blocks边框
    this.prizeRadius = this.blocks.reduce((radius, block) => {
      ctx.beginPath();
      ctx.fillStyle = block.background;
      ctx.arc(0, 0, radius, 0, Math.PI * 2, false);
      ctx.fill();
      return radius - this.getLength(block.padding.split(' ')[0]) * dpr;
    }, this.Radius);
    // 计算起始弧度
    this.prizeDeg = 360 / this.prizes.length;
    this.prizeRadian = getAngle(this.prizeDeg);
    const start = getAngle(-90 + this.rotateDeg + defaultConfig.offsetDegree);
    // 计算文字横坐标
    const getFontX = (line) => {
      return this.getOffsetX(ctx.measureText(line).width);
    };
    // 计算文字纵坐标
    const getFontY = (font, height, lineIndex) => {
      // 优先使用字体行高, 要么使用默认行高, 其次使用字体大小, 否则使用默认字体大小
      const lineHeight = font.lineHeight || defaultStyle.lineHeight || font.fontSize || defaultStyle.fontSize;
      return this.getHeight(font.top, height) + (lineIndex + 1) * this.getLength(lineHeight) * dpr;
    };
    ctx.save();
    // 绘制prizes奖品区域
    this.prizes.forEach((prize, prizeIndex) => {
      // 计算当前奖品区域中间坐标点
      const currMiddleDeg = start + prizeIndex * this.prizeRadian;
      // 奖品区域可见高度
      const prizeHeight = this.prizeRadius - this.maxBtnRadius;
      // 绘制背景
      drawSector(ctx, this.maxBtnRadius, this.prizeRadius, currMiddleDeg - this.prizeRadian / 2, currMiddleDeg + this.prizeRadian / 2, this.getLength(defaultConfig.gutter) * dpr, prize.background || defaultStyle.background || 'rgba(0, 0, 0, 0)');
      // 计算临时坐标并旋转文字
      const x = Math.cos(currMiddleDeg) * this.prizeRadius;
      const y = Math.sin(currMiddleDeg) * this.prizeRadius;
      ctx.translate(x, y);
      ctx.rotate(currMiddleDeg + getAngle(90));
      // 绘制图片
      prize.imgs && prize.imgs.forEach((imgInfo, imgIndex) => {
        if (!this.prizeImgs[prizeIndex]) {
          return;
        }
        const prizeImg = this.prizeImgs[prizeIndex][imgIndex];
        if (!prizeImg) {
          return;
        }
        const [trueWidth, trueHeight] = this.computedWidthAndHeight(prizeImg, imgInfo, this.prizeRadian * this.prizeRadius, prizeHeight);
        ctx.drawImage(prizeImg, this.getOffsetX(trueWidth), this.getHeight(imgInfo.top, prizeHeight), trueWidth, trueHeight);
      });
      // 逐行绘制文字
      prize.fonts && prize.fonts.forEach(font => {
        const fontColor = font.fontColor || defaultStyle.fontColor;
        const fontWeight = font.fontWeight || defaultStyle.fontWeight;
        const fontSize = this.getLength(font.fontSize || defaultStyle.fontSize);
        const fontStyle = font.fontStyle || defaultStyle.fontStyle;
        ctx.fillStyle = fontColor;
        ctx.font = `${fontWeight} ${fontSize * dpr}px ${fontStyle}`;
        let lines = [], text = String(font.text);
        if (Object.prototype.hasOwnProperty.call(font, 'wordWrap') ? font.wordWrap : defaultStyle.wordWrap) {
          text = removeEnter(text);
          let str = '';
          for (let i = 0; i < text.length; i++) {
            str += text[i];
            const currWidth = ctx.measureText(str).width;
            const maxWidth = (this.prizeRadius - getFontY(font, prizeHeight, lines.length))
                            * Math.tan(this.prizeRadian / 2) * 2 - this.getLength(defaultConfig.gutter) * dpr;
            if (currWidth > this.getWidth(font.lengthLimit || defaultStyle.lengthLimit, maxWidth)) {
              lines.push(str.slice(0, -1));
              str = text[i];
            }
          }
          if (str) {
            lines.push(str);
          }
          if (!lines.length) {
            lines.push(text);
          }
        }
        else {
          lines = text.split('\n');
        }
        lines.filter(line => !!line).forEach((line, lineIndex) => {
          ctx.fillText(line, getFontX(line), getFontY(font, prizeHeight, lineIndex));
        });
      });
      // 修正旋转角度和原点坐标
      ctx.rotate(getAngle(360) - currMiddleDeg - getAngle(90));
      ctx.translate(-x, -y);
    });
    ctx.restore();
    // 绘制按钮
    this.buttons.forEach((btn, btnIndex) => {
      const radius = this.getHeight(btn.radius);
      // 绘制背景颜色
      this.maxBtnRadius = Math.max(this.maxBtnRadius, radius);
      ctx.beginPath();
      ctx.fillStyle = btn.background || 'rgba(0, 0, 0, 0)';
      ctx.arc(0, 0, radius, 0, Math.PI * 2, false);
      ctx.fill();
      // 绘制指针
      if (btn.pointer) {
        ctx.beginPath();
        ctx.fillStyle = btn.background || 'rgba(0, 0, 0, 0)';
        ctx.moveTo(-radius, 0);
        ctx.lineTo(radius, 0);
        ctx.lineTo(0, -radius * 2);
        ctx.closePath();
        ctx.fill();
      }
      // 绘制按钮图片
      btn.imgs && btn.imgs.forEach((imgInfo, imgIndex) => {
        if (!this.btnImgs[btnIndex]) {
          return;
        }
        const btnImg = this.btnImgs[btnIndex][imgIndex];
        if (!btnImg) {
          return;
        }
        // 计算图片真实宽高
        const [trueWidth, trueHeight] = this.computedWidthAndHeight(btnImg, imgInfo, this.getHeight(btn.radius) * 2, this.getHeight(btn.radius) * 2);
        // 绘制图片
        ctx.drawImage(btnImg, this.getOffsetX(trueWidth), this.getHeight(imgInfo.top, radius), trueWidth, trueHeight);
      });
      // 绘制按钮文字
      btn.fonts && btn.fonts.forEach(font => {
        const fontColor = font.fontColor || defaultStyle.fontColor;
        const fontWeight = font.fontWeight || defaultStyle.fontWeight;
        const fontSize = this.getLength(font.fontSize || defaultStyle.fontSize);
        const fontStyle = font.fontStyle || defaultStyle.fontStyle;
        ctx.fillStyle = fontColor;
        ctx.font = `${fontWeight} ${fontSize * dpr}px ${fontStyle}`;
        String(font.text).split('\n').forEach((line, lineIndex) => {
          ctx.fillText(line, getFontX(line), getFontY(font, radius, lineIndex));
        });
      });
    });
  }
  /**
     * 对外暴露: 开始抽奖方法
     */
  play() {
    // 再次拦截, 因为play是可以异步调用的
    if (this.startTime) {
      return;
    }
    cancelAnimationFrame(this.animationId);
    this.startTime = Date.now();
    this.prizeFlag = undefined;
    this.run();
  }
  /**
     * 对外暴露: 缓慢停止方法
     * @param index 中奖索引
     */
  stop(index) {
    this.prizeFlag = Number(index) % this.prizes.length;
  }
  /**
     * 实际开始执行方法
     * @param num 记录帧动画执行多少次
     */
  run(num = 0) {
    const { prizeFlag, prizeDeg, rotateDeg, defaultConfig } = this;
    const interval = Date.now() - this.startTime;
    // 先完全旋转, 再停止
    if (interval >= defaultConfig.accelerationTime && prizeFlag !== undefined) {
      // 记录帧率
      this.FPS = interval / num;
      // 记录开始停止的时间戳
      this.endTime = Date.now();
      // 记录开始停止的位置
      this.stopDeg = rotateDeg;
      // 最终停止的角度
      this.endDeg = 360 * 5 - prizeFlag * prizeDeg - rotateDeg - defaultConfig.offsetDegree;
      cancelAnimationFrame(this.animationId);
      return this.slowDown();
    }
    this.rotateDeg = (rotateDeg + quad.easeIn(interval, 0, defaultConfig.speed, defaultConfig.accelerationTime)) % 360;
    this.draw();
    this.animationId = window.requestAnimationFrame(this.run.bind(this, num + 1));
  }
  /**
     * 缓慢停止的方法
     */
  slowDown() {
    const { prizes, prizeFlag, stopDeg, endDeg, defaultConfig } = this;
    const interval = Date.now() - this.endTime;
    if (interval >= defaultConfig.decelerationTime) {
      this.startTime = 0;
            this.endCallback({ ...prizes.find((prize, index) => index === prizeFlag) });
            return cancelAnimationFrame(this.animationId);
    }
    this.rotateDeg = quad.easeOut(interval, stopDeg, endDeg, defaultConfig.decelerationTime) % 360;
    this.draw();
    this.animationId = window.requestAnimationFrame(this.slowDown.bind(this));
  }
  /**
     * 获取长度
     * @param length 将要转换的长度
     * @return 返回长度
     */
  getLength(length) {
    if (isExpectType(length, 'number')) {
      return length;
    }
    if (isExpectType(length, 'string')) {
      return this.changeUnits(length, { clean: true });
    }
    return 0;
  }
  /**
     * 获取相对宽度
     * @param length 将要转换的宽度
     * @param width 宽度计算百分比
     * @return 返回相对宽度
     */
  getWidth(length, width = this.prizeRadian * this.prizeRadius) {
    if (isExpectType(length, 'number')) {
      return length * this.dpr;
    }
    if (isExpectType(length, 'string')) {
      return this.changeUnits(length, { denominator: width });
    }
    return 0;
  }
  /**
     * 获取相对高度
     * @param length 将要转换的高度
     * @param height 高度计算百分比
     * @return 返回相对高度
     */
  getHeight(length, height = this.prizeRadius) {
    if (isExpectType(length, 'number')) {
      return length * this.dpr;
    }
    if (isExpectType(length, 'string')) {
      return this.changeUnits(length, { denominator: height });
    }
    return 0;
  }
  /**
     * 获取相对(居中)X坐标
     * @param width
     * @return 返回x坐标
     */
  getOffsetX(width) {
    return -width / 2;
  }
}

export default class Lucky {
  constructor() {
    this.htmlFontSize = 16;
    this.dpr = 1;
    // 初始化
    this.setDpr();
    this.setHTMLFontSize();
    this.resetArrayPropo();
  }
  /**
     * 设备像素比
     */
  setDpr() {
    window.dpr = this.dpr = (window.devicePixelRatio || 2) * 1.3;
  }
  /**
     * 根标签的字体大小
     */
  setHTMLFontSize() {
    this.htmlFontSize = +getComputedStyle(document.documentElement).fontSize.slice(0, -2);
  }
  /**
     * 根据 dpr 缩放 canvas 并处理位移
     * @param canvas 画布
     * @param width 将要等比缩放的宽
     * @param height 将要等比缩放的高
     */
  optimizeClarity(canvas, width, height) {
    const { dpr } = this;
    const compute = (len) => {
      return (len * dpr - len) / (len * dpr) * (dpr / 2) * 100;
    };
    canvas.style.transform = `scale(${1 / dpr}) translate(
      ${-compute(width)}%, ${-compute(height)}%
    )`;
  }
  /**
     * 转换单位
     * @param { string } value 将要转换的值
     * @param config
     * @return { number } 返回新的字符串
     */
  changeUnits(value, { denominator = 1, clean = false }) {
    return Number(value.replace(/^(\-*[0-9.]*)([a-z%]*)$/, (value, num, unit) => {
      switch (unit) {
        case '%':
          num *= (denominator / 100);
          break;
        case 'px':
          num *= 1;
          break;
        case 'rem':
          num *= this.htmlFontSize;
          break;
        default:
          num *= 1;
          break;
      }
      return clean || unit === '%' ? num : num * this.dpr;
    }));
  }
  /**
     * 更新并绘制 canvas
     */
  update() {
  }
  /**
     * 重写数组的原型方法
     */
  resetArrayPropo() {
    const _this = this;
    const oldArrayProto = Array.prototype;
    const newArrayProto = Object.create(oldArrayProto);
    const methods = ['push', 'pop', 'shift', 'unshift', 'sort', 'splice', 'reverse'];
    methods.forEach(name => {
      newArrayProto[name] = function() {
        _this.update();
        console.log(name, '触发了 set');
        oldArrayProto[name].call(this, ...arguments);
      };
    });
  }
  /**
     * vue2.x 响应式 - 数据劫持
     * @param obj 将要处理的数据
     */
  observer(obj, params = []) {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }
    (params.length ? params : Object.keys(obj)).forEach(key => {
      this.defineReactive(obj, key, obj[key]);
    });
  }
  /**
     * vue2.x 响应式 - 重写setter和getter
     * @param obj 数据
     * @param key 属性
     * @param val 值
     */
  defineReactive(obj, key, val) {
    const _this = this;
    _this.observer(val);
    Object.defineProperty(obj, key, {
      get() {
        return val;
      },
      set(newVal) {
        if (newVal !== val) {
          val = newVal;
          _this.observer(val);
          console.log(key, '触发了 set');
          _this.update();
        }
      }
    });
  }
}

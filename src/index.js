import LottoGrid from './LottoGrid.vue'
import LottoWheel from './LottoWheel.vue'

const install = (Vue) => {
  console.log(Vue);
  Vue.component('LuckyGrid', LottoGrid)
  Vue.component('LuckyWheel', LottoWheel)
}

if (typeof window !== 'undefined' && window.Vue) {
  install(window.Vue)
}

export default { install }
export { LottoGrid, LottoWheel }

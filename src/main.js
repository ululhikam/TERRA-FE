import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { revealDirective } from './directives/reveal'
import './style.css'

const app = createApp(App)
app.directive('reveal', revealDirective)
app.use(createPinia())
app.use(router)
app.mount('#app')

<template>
  <div class="qr-container" :style="{ width: `${size}px`, height: `${size}px` }">
    <qrcode-vue
      v-if="value"
      :value="value"
      :size="size"
      :level="level"
      :background="background"
      :foreground="foreground"
      :render-as="'svg'"
      :class="{ 'qr-rounded': rounded }"
    />
    <div v-else class="qr-placeholder">
      Please provide a value
    </div>
    <div v-if="showDownload" class="qr-download">
      <button @click="downloadQR">Download SVG</button>
    </div>
  </div>
</template>

<script>
import QrcodeVue from 'qrcode.vue';

export default {
  name: 'QRCode',
  components: {
    QrcodeVue
  },
  props: {
    value: {
      type: String,
      default: ''
    },
    size: {
      type: Number,
      default: 200
    },
    level: {
      type: String,
      default: 'M',
      validator: val => ['L', 'M', 'Q', 'H'].includes(val)
    },
    background: {
      type: String,
      default: 'transparent'
    },
    foreground: {
      type: String,
      default: '#00d4ff'
    },
    rounded: {
      type: Boolean,
      default: false
    },
    showDownload: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    downloadQR() {
      const svg = document.querySelector('.qr-container svg');
      if (!svg) return;
      
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      const link = document.createElement('a');
      link.download = 'qrcode.svg';
      link.href = svgUrl;
      link.click();
      
      URL.revokeObjectURL(svgUrl);
    }
  }
}
</script>

<style scoped>
.qr-container {
  display: inline-block;
  position: relative;
}

.qr-container svg {
  display: block;
  max-width: 100%;
  height: auto;
}

.qr-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: #f5f5f5;
  color: #666;
  font-size: 14px;
}

.qr-rounded {
  border-radius: 8px;
  overflow: hidden;
}

.qr-download {
  margin-top: 10px;
  text-align: center;
}

.qr-download button {
  padding: 5px 10px;
  background-color: #00d4ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.qr-download button:hover {
  background-color: #0099cc;
}
</style>
<script setup lang="ts">
/**
 * DashboardView.vue — Pantalla principal despues de login
 *
 * Secciones:
 *   1. Header: nombre del jugador, puntos, logout
 *   2. Mis Mimes: tarjetas de tus 3 Mimes (con opcion de compartir)
 *   3. Mimes a mi cargo: Mimes de otros que estas cuidando
 *   4. Adoptar: input para introducir un codigo de compartir
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import MimeCard from '../components/MimeCard.vue'
import { useUserStore } from '../stores/userStore'
import { toStats, copyToClipboard } from '../utils/helpers'
import {
  loadDashboardData,
  generateShareCode,
  claimMime,
  releaseMime,
  resetAllMimes,
  type MimeWithNames,
} from '../services/mimeService'

const router = useRouter()
const userStore = useUserStore()

const myMimes = ref<MimeWithNames[]>([])
const caringMimes = ref<MimeWithNames[]>([])
const loading = ref(true)
const claimCode = ref('')
const claimLoading = ref(false)
const claimMessage = ref('')
const shareModal = ref<{ mimeId: string; code: string; nombre: string } | null>(null)

async function loadData() {
  loading.value = true
  const userId = userStore.user?.id
  if (!userId) { loading.value = false; return }

  const data = await loadDashboardData(userId)
  myMimes.value = data.myMimes
  caringMimes.value = data.caringMimes
  loading.value = false
}

async function handleShare(mimeId: string, nombre: string) {
  const { data } = await generateShareCode(mimeId)
  if (data?.error) { claimMessage.value = data.error; return }
  if (data?.code) shareModal.value = { mimeId, code: data.code, nombre }
}

async function handleClaim() {
  if (!claimCode.value.trim()) return
  claimLoading.value = true
  claimMessage.value = ''

  const { data } = await claimMime(claimCode.value)

  if (data?.error) {
    claimMessage.value = data.error
  } else if (data?.success) {
    claimMessage.value = `Ahora cuidas a ${data.mime_name}!`
    claimCode.value = ''
    await loadData()
  }

  claimLoading.value = false
}

async function handleRelease(mimeId: string) {
  const { data } = await releaseMime(mimeId)
  if (data?.success) await loadData()
}

function goToCare(mimeId: string) {
  router.push(`/care/${mimeId}`)
}

async function handleLogout() {
  await userStore.signOut()
  router.push('/')
}

async function copyCode(code: string) {
  const ok = await copyToClipboard(code)
  claimMessage.value = ok ? 'Codigo copiado!' : `Codigo: ${code}`
  if (ok) setTimeout(() => (claimMessage.value = ''), 2000)
}

async function handleReset() {
  const userId = userStore.user?.id
  if (!userId) return

  await resetAllMimes(userId)
  await userStore.fetchProfile()
  await loadData()
  claimMessage.value = 'Reset completado!'
  setTimeout(() => (claimMessage.value = ''), 2000)
}

onMounted(loadData)
</script>

<template>
  <div class="dashboard">
    <!-- HEADER -->
    <header class="dash-header">
      <div class="header-left">
        <h1 class="app-title">Mimes Care Corp</h1>
        <p class="welcome">Hola, {{ userStore.profile?.display_name || 'Jugador' }}</p>
      </div>
      <div class="header-right">
        <div class="puntos-badge">
          <span class="puntos-heart">&#9829;</span>
          <span>{{ userStore.profile?.puntos_mimes ?? 0 }} PM</span>
        </div>
        <button class="logout-btn" @click="handleLogout">Salir</button>
      </div>
    </header>

    <!-- LOADING -->
    <div v-if="loading" class="loading-state">
      <p>Cargando...</p>
    </div>

    <template v-else>
      <!-- MIS MIMES -->
      <section class="section">
        <h2 class="section-title">Mis Mimes</h2>
        <div class="cards-list">
          <MimeCard
            v-for="mime in myMimes"
            :key="mime.id"
            :id="mime.id"
            :nombre="mime.nombre"
            :personalidad="mime.personalidad"
            :color-theme="mime.color_theme"
            :stats="toStats(mime)"
            :afinidad="mime.afinidad"
            :cuidador-name="mime.cuidador_name || null"
            mode="own"
            @share="handleShare(mime.id, mime.nombre)"
          />
        </div>
      </section>

      <!-- MIMES A MI CARGO -->
      <section class="section">
        <h2 class="section-title">Mimes a mi cargo</h2>
        <div v-if="caringMimes.length === 0" class="empty-state">
          <p>No estas cuidando ningun Mime todavia.</p>
          <p class="empty-hint">Pide a alguien que comparta su Mime contigo</p>
        </div>
        <div v-else class="cards-list">
          <MimeCard
            v-for="mime in caringMimes"
            :key="mime.id"
            :id="mime.id"
            :nombre="mime.nombre"
            :personalidad="mime.personalidad"
            :color-theme="mime.color_theme"
            :stats="toStats(mime)"
            :afinidad="mime.afinidad"
            :dueno-name="mime.dueno_name || null"
            mode="caring"
            @care="goToCare(mime.id)"
            @release="handleRelease(mime.id)"
          />
        </div>
      </section>

      <!-- ADOPTAR MIME -->
      <section class="section claim-section">
        <h2 class="section-title">Adoptar Mime</h2>
        <p class="section-desc">Introduce el codigo que te hayan compartido</p>
        <div class="claim-row">
          <input
            v-model="claimCode"
            class="claim-input"
            type="text"
            placeholder="Ej: A3F2B1"
            maxlength="6"
            @keyup.enter="handleClaim"
          />
          <button
            class="claim-btn"
            :disabled="claimLoading || !claimCode.trim()"
            @click="handleClaim"
          >
            {{ claimLoading ? '...' : 'Adoptar' }}
          </button>
        </div>
        <p v-if="claimMessage" class="claim-msg">{{ claimMessage }}</p>
      </section>
      <!-- RESET (solo para pruebas) -->
      <section class="section">
        <button class="reset-btn" @click="handleReset">
          Reset (pruebas): restaurar stats y puntos
        </button>
      </section>
    </template>

    <!-- SHARE MODAL -->
    <div v-if="shareModal" class="modal-overlay" @click.self="shareModal = null">
      <div class="modal-card">
        <h3>Compartir {{ shareModal.nombre }}</h3>
        <p class="modal-desc">Dale este codigo a quien quieras que lo cuide:</p>
        <div class="code-display">
          <span class="code-text">{{ shareModal.code }}</span>
          <button class="copy-btn" @click="copyCode(shareModal.code)">Copiar</button>
        </div>
        <p class="modal-hint">El codigo es de un solo uso. Cuando alguien lo introduzca, se convertira en el cuidador de tu Mime.</p>
        <button class="modal-close" @click="shareModal = null">Cerrar</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  min-height: 100vh;
  padding-bottom: 24px;
}

/* HEADER */
.dash-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 0;
  z-index: 20;
}

.app-title {
  font-size: 18px;
  font-weight: 700;
  color: #5c6bc0;
  margin: 0;
  line-height: 1.2;
}

.welcome {
  font-size: 13px;
  color: #999;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.puntos-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #fff3e0;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 700;
  color: #e65100;
  border: 1.5px solid #ffe0b2;
}

.puntos-heart {
  color: #ff7043;
  font-size: 12px;
}

.logout-btn {
  background: none;
  border: 1.5px solid #e0e0e0;
  border-radius: 10px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 700;
  color: #999;
  font-family: 'Baloo 2', cursive;
  cursor: pointer;
}

.logout-btn:active {
  background: #f5f5f5;
}

/* SECTIONS */
.section {
  padding: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #333;
  margin: 0 0 12px;
}

.section-desc {
  font-size: 13px;
  color: #999;
  margin: -8px 0 12px;
}

.cards-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* EMPTY STATE */
.empty-state {
  text-align: center;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 12px;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
  color: #888;
}

.empty-hint {
  font-size: 12px !important;
  color: #bbb !important;
  margin-top: 4px !important;
}

/* CLAIM / ADOPT */
.claim-section {
  background: #f8f9ff;
  margin: 0 16px;
  border-radius: 16px;
  padding: 16px !important;
}

.claim-row {
  display: flex;
  gap: 8px;
}

.claim-input {
  flex: 1;
  padding: 10px 14px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 16px;
  font-family: 'Baloo 2', cursive;
  text-transform: uppercase;
  letter-spacing: 2px;
  text-align: center;
  outline: none;
}

.claim-input:focus {
  border-color: #5c6bc0;
}

.claim-btn {
  padding: 10px 20px;
  background: #5c6bc0;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  font-family: 'Baloo 2', cursive;
  cursor: pointer;
}

.claim-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.claim-btn:active:not(:disabled) {
  background: #3f51b5;
}

.claim-msg {
  margin-top: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #5c6bc0;
  text-align: center;
}

/* LOADING */
.loading-state {
  display: flex;
  justify-content: center;
  padding: 60px;
  color: #999;
}

/* RESET BUTTON */
.reset-btn {
  width: 100%;
  padding: 12px;
  background: #ffebee;
  color: #c62828;
  border: 1.5px dashed #ef9a9a;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  font-family: 'Baloo 2', cursive;
  cursor: pointer;
}

.reset-btn:active {
  background: #ffcdd2;
}

/* SHARE MODAL */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 24px;
}

.modal-card {
  background: white;
  border-radius: 20px;
  padding: 24px;
  width: 100%;
  max-width: 340px;
  text-align: center;
}

.modal-card h3 {
  font-size: 18px;
  color: #333;
  margin: 0 0 8px;
}

.modal-desc {
  font-size: 13px;
  color: #999;
  margin: 0 0 16px;
}

.code-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 16px 0;
}

.code-text {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 4px;
  color: #5c6bc0;
}

.copy-btn {
  padding: 6px 14px;
  background: #e8eaf6;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  color: #5c6bc0;
  font-family: 'Baloo 2', cursive;
  cursor: pointer;
}

.copy-btn:active {
  background: #c5cae9;
}

.modal-hint {
  font-size: 11px;
  color: #bbb;
  margin: 0 0 16px;
}

.modal-close {
  padding: 10px 32px;
  background: #5c6bc0;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  font-family: 'Baloo 2', cursive;
  cursor: pointer;
}

.modal-close:active {
  background: #3f51b5;
}
</style>

<template>
  <div class="flex min-h-screen">
    <!-- Left: Form Area -->
    <div class="flex flex-1 items-center justify-center p-6 lg:p-12">
      <div class="w-full max-w-md">
        <slot />
      </div>
    </div>

    <!-- Right: Visual Area -->
    <div class="hidden lg:flex lg:flex-1 items-center justify-center bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-600 relative overflow-hidden">
      <!-- Decorative circles -->
      <div class="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-white/5" />
      <div class="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-white/5" />
      <div class="absolute top-1/3 right-1/4 h-40 w-40 rounded-full bg-white/10" />

      <!-- Content -->
      <div class="relative z-10 max-w-lg px-12 text-center">
        <!-- Logo -->
        <div class="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm text-white text-3xl font-bold shadow-2xl">
          P
        </div>

        <h2 class="mb-4 text-3xl font-bold text-white">
          Sistem Informasi Akademik
        </h2>
        <p class="mb-8 text-lg text-emerald-100 leading-relaxed">
          Pascasarjana — Penjadwalan, Monitoring, dan Pelaporan Terpadu
        </p>

        <!-- Features -->
        <div class="grid grid-cols-2 gap-4 text-left">
          <div class="rounded-xl bg-white/10 backdrop-blur-sm p-4">
            <p class="text-sm font-semibold text-white">📅 Penjadwalan</p>
            <p class="text-xs text-emerald-200 mt-1">Plotting jadwal otomatis, deteksi bentrok</p>
          </div>
          <div class="rounded-xl bg-white/10 backdrop-blur-sm p-4">
            <p class="text-sm font-semibold text-white">📊 Monitoring</p>
            <p class="text-xs text-emerald-200 mt-1">Absensi dosen real-time oleh staff</p>
          </div>
          <div class="rounded-xl bg-white/10 backdrop-blur-sm p-4">
            <p class="text-sm font-semibold text-white">📝 Jurnal</p>
            <p class="text-xs text-emerald-200 mt-1">Jurnal perkuliahan 16 pertemuan</p>
          </div>
          <div class="rounded-xl bg-white/10 backdrop-blur-sm p-4">
            <p class="text-sm font-semibold text-white">📄 Laporan BKD</p>
            <p class="text-xs text-emerald-200 mt-1">Export SK, Jurnal, Nilai otomatis</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

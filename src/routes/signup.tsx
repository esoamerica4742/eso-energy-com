<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Create Your Workspace</title>
  <!-- Tailwind CSS for modern layout utility styling -->
  <script src="https://tailwindcss.com"></script>
  <!-- Google Fonts for premium typography -->
  <link rel="preconnect" href="https://googleapis.com">
  <link rel="preconnect" href="https://gstatic.com" crossorigin>
  <link href="https://googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0b0c10; }
    h1 { font-family: 'Playfair Display', serif; }
  </style>
</head>
<body class="flex items-center justify-center min-h-screen p-4 text-slate-100">

  <div class="w-full max-w-md p-8 rounded-2xl bg-zinc-950/80 border border-zinc-800 backdrop-blur-md shadow-2xl">
    
    <!-- Step Tracker Header -->
    <div class="flex items-center justify-center gap-4 mb-8">
      <div class="flex items-center justify-center w-8 h-8 rounded-full border border-amber-500 bg-amber-500/10 text-amber-500 font-semibold text-sm">1</div>
      <div class="h-[1px] w-12 bg-zinc-800"></div>
      <div class="flex items-center justify-center w-8 h-8 rounded-full border border-zinc-700 text-zinc-500 font-semibold text-sm">2</div>
    </div>

    <!-- Main Title -->
    <div class="text-center mb-8">
      <h1 class="text-4xl font-normal tracking-wide text-zinc-100 mb-2">Create your workspace</h1>
      <p class="text-zinc-400 text-sm tracking-wide">Start monitoring your inverter portfolio in minutes.</p>
    </div>

    <!-- SSO Buttons Row -->
    <div class="grid grid-cols-2 gap-4 mb-6">
      <!-- Google Auth Button -->
      <button class="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 transition-colors text-zinc-300 font-medium text-sm">
        <svg class="w-4 h-4" viewBox="0 0 24 24">
          <path fill="#EA4335" d="M12 5.04c1.62 0 3.08.56 4.22 1.65l3.15-3.15C17.45 1.74 14.96 1 12 1 7.37 1 3.42 3.66 1.51 7.54l3.78 2.93c.89-2.67 3.4-4.43 6.71-4.43z"/>
          <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.43h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.39-4.88 3.39-8.48z"/>
          <path fill="#FBBC05" d="M5.29 14.59c-.23-.69-.36-1.42-.36-2.19s.13-1.5.36-2.19L1.51 7.54C.55 9.48 0 11.68 0 12s.55 2.52 1.51 4.46l3.78-2.87z"/>
          <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.66-2.84c-1.1.74-2.51 1.18-4.3 1.18-3.31 0-5.82-1.76-6.71-4.43L1.51 16.92C3.42 20.34 7.37 23 12 23z"/>
        </svg>
        Google SSO
      </button>

      <!-- CORRECT Microsoft Auth Button -->
      <button class="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 transition-colors text-zinc-300 font-medium text-sm">
        <svg class="w-4 h-4" viewBox="0 0 23 23">
          <path fill="#f25022" d="M0 0h11v11H0z"/>
          <path fill="#7fba00" d="M12 0h11v11H12z"/>
          <path fill="#00a4ef" d="M0 12h11v11H0z"/>
          <path fill="#ffb900" d="M12 12h11v11H12z"/>
        </svg>
        Microsoft SSO
      </button>
    </div>

    <!-- Decorative Text Divider -->
    <div class="relative flex py-2 items-center mb-6">
      <div class="flex-grow border-t border-zinc-800"></div>
      <span class="flex-shrink mx-4 text-xs font-semibold text-zinc-500 uppercase tracking-widest">or continue with email</span>
      <div class="flex-grow border-t border-zinc-800"></div>
    </div>

    <!-- Form Section -->
    <form class="space-y-5">
      <!-- Name Group Inputs -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-semibold text-zinc-400 tracking-wider uppercase mb-2">First Name</label>
          <input type="text" placeholder="Alex" class="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 text-sm transition-all">
        </div>
        <div>
          <label class="block text-xs font-semibold text-zinc-400 tracking-wider uppercase mb-2">Last Name</label>
          <input type="text" placeholder="Morgan" class="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 text-sm transition-all">
        </div>
      </div>

      <!-- Email Input -->
      <div>
        <label class="block text-xs font-semibold text-zinc-400 tracking-wider uppercase mb-2">Work Email</label>
        <div class="relative">
          <input type="email" placeholder="alex@company.com" class="w-full pl-4 pr-10 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 text-sm transition-all">
          <span class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-zinc-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
          </span>
        </div>
      </div>

      <!-- Password Input -->
      <div>
        <label class="block text-xs font-semibold text-zinc-400 tracking-wider uppercase mb-2">Password</label>
        <div class="relative">
          <input type="password" placeholder="Min. 8 characters" class="w-full pl-4 pr-10 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 text-sm transition-all">
          <button type="button" class="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-600 hover:text-zinc-400 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
          </button>
        </div>
      </div>

      <!-- Action Button -->
      <button type="submit" class="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 font-semibold text-sm text-zinc-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-[0_4px_20px_rgba(245,158,11,0.2)] transition-all transform active:scale-[0.99]">
        CONTINUE — FLEET SETUP
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
      </button>
    </form>

  </div>

</body>
</html>

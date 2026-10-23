# Frontend Auth UI & Session Management Investigation Report (Milestone 1)

**Agent**: `teamwork_preview_explorer_m1_3` (Explorer M1-3: Frontend Auth UI & Session Management)  
**Date**: 2026-10-23  
**Working Directory**: `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_m1_3`  
**Target Codebase**: `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local`  
**Target Files**: `public/js/app.js`, `public/style.css`  
**Milestone Focus**: M1 (Modern Authentication & SQLite Persistence — R1 Specification)

---

## 1. Observation

### 1.1 Current `authView()` Implementation
Direct inspection of `public/js/app.js:37-61`:
```javascript
/* ---------------- Auth ---------------- */
function authView() {
  $app.innerHTML = `<div class="center"><form class="card" id="f">
    <h2 style="margin:0">Madera local</h2>
    <span class="muted">Inicia sesión o crea una cuenta local</span>
    <input name="email" type="email" placeholder="Email" required>
    <input name="password" type="password" placeholder="Contraseña" required>
    <div class="err" id="err"></div>
    <button class="primary" data-m="login">Entrar</button>
    <button type="button" data-m="register">Crear cuenta</button>
  </form></div>`;
  const f = document.getElementById('f');
  const go = async (mode) => {
    try {
      await api('POST', '/api/' + mode, { email: f.email.value, password: f.password.value });
      route();
    } catch (e) {
      document.getElementById('err').textContent = e.message;
    }
  };
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    go('login');
  });
  f.querySelector('[data-m=register]').onclick = () => go('register');
}
```

#### Deficiencies Identified:
1. **Single Minimal Box Without Differentiated Views**:
   - The form renders a single static card with two conflicting action buttons: `Entrar` (form submit button) and `Crear cuenta` (secondary button).
   - There are no tabs, segment toggles, or transitions between Login and Register states.
2. **Missing Name Field for Registration**:
   - R1 specification mandates a registration screen collecting: Full Name (`name`), Email (`email`), and Password (`password`).
   - The existing form only provides inputs for `email` and `password`. When a user attempts to register, no `name` parameter is sent to the server. Under M1-1 backend schema validation, registration requests without a valid `name` (2–100 characters) will fail with `400 Bad Request`.
3. **Absence of Google Sign-In**:
   - There is no Google Sign-In button, no Google branding, no SVG icon, and no OAuth/simulated callback handling.
4. **Lack of Client-Side Validation and Hints**:
   - No email format verification (RFC 5322 standard regex).
   - No password minimum length check (6 characters).
   - No helper hints or real-time validation feedback for users.
5. **Primitive Error Display**:
   - Uses an unstyled `<div class="err" id="err"></div>`.
   - The task specification requires an error banner container (`#authErr`) with icon and clear messaging.
   - Errors are not cleared when the user alters input values.
6. **Legacy Endpoint Paths**:
   - Targets `/api/login` and `/api/register` instead of standard REST endpoints `/api/auth/login` and `/api/auth/register`.

---

### 1.2 Session Management & Profile State
Direct inspection of `public/js/app.js:22-35`:
```javascript
async function route() {
  if (cleanup) cleanup();
  cleanup = null;
  try {
    await api('GET', '/api/me');
  } catch {
    return authView();
  }
  const m = location.hash.match(/^#\/p\/(\d+)/);
  if (m) return editorView(Number(m[1]));
  return listView();
}
window.addEventListener('hashchange', route);
```

#### Deficiencies Identified:
1. **Unstored User Profile State**:
   - The return value of `/api/me` (or `/api/auth/me`) is completely discarded (`await api('GET', '/api/me')`).
   - There is no `currentUser` variable in the module scope to store user properties (`id`, `name`, `email`, `avatar_url`, `provider`).
2. **Cookie-Only Dependency in Client API Helper**:
   - `api()` in `app.js:8-17` does not support or store Bearer tokens (`localStorage.getItem('madera_token')`). In development or multi-client environments where cookies might be blocked or when utilizing simulated tokens, this leads to authentication drops.

---

### 1.3 Missing Header Profile Indicator
Direct inspection of `listView()` (`public/js/app.js:64-70`) and `editorView()` (`public/js/app.js:126-133`):
```javascript
// listView header
$app.innerHTML = `<div class="list">
  <header><h2 style="margin:0">Mis proyectos</h2>
  <div class="row"><button class="primary" id="new">+ Nuevo mueble</button><button id="out">Salir</button></div></header>
  ...
```
```javascript
// editorView topbar
$app.innerHTML = `<div class="editor">
  <div class="left">
    <div class="topbar">
      <div class="pill"><button id="back">←</button><input id="name" style="background:transparent;border:none;width:150px" value="${esc(state.name)}"><button id="cfg">⚙</button></div>
      <div class="pill"><button data-tab="design" class="on">Diseño</button><button data-tab="cutlist">Cutlist</button></div>
      <span class="price" id="price"></span>
    </div>
    ...
```

#### Deficiencies Identified:
1. Neither the project list header nor the editor topbar displays who is logged in.
2. No user name, email, avatar image, or initial badge is rendered.
3. Users have no visual context confirming which account owns the active session or created the current project.

---

### 1.4 Existing CSS Styles
Direct inspection of `public/style.css:12-15`:
```css
.center { display:flex; align-items:center; justify-content:center; height:100%; }
.card { background:var(--panel); border-radius:16px; padding:24px; width:340px; display:flex; flex-direction:column; gap:12px; }
.err { color:var(--danger); min-height:1em; }
.muted { color:var(--muted); }
```
The stylesheet lacks classes for tab toggles, form group labels, helper hints, Google branded button, error banner `#authErr`, user profile avatar, and initial badges.

---

## 2. Logic Chain

### 2.1 Tab-Based Dual Mode Auth UI Architecture
1. **State Machine**:
   - Maintain a local view state variable `let currentMode = 'login'` (or `'register'`).
   - Render two clickable tabs:
     - Tab 1: `[data-mode="login"]` ("Iniciar sesión")
     - Tab 2: `[data-mode="register"]` ("Crear cuenta")
2. **Dynamic UI Adaptation**:
   - When `currentMode === 'login'`:
     - Full Name input field (`#nameGroup`) is hidden (`display: none`).
     - Submit button displays: `Iniciar sesión`.
     - Subtitle displays: `Bienvenido de nuevo. Accede a tus proyectos modulares.`
     - Toggle link displays: `¿No tienes una cuenta? Regístrate aquí`.
   - When `currentMode === 'register'`:
     - Full Name input field (`#nameGroup`) is visible (`display: flex`).
     - Submit button displays: `Crear cuenta`.
     - Subtitle displays: `Crea tu cuenta para diseñar y guardar muebles modulares.`
     - Toggle link displays: `¿Ya tienes una cuenta? Inicia sesión`.
3. **Smooth Switching**:
   - Clicking either tab or the bottom toggle link smoothly toggles mode without re-rendering the outer DOM or wiping already-entered email values.
   - Any active error banner is immediately hidden upon mode switch.

---

### 2.2 Input Fields & Client-Side Validation Rules
1. **Full Name (`name`)** (Register mode only):
   - Constraints: trimmed length between 2 and 100 characters.
   - Validation message: `"Por favor, ingresa tu nombre completo (mínimo 2 caracteres)."`
   - Input attributes: `type="text"`, `name="name"`, `autocomplete="name"`, `placeholder="Ej. Ana García"`.
2. **Email (`email`)** (Both modes):
   - Constraints: non-empty, RFC 5322 regular expression `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.
   - Validation message: `"Por favor, ingresa un correo electrónico válido."`
   - Input attributes: `type="email"`, `name="email"`, `autocomplete="email"`, `placeholder="tu@email.com"`.
3. **Password (`password`)** (Both modes):
   - Constraints:
     - Register mode: length between 6 and 128 characters. Message: `"La contraseña debe tener al menos 6 caracteres."`
     - Login mode: non-empty. Message: `"Por favor, ingresa tu contraseña."`
   - Input attributes: `type="password"`, `name="password"`, `autocomplete="current-password"` (or `new-password`), `placeholder="••••••••"`.
4. **Validation Hints**:
   - Under the password field in register mode, display a helper note: `<span class="form-hint">Mínimo 6 caracteres</span>`.

---

### 2.3 Official Google Sign-In Button (Google Branding Compliance)
Per Google Identity Services & Branding Guidelines:
1. **Official Multi-Colored SVG Icon**:
   - The official 4-color Google "G" vector:
     ```html
     <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
       <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
       <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
       <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
       <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
     </svg>
     ```
2. **Text Label**:
   - `"Iniciar sesión con Google"` (standardized localized Spanish label).
3. **Button Styling**:
   - Background: `#FFFFFF` (clean white surface contrasting with dark application background).
   - Text color: `#3C4043` (Google standard dark gray).
   - Border: `1px solid #DADCE0`.
   - Border radius: `8px` (harmonious with Madera UI input radius).
   - Font: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`, `font-weight: 500`.
   - Hover state: Background `#F8FAFD`, border `#DADCE0`, subtle box-shadow `0 1px 3px rgba(60,64,67,0.2)`.
   - Active state: Background `#EEEEEE`.
4. **Visual Separator**:
   - Placed directly beneath the Google button or between local form and Google button:
     `<div class="auth-divider"><span>o bien con correo</span></div>`
5. **Direct Integration**:
   - Clicking triggers `location.href = '/api/auth/google'`.
   - In offline development or when credentials are not configured, the backend automatically directs to the simulated Google Account Chooser. Upon account selection, the user is redirected back to `/#/` with session cookie set.

---

### 2.4 Error Banner (`#authErr`) Specification
1. **DOM Structure**:
   ```html
   <div class="auth-err" id="authErr" role="alert" style="display:none">
     <svg class="auth-err-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
       <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
     </svg>
     <span class="auth-err-msg"></span>
   </div>
   ```
2. **Styling**:
   - Background: `rgba(229, 72, 77, 0.14)` (subtle transparent red).
   - Border: `1px solid var(--danger)`.
   - Color: `#ff8282`.
   - Border-radius: `8px`.
   - Padding: `10px 14px`.
   - Font-size: `13px`.
3. **Behavior**:
   - Helper function `showAuthError(message)` updates text and displays banner.
   - Helper function `clearAuthError()` hides banner.
   - Attaching `input` event listener to form inputs automatically clears `#authErr` as soon as the user starts typing.

---

### 2.5 Session Management & Header Profile Indicator Architecture
1. **Module-Level State**:
   ```javascript
   let currentUser = null;
   ```
2. **Authentication Check (`fetchSession`)**:
   ```javascript
   async function fetchSession() {
     try {
       const res = await api('GET', '/api/auth/me').catch(() => api('GET', '/api/me'));
       currentUser = res.user || res;
       return currentUser;
     } catch {
       currentUser = null;
       return null;
     }
   }
   ```
3. **Dual Token & Cookie Persistence**:
   - In `api()` helper:
     ```javascript
     const token = localStorage.getItem('madera_token');
     const headers = {};
     if (body) headers['Content-Type'] = 'application/json';
     if (token) headers['Authorization'] = `Bearer ${token}`;
     ```
   - On login/register or mock auth response: if `token` is present in response, save `localStorage.setItem('madera_token', j.token)`.
   - On logout: call `POST /api/auth/logout`, remove token via `localStorage.removeItem('madera_token')`, set `currentUser = null`, and redirect to `authView()`.
4. **Profile Avatar & Initial Badge Generator**:
   ```javascript
   function renderUserAvatar(user, size = 32) {
     if (user?.avatar_url) {
       return `<img class="user-avatar" src="${esc(user.avatar_url)}" alt="${esc(user.name || 'Avatar')}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;">`;
     }
     const name = user?.name || user?.email || 'U';
     const initials = name
       .split(/\s+/)
       .filter(Boolean)
       .slice(0, 2)
       .map((n) => n[0].toUpperCase())
       .join('') || 'U';
     return `<div class="user-avatar user-initials" style="width:${size}px;height:${size}px;line-height:${size}px;font-size:${Math.round(size * 0.42)}px;">${esc(initials)}</div>`;
   }
   ```
5. **Dashboard Header Placement (`listView`)**:
   - Top right of header:
     ```html
     <div class="user-profile-chip">
       ${renderUserAvatar(currentUser, 32)}
       <div class="user-profile-info">
         <span class="user-name">${esc(currentUser?.name || currentUser?.email?.split('@')[0])}</span>
         <span class="user-email">${esc(currentUser?.email || '')}</span>
       </div>
       <button id="out" class="btn-logout" title="Cerrar sesión">Salir</button>
     </div>
     ```
6. **Editor Topbar Placement (`editorView`)**:
   - Integrated into `.topbar` adjacent to the price indicator:
     ```html
     <div class="editor-user-badge" title="${esc(currentUser?.name || '')} (${esc(currentUser?.email || '')})">
       ${renderUserAvatar(currentUser, 26)}
     </div>
     ```

---

## 3. Caveats

1. **Simulated vs Real OAuth Google Sign-In**:
   - `location.href = '/api/auth/google'` triggers a full browser redirect. In simulated mode, the backend immediately renders the local account picker or redirects back with a simulated cookie. When real credentials exist in environment variables, it reaches Google's OAuth 2.0 servers. The frontend logic remains 100% agnostic to whether real or simulated Google OAuth is active.
2. **Backward Compatibility**:
   - Downstream implementers must maintain dual route fallbacks (`/api/auth/login` with `/api/login` fallback, `/api/auth/me` with `/api/me` fallback) until all milestone integration is concluded.
3. **Editor Topbar Space Conservation**:
   - On small screens (<768px), the editor topbar can become dense. The profile indicator in `editorView` is intentionally designed as a compact 26px avatar badge with tooltip to preserve room for canvas tools and pricing.

---

## 4. Conclusion & Proposed Implementation

Below are the exact, drop-in replacement proposals for `public/js/app.js` and `public/style.css`.

### 4.1 Proposed JavaScript Changes (`public/js/app.js`)

#### A. Global User State & Session Routing
```javascript
// Replace lines 19-35 in public/js/app.js:
let viewer = null;
let cleanup = null;
let currentUser = null;

async function fetchSession() {
  try {
    const res = await api('GET', '/api/auth/me').catch(() => api('GET', '/api/me'));
    currentUser = res.user || res;
    return currentUser;
  } catch {
    currentUser = null;
    return null;
  }
}

async function route() {
  if (cleanup) cleanup();
  cleanup = null;
  const user = await fetchSession();
  if (!user) {
    return authView();
  }
  const m = location.hash.match(/^#\/p\/(\d+)/);
  if (m) return editorView(Number(m[1]));
  return listView();
}
window.addEventListener('hashchange', route);
```

#### B. Complete Modern `authView()` Implementation
```javascript
// Replace lines 37-61 in public/js/app.js:
/* ---------------- Auth View ---------------- */
function authView() {
  let authMode = 'login'; // 'login' | 'register'

  $app.innerHTML = `
  <div class="center auth-wrapper">
    <div class="auth-card">
      <div class="auth-header">
        <h2 class="auth-title">Madera local</h2>
        <span class="auth-subtitle" id="authSubtitle">Inicia sesión en tu cuenta para acceder a tus muebles</span>
      </div>

      <!-- Google Sign-In Button (Prominent & Official Branding) -->
      <button type="button" class="btn-google" id="btnGoogle">
        <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        <span>Iniciar sesión con Google</span>
      </button>

      <div class="auth-divider"><span>o bien con correo</span></div>

      <!-- Mode Selector Tabs -->
      <div class="auth-tabs">
        <button type="button" class="auth-tab on" id="tabLogin" data-m="login">Iniciar sesión</button>
        <button type="button" class="auth-tab" id="tabRegister" data-m="register">Crear cuenta</button>
      </div>

      <!-- Error Banner -->
      <div class="auth-err" id="authErr" style="display:none" role="alert">
        <span class="auth-err-icon">⚠️</span>
        <span class="auth-err-text" id="authErrText"></span>
      </div>

      <!-- Local Credentials Form -->
      <form class="auth-form" id="authForm" novalidate>
        <div class="form-group" id="nameGroup" style="display:none">
          <label class="form-label" for="inpName">Nombre completo</label>
          <input class="form-input" id="inpName" name="name" type="text" autocomplete="name" placeholder="Ej. Ana García">
          <span class="form-hint">Mínimo 2 caracteres</span>
        </div>

        <div class="form-group">
          <label class="form-label" for="inpEmail">Correo electrónico</label>
          <input class="form-input" id="inpEmail" name="email" type="email" autocomplete="email" placeholder="tu@email.com" required>
        </div>

        <div class="form-group">
          <label class="form-label" for="inpPass">Contraseña</label>
          <input class="form-input" id="inpPass" name="password" type="password" autocomplete="current-password" placeholder="••••••••" required>
          <span class="form-hint" id="passHint" style="display:none">Mínimo 6 caracteres</span>
        </div>

        <button class="primary btn-submit" id="btnSubmit" type="submit">Iniciar sesión</button>
      </form>

      <div class="auth-footer">
        <span id="footerPrompt">¿No tienes una cuenta?</span>
        <a href="javascript:void(0)" class="auth-toggle-link" id="authToggleLink">Regístrate aquí</a>
      </div>
    </div>
  </div>`;

  const form = document.getElementById('authForm');
  const errBox = document.getElementById('authErr');
  const errText = document.getElementById('authErrText');
  const nameGroup = document.getElementById('nameGroup');
  const passHint = document.getElementById('passHint');
  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  const btnSubmit = document.getElementById('btnSubmit');
  const subtitle = document.getElementById('authSubtitle');
  const footerPrompt = document.getElementById('footerPrompt');
  const toggleLink = document.getElementById('authToggleLink');

  const showErr = (msg) => {
    if (!msg) {
      errBox.style.display = 'none';
      errText.textContent = '';
    } else {
      errText.textContent = msg;
      errBox.style.display = 'flex';
    }
  };

  const setMode = (mode) => {
    authMode = mode;
    showErr('');
    if (mode === 'login') {
      tabLogin.classList.add('on');
      tabRegister.classList.remove('on');
      nameGroup.style.display = 'none';
      passHint.style.display = 'none';
      btnSubmit.textContent = 'Iniciar sesión';
      subtitle.textContent = 'Inicia sesión en tu cuenta para acceder a tus muebles';
      footerPrompt.textContent = '¿No tienes una cuenta?';
      toggleLink.textContent = 'Regístrate aquí';
      form.password.autocomplete = 'current-password';
    } else {
      tabLogin.classList.remove('on');
      tabRegister.classList.add('on');
      nameGroup.style.display = 'flex';
      passHint.style.display = 'block';
      btnSubmit.textContent = 'Crear cuenta';
      subtitle.textContent = 'Crea tu cuenta para diseñar y guardar muebles modulares';
      footerPrompt.textContent = '¿Ya tienes una cuenta?';
      toggleLink.textContent = 'Inicia sesión';
      form.password.autocomplete = 'new-password';
    }
  };

  tabLogin.onclick = () => setMode('login');
  tabRegister.onclick = () => setMode('register');
  toggleLink.onclick = () => setMode(authMode === 'login' ? 'register' : 'login');

  // Clear errors on typing
  form.addEventListener('input', () => showErr(''));

  // Google OAuth button redirect
  document.getElementById('btnGoogle').onclick = () => {
    location.href = '/api/auth/google';
  };

  // Submit Handler with Client-Side Validation
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.email.value.trim().toLowerCase();
    const password = form.password.value;
    const name = form.name.value.trim();

    // Client-side validations
    if (authMode === 'register') {
      if (!name || name.length < 2) {
        showErr('Por favor, ingresa tu nombre completo (mínimo 2 caracteres).');
        form.name.focus();
        return;
      }
      if (name.length > 100) {
        showErr('El nombre no debe superar los 100 caracteres.');
        form.name.focus();
        return;
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      showErr('Por favor, ingresa un correo electrónico válido.');
      form.email.focus();
      return;
    }

    if (!password || (authMode === 'register' && password.length < 6)) {
      showErr(
        authMode === 'register'
          ? 'La contraseña debe tener al menos 6 caracteres.'
          : 'Por favor, ingresa tu contraseña.'
      );
      form.password.focus();
      return;
    }

    // Submit API request
    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const legacyEndpoint = authMode === 'register' ? '/api/register' : '/api/login';
      const body = authMode === 'register' ? { name, email, password } : { email, password };

      const res = await api('POST', endpoint, body).catch(() => api('POST', legacyEndpoint, body));
      if (res.token) {
        localStorage.setItem('madera_token', res.token);
      }
      currentUser = res.user || { email };
      route();
    } catch (err) {
      showErr(err.message || 'Error al autenticar. Revisa tus credenciales.');
    }
  });
}
```

#### C. Avatar & Initial Badge Helper Function
```javascript
function renderUserAvatar(user, size = 32) {
  if (user?.avatar_url) {
    return `<img class="user-avatar" src="${esc(user.avatar_url)}" alt="${esc(user.name || 'Avatar')}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;">`;
  }
  const name = user?.name || user?.email || 'U';
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('') || 'U';
  return `<div class="user-avatar user-initials" style="width:${size}px;height:${size}px;line-height:${size}px;font-size:${Math.round(size * 0.42)}px;">${esc(initials)}</div>`;
}
```

#### D. Header Profile Integration in `listView()` & `editorView()`
```javascript
// In listView():
async function listView() {
  const projects = await api('GET', '/api/projects');
  $app.innerHTML = `<div class="list">
    <header class="list-header">
      <div class="brand-row">
        <h2 style="margin:0">Mis proyectos</h2>
      </div>
      <div class="header-actions">
        <button class="primary" id="new">+ Nuevo mueble</button>
        <div class="user-profile-chip" id="userProfileChip">
          ${renderUserAvatar(currentUser, 32)}
          <div class="user-profile-info">
            <span class="user-name">${esc(currentUser?.name || currentUser?.email?.split('@')[0] || 'Usuario')}</span>
            <span class="user-email muted">${esc(currentUser?.email || '')}</span>
          </div>
          <button id="out" class="btn-logout" title="Cerrar sesión">Salir</button>
        </div>
      </div>
    </header>
    ...`;
  
  // Logout handling:
  document.getElementById('out').onclick = async () => {
    try {
      await api('POST', '/api/auth/logout').catch(() => api('POST', '/api/logout'));
    } catch {}
    localStorage.removeItem('madera_token');
    currentUser = null;
    route();
  };
  ...
}

// In editorView(id):
// In the topbar container:
<div class="topbar">
  <div class="pill"><button id="back">←</button><input id="name" style="background:transparent;border:none;width:150px" value="${esc(state.name)}"><button id="cfg">⚙</button></div>
  <div class="pill"><button data-tab="design" class="on">Diseño</button><button data-tab="cutlist">Cutlist</button></div>
  <span class="price" id="price"></span>
  <div class="editor-user-badge" title="${esc(currentUser?.name || '')} (${esc(currentUser?.email || '')})">
    ${renderUserAvatar(currentUser, 28)}
  </div>
</div>
```

---

### 4.2 Proposed CSS Styles (`public/style.css`)

```css
/* ==========================================================================
   Modern Authentication UI & Profile Indicators (Milestone 1)
   ========================================================================== */

.auth-wrapper {
  padding: 20px;
}

.auth-card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 32px 28px;
  width: 100%;
  max-width: 390px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.4);
}

.auth-header {
  text-align: center;
}

.auth-title {
  margin: 0 0 6px 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.5px;
}

.auth-subtitle {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.4;
  display: block;
}

/* Official Google Sign-In Button per Branding Guidelines */
.btn-google {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background-color: #ffffff;
  color: #3c4043;
  border: 1px solid #dadce0;
  border-radius: 9px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  cursor: pointer;
  width: 100%;
  height: 42px;
  transition: background-color 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

.btn-google:hover {
  background-color: #f8fafd;
  border-color: #dadce0;
  box-shadow: 0 1px 3px 0 rgba(60, 64, 67, 0.25), 0 1px 2px 0 rgba(60, 64, 67, 0.15);
}

.btn-google:active {
  background-color: #eeeeee;
}

.google-icon {
  flex-shrink: 0;
}

/* Divider */
.auth-divider {
  display: flex;
  align-items: center;
  text-align: center;
  color: var(--muted);
  font-size: 12px;
}

.auth-divider::before,
.auth-divider::after {
  content: "";
  flex: 1;
  border-bottom: 1px solid var(--line);
}

.auth-divider span {
  padding: 0 10px;
}

/* Tabs */
.auth-tabs {
  display: flex;
  background: var(--bg);
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
}

.auth-tab {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 13px;
  font-weight: 500;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.auth-tab:hover {
  color: var(--text);
}

.auth-tab.on {
  background: var(--panel2);
  color: var(--accent);
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}

/* Error Banner (#authErr) */
.auth-err {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(229, 72, 77, 0.14);
  border: 1px solid var(--danger);
  border-radius: 9px;
  padding: 10px 14px;
  color: #ff8282;
  font-size: 13px;
  line-height: 1.4;
  animation: fadeIn 0.2s ease-in-out;
}

.auth-err-icon {
  font-size: 14px;
  flex-shrink: 0;
}

/* Form Groups */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-input {
  background: #171514;
  border: 1px solid var(--line);
  border-radius: 9px;
  padding: 10px 12px;
  color: var(--text);
  font-size: 14px;
  transition: border-color 0.15s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent);
}

.form-hint {
  font-size: 11px;
  color: var(--muted);
  margin-top: 2px;
}

.btn-submit {
  margin-top: 6px;
  height: 42px;
  border-radius: 9px;
  font-size: 14px;
  font-weight: 600;
}

.auth-footer {
  text-align: center;
  font-size: 13px;
  color: var(--muted);
}

.auth-toggle-link {
  color: var(--accent);
  text-decoration: none;
  font-weight: 600;
  margin-left: 4px;
  cursor: pointer;
}

.auth-toggle-link:hover {
  text-decoration: underline;
}

/* User Profile Indicators */
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-profile-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--panel);
  border: 1px solid var(--line);
  padding: 4px 6px 4px 10px;
  border-radius: 999px;
}

.user-profile-info {
  display: flex;
  flex-direction: column;
  text-align: left;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  max-width: 130px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-email {
  font-size: 11px;
  color: var(--muted);
  max-width: 130px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-logout {
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  color: var(--muted);
  cursor: pointer;
}

.btn-logout:hover {
  border-color: var(--danger);
  color: var(--danger);
}

.user-avatar {
  border-radius: 50%;
  flex-shrink: 0;
}

.user-initials {
  background: var(--panel2);
  border: 1.5px solid var(--accent);
  color: var(--accent);
  font-weight: 700;
  text-align: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.editor-user-badge {
  display: flex;
  align-items: center;
  margin-left: 8px;
  cursor: default;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## 5. Verification Method

### 5.1 Verification Commands
Downstream implementers and quality assurance agents should verify this integration using:
1. **Server Execution**:
   ```powershell
   node server/server.js
   ```
2. **Automated Suite**:
   ```powershell
   node --test test/*.test.js
   ```

### 5.2 Manual Browser Verification Steps
1. **Unauthenticated Access**:
   - Navigate to `http://localhost:3000`.
   - Verify that `authView()` loads the tabbed card with "Iniciar sesión con Google", mode switcher tabs, and credential inputs.
2. **Mode Switching**:
   - Click "Crear cuenta": The Full Name field appears with helper hint, submit button updates to "Crear cuenta", and subtitle changes.
   - Click "Iniciar sesión": The Full Name field disappears, submit button becomes "Iniciar sesión".
3. **Client-Side Validation**:
   - On Register mode, submit with empty name: `#authErr` displays `"Por favor, ingresa tu nombre completo (mínimo 2 caracteres)."`.
   - Submit with invalid email (e.g. `test`): `#authErr` displays `"Por favor, ingresa un correo electrónico válido."`.
   - Submit with short password (e.g. `12345`): `#authErr` displays `"La contraseña debe tener al menos 6 caracteres."`.
   - Type any character into any input: `#authErr` clears immediately.
4. **Google Sign-In Trigger**:
   - Click "Iniciar sesión con Google": Triggers `location.href = '/api/auth/google'`, redirecting to Google OAuth or the local simulated Account Chooser, returning to dashboard with session active.
5. **Session & Profile Display**:
   - In Dashboard (`listView`): Profile chip in header displays user avatar (or initial badge), user name, and email.
   - Click "+ Nuevo mueble": In Editor (`editorView`), topbar shows compact circular initial badge or avatar.
   - Click "Salir": Session is deleted, `currentUser` cleared, and screen resets to `authView()`.

### 5.3 Invalidation Conditions
The frontend authentication implementation shall be considered non-compliant if:
- Registration mode does not request or validate the user's Full Name (`name`).
- The Google Sign-In button fails to conform to Google Branding Guidelines or lacks the official multi-colored SVG logo.
- Errors remain unstyled or fail to display in `#authErr`.
- Logged-in users have no visual profile indicator (name/avatar) in the dashboard header or editor topbar.

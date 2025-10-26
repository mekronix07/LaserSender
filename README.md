# Presentation Sender

## ⚠️ IMPORTANT: Update Firebase Configuration First!

### Quick Setup

1. **Update Firebase Config**
   - Open: `src/App.js`
   - Find line ~10: `const firebaseConfig = {`
   - Replace with YOUR Firebase config
   - Save file (Ctrl+S)

2. **Install & Run**
   ```bash
   npm install
   npm start
   ```

3. **Check Connection**
   - Top right should show: 🟢 Connected
   - If shows 🔴 Disconnected, check config

### Get Firebase Config

1. Go to: https://console.firebase.google.com/
2. Create project → Enable Realtime Database
3. Set rules: `.read: true, .write: true`
4. Project Settings → Your apps → Web → Copy config
5. Paste in `src/App.js` line 8-17

### See SETUP_INSTRUCTIONS.txt for detailed guide!

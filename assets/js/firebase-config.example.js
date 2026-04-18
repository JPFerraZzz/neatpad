// ============================================================================
// Configuração Firebase — MODELO (example)
// ----------------------------------------------------------------------------
// Este ficheiro é um MODELO público. NÃO contém credenciais reais.
//
// Como usar:
//   1. Copia este ficheiro para `assets/js/firebase-config.js`
//        cp assets/js/firebase-config.example.js assets/js/firebase-config.js
//   2. Preenche os valores reais do teu projeto em:
//        Firebase Console → Project Settings → Your apps → SDK setup and configuration
//   3. O ficheiro `assets/js/firebase-config.js` está no `.gitignore` — NUNCA
//      deve ser commitado. No servidor em produção é criado/atualizado à mão
//      (o CI/CD nunca o sobrescreve).
//
// Se vires uma credencial real neste ficheiro, isso é um bug — faz rotate
// imediatamente no Firebase Console e reporta.
// ============================================================================
const firebaseConfig = {
    apiKey:            "YOUR_FIREBASE_API_KEY",
    authDomain:        "your-project-id.firebaseapp.com",
    projectId:         "your-project-id",
    storageBucket:     "your-project-id.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId:             "YOUR_APP_ID"
};

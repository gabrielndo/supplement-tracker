# Configuração do Google Sign-In

## ⚠️ IMPORTANTE

O login com Google requer configuração adicional. Siga estes passos:

## 1. Obter Client IDs do Google

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Vá em **APIs & Services** > **Credentials**
4. Clique em **Create Credentials** > **OAuth 2.0 Client ID**
5. Configure a tela de consentimento OAuth (necessário apenas uma vez)

### Para Android:
1. Selecione **Android** como tipo de aplicativo
2. Nome do pacote: `com.gabrielndo.supplement_tracker` (ou o que está no app.json)
3. Obtenha a SHA-1 do certificado:
   ```bash
   # Debug (desenvolvimento)
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   
   # Copie a SHA-1 e cole no campo correspondente
   ```

### Para iOS:
1. Selecione **iOS** como tipo de aplicativo
2. Bundle ID: `com.gabrielndo.supplement-tracker` (ou o que está no app.json)

### Para Web (necessário para Expo Go):
1. Selecione **Web application** como tipo
2. Authorized redirect URIs: adicione `https://auth.expo.io/@seu-username/supplement-tracker`

## 2. Configurar no WelcomeScreen.js

Abra `src/screens/WelcomeScreen.js` e substitua os placeholders pelos IDs reais:

```javascript
const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: 'SEU_ANDROID_CLIENT_ID.apps.googleusercontent.com',
    iosClientId: 'SEU_IOS_CLIENT_ID.apps.googleusercontent.com',
    webClientId: 'SEU_WEB_CLIENT_ID.apps.googleusercontent.com',
});
```

## 3. Atualizar app.json

Adicione o esquema de URL no `app.json`:

```json
{
  "expo": {
    ...
    "scheme": "supplement-tracker"
  }
}
```

## 🚀 Testando Sem Google (Desenvolvimento)

Você pode usar a opção **"Criar Conta Pessoal"** que funciona imediatamente sem configuração!

1. Clique em "Criar Conta Pessoal"
2. Digite seu nome
3. Complete o onboarding
4. Pronto!

## 📝 Notas

- O login manual funciona 100% offline
- O Google Sign-In requer internet
- No Expo Go, use o Web Client ID
- Em builds standalone, use Android/iOS Client IDs

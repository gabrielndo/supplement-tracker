# Supplement Tracker (MeusSuple)

Um app simples e prático, para ajudar a mapear e criar lembretes de suplementos e beber água. Feito em React Native usando Expo.

## Interface

*   **Login rápido:** Auth com Google ou email/senha com integração na Firebase.
*   **Gestão de Suplementos:** Cadastra o que você toma, os horários, a IA irá sugerir de acordo com seu Perfil. O app te avisa na hora certa com notificações locais e monitorar o acompanhamento do progresso de streak, similar ao duolingo.
*   **Água interativa:** Tem um copinho d'água na tela que enche de verdade conforme você bebe (usa até o giroscópio do celular pra dar um efeito legal). 
*   **Offline First:** Utilização em cache local (`AsyncStorage`) e sobe pro Firestore em background. Assim a interface carrega instantaneamente.
*   **Dashboard e Streaks:** Dá pra ver como tá a consistência nos últimos dias, acompanhar as ofensivas e bater metas.
*   **Visual de responsa:** Interface toda baseada no estilo "Liquid Glass" (vidro fosco, gradientes e feedback tátil quando clica nas coisas).

## Stack 

*   **Mobile:** React Native + Expo (Managed Workflow)
*   **Backend as a Service:** Firebase (Auth e Firestore)
*   **Local Storage:** AsyncStorage
*   **UI/Animações:** react-native-reanimated, react-native-svg, blur, haptics.

## Rodando o projeto

Se quiser clonar e rodar na sua máquina, segue o passo a passo:

1.  Clona aí:
    ```bash
    git clone https://github.com/gabrielndo/supplement-tracker.git
    cd supplement-tracker
    ```

2.  Instala os pacotes:
    ```bash
    npm install
    ```

3.  **Importante:** Pra rodar liso, você vai precisar do seu próprio projeto no Firebase. Confere se o `google-services.json` tá na raiz e se as chaves em `src/services/firebase.js` tão certinhas com as do seu projeto.

4.  Sobe o bundler:
    ```bash
    npx expo start -c
    ```
5. Só abrir no app do Expo Go no celular ou rodar no emulador.

## Build (Android)

Como o app usa Google Sign-In nativo, pra gerar o .apk pra valer você pode usar o EAS:

```bash
npm install -g eas-cli
eas login
eas build -p android --profile production
```

## Licença
Projeto de estudo.
